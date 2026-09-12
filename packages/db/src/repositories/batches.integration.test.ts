import type { TenantCtx } from '@billwise/shared';
import { config as loadEnv } from 'dotenv';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../client';
import {
  createBatch,
  getExpiryCounts,
  listBatches,
  listExpiringBatches,
  pickBatchFEFO,
  writeOffExpiredBatch,
} from './batches';
import { cancelInvoice, createDraft, issueInvoice } from './invoices';
import { createProduct } from './products';
import { recordSalesReturn } from './returns';
import { adjustStock, findBatchDiscrepancies, findStockDiscrepancies } from './stock';
import { formatNumberForTest } from './__test-helpers';

loadEnv({ path: '../../.env', quiet: true });

/**
 * Batch tracking, against a real database.
 *
 * The invariant these exist to defend:
 *
 *     sum(product_batches.quantity) === products.current_stock
 *
 * It is enforced by SQL arithmetic inside `recordMovement`, so a mock would
 * prove nothing. And it has to survive the operations that already existed
 * before batches did — issuing a bill, cancelling one, taking a return — which
 * is precisely where a bolted-on feature breaks.
 */

const HAS_DB = Boolean(process.env['DATABASE_URL']);
const suite = HAS_DB ? describe : describe.skip;

type Tenant = { ctx: TenantCtx; businessId: string; userId: string };

async function makeTenant(label: string): Promise<Tenant> {
  const db = getDb();
  const stamp = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [user] = await db.execute<{ id: string }>(sql`
    insert into users (email, name, password_hash)
    values (${`${stamp}@invalid.test`}, ${label}, 'x') returning id
  `);
  const [biz] = await db.execute<{ id: string }>(sql`
    insert into businesses (owner_user_id, name, slug, state_code, status, trial_ends_at, type)
    values (${user!.id}::uuid, ${label}, ${stamp}, '09', 'trial', now() + interval '10 days',
            'medical')
    returning id
  `);
  await db.execute(sql`insert into business_settings (business_id) values (${biz!.id}::uuid)`);
  return {
    businessId: biz!.id,
    userId: user!.id,
    ctx: { businessId: biz!.id, userId: user!.id, role: 'owner' },
  };
}

async function dropTenant(t: Tenant) {
  const db = getDb();
  // `sales_return_lines.business_id` has no ON DELETE CASCADE, unlike most of
  // the schema, so deleting the business fails while a return exists. Cleared
  // by hand here rather than changing a production foreign key to suit a test.
  await db.execute(sql`delete from sales_return_lines where business_id = ${t.businessId}::uuid`);
  await db.execute(sql`delete from sales_returns where business_id = ${t.businessId}::uuid`);
  await db.execute(sql`delete from businesses where id = ${t.businessId}::uuid`);
  await db.execute(sql`delete from users where id = ${t.userId}::uuid`);
}

/** A date `days` from today, as the database reckons today in IST. */
function dayOffset(days: number): string {
  const d = new Date(Date.now() + 5.5 * 3_600_000 + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

let pharmacy: Tenant;
let other: Tenant;

beforeAll(async () => {
  if (!HAS_DB) return;
  pharmacy = await makeTenant('batchtest');
  other = await makeTenant('batchother');
});

afterAll(async () => {
  if (!HAS_DB) return;
  await dropTenant(pharmacy);
  await dropTenant(other);
  await closeDb();
});

/** A medicine with three lots: expired, expiring soon, and long-dated. */
async function medicineWithBatches(ctx: TenantCtx) {
  const product = await createProduct(ctx, {
    name: `Paracetamol ${Math.random().toString(36).slice(2, 7)}`,
    salePrice: '30.00',
    trackInventory: true,
  });

  const old = await createBatch(ctx, {
    productId: product!.id,
    batchNo: 'OLD-1',
    expiryDate: dayOffset(-10),
    mrp: '28.00',
    purchasePrice: '20.00',
  });
  const soon = await createBatch(ctx, {
    productId: product!.id,
    batchNo: 'SOON-1',
    expiryDate: dayOffset(30),
    mrp: '30.00',
    purchasePrice: '22.00',
  });
  const later = await createBatch(ctx, {
    productId: product!.id,
    batchNo: 'LATER-1',
    expiryDate: dayOffset(400),
    mrp: '32.00',
    purchasePrice: '24.00',
  });

  // Stock only ever arrives through the ledger, never by setting a quantity.
  await adjustStock(ctx, {
    productId: product!.id,
    batchId: old.id,
    qtyChange: '10',
    reason: 'purchase',
  });
  await adjustStock(ctx, {
    productId: product!.id,
    batchId: soon.id,
    qtyChange: '20',
    reason: 'purchase',
  });
  await adjustStock(ctx, {
    productId: product!.id,
    batchId: later.id,
    qtyChange: '30',
    reason: 'purchase',
  });

  return { product: product!, old, soon, later };
}

async function stockOf(ctx: TenantCtx, productId: string): Promise<string> {
  const [row] = await getDb().execute<{ s: string }>(sql`
    select current_stock::text as s from products
    where id = ${productId}::uuid and business_id = ${ctx.businessId}::uuid
  `);
  return row!.s;
}

suite('product batches', () => {
  it('keeps the rollup equal to the sum of its batches', async () => {
    const { product } = await medicineWithBatches(pharmacy.ctx);

    expect(Number(await stockOf(pharmacy.ctx, product.id))).toBe(60);
    expect(await findBatchDiscrepancies(pharmacy.ctx)).toEqual([]);
    expect(await findStockDiscrepancies(pharmacy.ctx)).toEqual([]);
  });

  it('picks the earliest unexpired batch, never an expired one', async () => {
    const { product, soon } = await medicineWithBatches(pharmacy.ctx);

    // OLD-1 expires soonest of all, but it is already past its date. FEFO must
    // step over it rather than sell expired medicine by default.
    const picked = await pickBatchFEFO(pharmacy.ctx, product.id);
    expect(picked?.id).toBe(soon.id);
    expect(picked?.batchNo).toBe('SOON-1');
  });

  it('survives a bill being issued and then cancelled', async () => {
    const { product, later } = await medicineWithBatches(pharmacy.ctx);
    const before = await stockOf(pharmacy.ctx, product.id);

    const draft = await createDraft(pharmacy.ctx, {
      kind: 'tax_invoice',
      fy: '2026-27',
      invoiceDate: dayOffset(0),
      partyName: 'Walk-in',
      supplierStateCode: '09',
      placeOfSupply: '09',
      isInterstate: false,
      taxMode: 'exclusive',
      subtotal: '150.00',
      discountTotal: '0',
      cgstTotal: '0',
      sgstTotal: '0',
      igstTotal: '0',
      cessTotal: '0',
      otherCharges: '0',
      roundOff: '0',
      grandTotal: '150.00',
      lines: [
        {
          productId: product.id,
          batchId: later.id,
          batchNo: 'LATER-1',
          name: product.name,
          qty: '5',
          rate: '30.00',
          taxableValue: '150.00',
          taxRate: '0',
          cgstAmount: '0',
          sgstAmount: '0',
          igstAmount: '0',
          cessAmount: '0',
          lineTotal: '150.00',
        },
      ],
    });

    await issueInvoice(pharmacy.ctx, {
      invoiceId: draft.id,
      formatNumber: formatNumberForTest,
    });

    expect(Number(await stockOf(pharmacy.ctx, product.id))).toBe(Number(before) - 5);
    const afterSale = await listBatches(pharmacy.ctx, product.id);
    expect(Number(afterSale.find((b) => b.id === later.id)?.quantity)).toBe(25);
    expect(await findBatchDiscrepancies(pharmacy.ctx)).toEqual([]);

    // Cancelling must put the stock back into the batch it came out of, not
    // into some undifferentiated pile.
    await cancelInvoice(pharmacy.ctx, { invoiceId: draft.id, reason: 'test' });

    expect(Number(await stockOf(pharmacy.ctx, product.id))).toBe(Number(before));
    const afterCancel = await listBatches(pharmacy.ctx, product.id);
    expect(Number(afterCancel.find((b) => b.id === later.id)?.quantity)).toBe(30);
    expect(await findBatchDiscrepancies(pharmacy.ctx)).toEqual([]);
  });

  it('puts a sales return back into its batch', async () => {
    const { product, later } = await medicineWithBatches(pharmacy.ctx);
    const before = await stockOf(pharmacy.ctx, product.id);

    await recordSalesReturn(pharmacy.ctx, {
      invoiceId: null,
      partyId: null,
      returnDate: dayOffset(0),
      lines: [
        {
          productId: product.id,
          batchId: later.id,
          invoiceLineId: null,
          name: product.name,
          qty: '3',
          rate: '30.00',
          amount: '90.00',
          hsnCode: null,
          taxRate: '0',
          taxableValue: '90.00',
          cgstAmount: '0',
          sgstAmount: '0',
          igstAmount: '0',
          cessAmount: '0',
          restock: true,
        },
      ],
    });

    expect(Number(await stockOf(pharmacy.ctx, product.id))).toBe(Number(before) + 3);
    expect(await findBatchDiscrepancies(pharmacy.ctx)).toEqual([]);
  });

  it('writes off an expired lot through the ledger', async () => {
    const { product, old } = await medicineWithBatches(pharmacy.ctx);
    const before = await stockOf(pharmacy.ctx, product.id);

    const result = await writeOffExpiredBatch(pharmacy.ctx, old.id);
    expect(Number(result.quantity)).toBe(10);

    // Gone from the shelf and gone from the rollup, with a movement explaining
    // why — not a row quietly set to zero.
    expect(Number(await stockOf(pharmacy.ctx, product.id))).toBe(Number(before) - 10);
    expect(await findBatchDiscrepancies(pharmacy.ctx)).toEqual([]);
    expect(await findStockDiscrepancies(pharmacy.ctx)).toEqual([]);

    const [movement] = await getDb().execute<{ reason: string }>(sql`
      select reason from stock_movements
      where business_id = ${pharmacy.businessId}::uuid and batch_id = ${old.id}::uuid
      order by created_at desc limit 1
    `);
    expect(movement!.reason).toBe('expired');
  });

  it('separates expiring from expired', async () => {
    const fresh = await makeTenant('expiry');
    try {
      await medicineWithBatches(fresh.ctx);

      const soon = await listExpiringBatches(fresh.ctx);
      expect(soon.map((b) => b.batchNo)).toEqual(['SOON-1']);

      const gone = await listExpiringBatches(fresh.ctx, { expired: true });
      expect(gone.map((b) => b.batchNo)).toEqual(['OLD-1']);

      const counts = await getExpiryCounts(fresh.ctx);
      expect(counts.expiringSoon).toBe(1);
      expect(counts.expired).toBe(1);
      // 10 units that cost 20 each.
      expect(Number(counts.expiredValue)).toBe(200);
    } finally {
      await dropTenant(fresh);
    }
  });

  it('refuses a batch belonging to another business', async () => {
    const mine = await medicineWithBatches(pharmacy.ctx);
    const theirs = await medicineWithBatches(other.ctx);

    // The rollup would still add up if this were allowed, so nothing
    // downstream would ever notice the stock had left the wrong shelf.
    await expect(
      adjustStock(pharmacy.ctx, {
        productId: mine.product.id,
        batchId: theirs.later.id,
        qtyChange: '-1',
        reason: 'sale',
      }),
    ).rejects.toThrow(/does not belong/);
  });

  it('adds to an existing lot rather than opening a second one', async () => {
    const { product } = await medicineWithBatches(pharmacy.ctx);

    const again = await createBatch(pharmacy.ctx, {
      productId: product.id,
      batchNo: 'SOON-1',
      expiryDate: dayOffset(30),
      mrp: '31.00',
    });
    expect(again.created).toBe(false);

    const batches = await listBatches(pharmacy.ctx, product.id, { includeEmpty: true });
    expect(batches.filter((b) => b.batchNo === 'SOON-1')).toHaveLength(1);
    // A repeat delivery carrying a corrected MRP updates it.
    expect(Number(batches.find((b) => b.batchNo === 'SOON-1')?.mrp)).toBe(31);
  });
});

import type { TenantCtx } from '@bahikhata/shared';
import { config as loadEnv } from 'dotenv';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../client';
import { createParty, getParty, listParties, listPartyBalances, updateParty } from './parties';
import {
  createProduct,
  deactivateProduct,
  getProduct,
  listProducts,
  updateProduct,
} from './products';
import { createCategory, createUnit, deleteCategory, listCategories, listUnits } from './masters';
import { adjustStock, findStockDiscrepancies, listMovements } from './stock';
import { createDraft, getInvoice, issueInvoice, listInvoices, cancelInvoice } from './invoices';
import { formatNumberForTest } from './__test-helpers';

loadEnv({ path: '../../.env', quiet: true });

/**
 * Build spec §8.3 — non-negotiable:
 *
 *   "Tenant isolation — a user from business A cannot read or mutate any row
 *    belonging to business B, via any route."
 *
 * And §8.4:
 *
 *   "Stock reconciliation — sum(stock_movements.qty_change) ===
 *    products.current_stock for every product after a randomised sequence of
 *    operations."
 *
 * Both need a real database: isolation is enforced by WHERE clauses and the
 * stock rollup by SQL arithmetic, so a mock would prove nothing.
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
    insert into businesses (owner_user_id, name, slug, state_code, status, trial_ends_at)
    values (${user!.id}::uuid, ${label}, ${stamp}, '09', 'trial', now() + interval '10 days')
    returning id
  `);
  await db.execute(sql`
    insert into business_settings (business_id) values (${biz!.id}::uuid)
  `);
  return {
    businessId: biz!.id,
    userId: user!.id,
    ctx: { businessId: biz!.id, userId: user!.id, role: 'owner' },
  };
}

async function dropTenant(t: Tenant) {
  const db = getDb();
  await db.execute(sql`delete from businesses where id = ${t.businessId}::uuid`);
  await db.execute(sql`delete from users where id = ${t.userId}::uuid`);
}

let alpha: Tenant;
let beta: Tenant;

suite('tenant isolation and stock reconciliation (integration)', () => {
  beforeAll(async () => {
    alpha = await makeTenant('Alpha Traders');
    beta = await makeTenant('Beta Stores');
  }, 60_000);

  afterAll(async () => {
    if (alpha) await dropTenant(alpha);
    if (beta) await dropTenant(beta);
    await closeDb();
  }, 60_000);

  // -------------------------------------------------------- isolation ----

  it('does not show one business the other\'s products', async () => {
    await createProduct(alpha.ctx, { name: 'Alpha Widget', salePrice: '100' });
    await createProduct(beta.ctx, { name: 'Beta Widget', salePrice: '200' });

    const alphaList = await listProducts(alpha.ctx);
    const betaList = await listProducts(beta.ctx);

    expect(alphaList.map((p) => p.name)).toEqual(['Alpha Widget']);
    expect(betaList.map((p) => p.name)).toEqual(['Beta Widget']);
  }, 60_000);

  it('returns undefined when reading another business\'s product by its real id', async () => {
    // The id is genuine and guessable in principle — isolation must come from
    // the WHERE clause, not from ids being hard to find.
    const [betaProduct] = await listProducts(beta.ctx);
    const stolen = await getProduct(alpha.ctx, betaProduct!.id);
    expect(stolen).toBeUndefined();
  }, 60_000);

  it('silently affects nothing when updating another business\'s product', async () => {
    const [betaProduct] = await listProducts(beta.ctx);
    await updateProduct(alpha.ctx, betaProduct!.id, { name: 'HIJACKED', salePrice: '1' });

    const unchanged = await getProduct(beta.ctx, betaProduct!.id);
    expect(unchanged?.name).toBe('Beta Widget');
    expect(unchanged?.salePrice).toBe('200.00');
  }, 60_000);

  it('cannot deactivate another business\'s product', async () => {
    const [betaProduct] = await listProducts(beta.ctx);
    await deactivateProduct(alpha.ctx, betaProduct!.id);
    const stillThere = await getProduct(beta.ctx, betaProduct!.id);
    expect(stillThere?.isActive).toBe(true);
  }, 60_000);

  it('isolates parties, and their balances', async () => {
    await createParty(alpha.ctx, { name: 'Alpha Customer', openingBalance: '500' });
    await createParty(beta.ctx, { name: 'Beta Customer', openingBalance: '900' });

    expect((await listParties(alpha.ctx)).map((p) => p.name)).toEqual(['Alpha Customer']);

    const balances = await listPartyBalances(alpha.ctx);
    expect(balances).toHaveLength(1);
    expect(balances[0]!.outstanding).toBe('500.00');
  }, 60_000);

  it('cannot read or mutate another business\'s party', async () => {
    const [betaParty] = await listParties(beta.ctx);
    expect(await getParty(alpha.ctx, betaParty!.id)).toBeUndefined();

    await updateParty(alpha.ctx, betaParty!.id, { name: 'HIJACKED' });
    expect((await getParty(beta.ctx, betaParty!.id))?.name).toBe('Beta Customer');
  }, 60_000);

  it('isolates masters, including deletes', async () => {
    await createCategory(alpha.ctx, 'Alpha Category');
    const betaCategory = await createCategory(beta.ctx, 'Beta Category');
    await createUnit(alpha.ctx, { name: 'Alpha Unit', shortName: 'AU' });

    await deleteCategory(alpha.ctx, betaCategory!.id);
    expect((await listCategories(beta.ctx)).map((c) => c.name)).toEqual(['Beta Category']);

    // Seeded units are per business; Alpha's extra one must not appear for Beta.
    expect((await listUnits(beta.ctx)).some((u) => u.shortName === 'AU')).toBe(false);
  }, 60_000);

  it('isolates invoices, and refuses to cancel across tenants', async () => {
    const [alphaProduct] = await listProducts(alpha.ctx);
    const draft = await createDraft(beta.ctx, {
      kind: 'cash_memo',
      fy: '2099-00',
      invoiceDate: '2099-06-01',
      partyName: 'Walk-in',
      supplierStateCode: '09',
      placeOfSupply: '09',
      isInterstate: false,
      taxMode: 'exclusive',
      subtotal: '100.00',
      discountTotal: '0.00',
      cgstTotal: '0.00',
      sgstTotal: '0.00',
      igstTotal: '0.00',
      cessTotal: '0.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '100.00',
      lines: [
        {
          name: 'Something',
          qty: '1.000',
          rate: '100.00',
          taxableValue: '100.00',
          taxRate: '0',
          cgstAmount: '0.00',
          sgstAmount: '0.00',
          igstAmount: '0.00',
          cessAmount: '0.00',
          lineTotal: '100.00',
        },
      ],
    });

    await issueInvoice(beta.ctx, { invoiceId: draft.id, formatNumber: formatNumberForTest });

    expect(await getInvoice(alpha.ctx, draft.id)).toBeUndefined();
    expect(await listInvoices(alpha.ctx)).toHaveLength(0);
    await expect(
      cancelInvoice(alpha.ctx, { invoiceId: draft.id, reason: 'not mine' }),
    ).rejects.toThrow();

    // Alpha's own product is untouched by any of that.
    expect((await getProduct(alpha.ctx, alphaProduct!.id))?.currentStock).toBe('0.000');
  }, 60_000);

  it('rejects a stock movement against another business\'s product', async () => {
    const [betaProduct] = await listProducts(beta.ctx);
    await expect(
      adjustStock(alpha.ctx, {
        productId: betaProduct!.id,
        qtyChange: '999',
        reason: 'adjustment',
      }),
    ).rejects.toThrow(/does not belong to this business/);
  }, 60_000);

  // --------------------------------------------- stock reconciliation ----

  it('keeps current_stock equal to the sum of its movements after randomised operations', async () => {
    const ctx = alpha.ctx;

    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await createProduct(ctx, {
        name: `Recon Product ${i}`,
        salePrice: '50',
        openingStock: String((i * 7) % 13),
      });
      ids.push(p!.id);
    }

    // Deterministic pseudo-random, so a failure is reproducible.
    let seed = 20260828;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < 120; i++) {
      const productId = ids[Math.floor(rand() * ids.length)]!;
      const magnitude = (Math.floor(rand() * 900) / 100).toFixed(3);
      const inward = rand() > 0.45;
      await adjustStock(ctx, {
        productId,
        qtyChange: inward ? magnitude : `-${magnitude}`,
        reason: inward ? 'stock_in' : 'stock_out',
      });
    }

    const drift = await findStockDiscrepancies(ctx);
    expect(drift).toEqual([]);

    // And prove the ledger actually has entries, so an empty result above
    // cannot be passing vacuously.
    const movements = await listMovements(ctx, ids[0]!, 500);
    expect(movements.length).toBeGreaterThan(0);
  }, 180_000);

  it('reconciles after issuing and cancelling an invoice', async () => {
    const ctx = alpha.ctx;
    const product = await createProduct(ctx, {
      name: 'Cancel Recon',
      salePrice: '100',
      openingStock: '20',
    });

    const draft = await createDraft(ctx, {
      kind: 'tax_invoice',
      fy: '2099-00',
      invoiceDate: '2099-06-01',
      partyName: 'Walk-in',
      supplierStateCode: '09',
      placeOfSupply: '09',
      isInterstate: false,
      taxMode: 'exclusive',
      subtotal: '300.00',
      discountTotal: '0.00',
      cgstTotal: '27.00',
      sgstTotal: '27.00',
      igstTotal: '0.00',
      cessTotal: '0.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '354.00',
      lines: [
        {
          productId: product!.id,
          name: 'Cancel Recon',
          qty: '3.000',
          rate: '100.00',
          taxableValue: '300.00',
          taxRate: '18',
          cgstAmount: '27.00',
          sgstAmount: '27.00',
          igstAmount: '0.00',
          cessAmount: '0.00',
          lineTotal: '354.00',
        },
      ],
    });

    const issued = await issueInvoice(ctx, {
      invoiceId: draft.id,
      formatNumber: formatNumberForTest,
    });
    expect((await getProduct(ctx, product!.id))?.currentStock).toBe('17.000');

    await cancelInvoice(ctx, { invoiceId: draft.id, reason: 'customer returned it' });

    // Stock restored...
    expect((await getProduct(ctx, product!.id))?.currentStock).toBe('20.000');
    // ...by reversal, not deletion. The ledger still records both directions.
    const movements = await listMovements(ctx, product!.id, 50);
    expect(movements.filter((m) => m.reason === 'sale')).toHaveLength(1);
    expect(movements.filter((m) => m.reason === 'sale_cancelled')).toHaveLength(1);

    // The invoice KEEPS its number (spec §5.1).
    const after = await getInvoice(ctx, draft.id);
    expect(after?.status).toBe('cancelled');
    expect(after?.invoiceNo).toBe(issued.invoiceNo);

    expect(await findStockDiscrepancies(ctx)).toEqual([]);
  }, 120_000);
});

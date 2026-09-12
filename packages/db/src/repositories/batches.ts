import { EXPIRY_WARNING_DAYS, type TenantCtx } from '@billwise/shared';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, type Executor } from '../client';
import { productBatches } from '../schema/index';
import { recordMovement } from './stock';

/**
 * Batches: one lot of one medicine, with an expiry date.
 *
 * Only a business with `features.batchTracking` ever reaches this file. For
 * everyone else these tables are empty and every query here returns nothing —
 * which is why none of it needed a flag check of its own. The flag lives at the
 * screens; the data layer just answers honestly.
 *
 * ## The rule
 *
 * Quantity is NEVER written here. It moves through `recordMovement` in
 * stock.ts, the same as `products.current_stock`, so the two can never drift.
 * The functions below create batches, describe them and read them; the one that
 * changes a quantity — `writeOffExpired` — does it by recording a movement.
 */

export type BatchRow = {
  id: string;
  productId: string;
  productName: string;
  batchNo: string;
  expiryDate: string | null;
  mfgDate: string | null;
  mrp: string | null;
  purchasePrice: string | null;
  quantity: string;
  isActive: boolean;
  /** Days until expiry. Negative when already past it. Null with no date. */
  daysToExpiry: number | null;
  note: string | null;
};

/**
 * The columns every batch read returns.
 *
 * Shared so the list, the picker and the expiry report cannot drift — the same
 * reason `APPLICATION_SELECT` exists in applications.ts.
 */
const BATCH_SELECT = sql`
  select b.id::text          as "id",
         b.product_id::text  as "productId",
         p.name              as "productName",
         b.batch_no          as "batchNo",
         b.expiry_date::text as "expiryDate",
         b.mfg_date::text    as "mfgDate",
         b.mrp::text         as "mrp",
         b.purchase_price::text as "purchasePrice",
         b.quantity::text    as "quantity",
         b.is_active         as "isActive",
         (b.expiry_date - (now() at time zone 'Asia/Kolkata')::date) as "daysToExpiry",
         b.note              as "note"
  from product_batches b
  join products p on p.id = b.product_id
`;

/**
 * Every batch of one medicine.
 *
 * Ordered by expiry, soonest first, because that is the order they should be
 * sold in and therefore the order somebody wants to read them in.
 */
export async function listBatches(
  ctx: TenantCtx,
  productId: string,
  opts: { includeEmpty?: boolean } = {},
): Promise<BatchRow[]> {
  const rows = await getDb().execute<BatchRow>(sql`
    ${BATCH_SELECT}
    where b.business_id = ${ctx.businessId}::uuid
      and b.product_id = ${productId}::uuid
      ${opts.includeEmpty ? sql`` : sql`and b.quantity > 0`}
    order by b.expiry_date asc nulls last, b.batch_no
  `);
  return [...rows];
}

export type BatchInput = {
  productId: string;
  batchNo: string;
  expiryDate?: string | null;
  mfgDate?: string | null;
  mrp?: string | null;
  purchasePrice?: string | null;
  note?: string | null;
};

/**
 * Create a batch, or return the one that already exists.
 *
 * Receiving the same lot a second time must add to the batch on file rather
 * than open a second row with the same number — otherwise the shelf holds one
 * lot and the screen shows two, and FEFO starts picking between duplicates.
 * The unique index enforces it; this is the friendly path to the same answer.
 *
 * Stock is NOT set here. A new batch starts at zero and is filled by a movement,
 * because that is the only way the ledger and the rollup stay in step.
 */
export async function createBatch(
  ctx: TenantCtx,
  input: BatchInput,
  tx: Executor = getDb(),
): Promise<{ id: string; created: boolean }> {
  const batchNo = input.batchNo.trim();
  if (!batchNo) throw new Error('A batch needs a batch number.');

  const [existing] = await tx
    .select({ id: productBatches.id })
    .from(productBatches)
    .where(
      and(
        eq(productBatches.businessId, ctx.businessId),
        eq(productBatches.productId, input.productId),
        eq(productBatches.batchNo, batchNo),
      ),
    )
    .limit(1);

  if (existing) {
    // A repeat delivery often carries a corrected MRP or a cost that has moved.
    // Fill in anything that was blank and refresh the money; never overwrite an
    // expiry that is already recorded with a null.
    await tx
      .update(productBatches)
      .set({
        ...(input.expiryDate ? { expiryDate: input.expiryDate } : {}),
        ...(input.mfgDate ? { mfgDate: input.mfgDate } : {}),
        ...(input.mrp ? { mrp: input.mrp } : {}),
        ...(input.purchasePrice ? { purchasePrice: input.purchasePrice } : {}),
      })
      .where(eq(productBatches.id, existing.id));
    return { id: existing.id, created: false };
  }

  const [row] = await tx
    .insert(productBatches)
    .values({
      businessId: ctx.businessId,
      productId: input.productId,
      batchNo,
      expiryDate: input.expiryDate ?? null,
      mfgDate: input.mfgDate ?? null,
      mrp: input.mrp ?? null,
      purchasePrice: input.purchasePrice ?? null,
      note: input.note ?? null,
      quantity: '0',
    })
    .returning({ id: productBatches.id });

  if (!row) throw new Error('Could not create that batch.');
  return { id: row.id, created: true };
}

export type BatchPatch = Partial<Omit<BatchInput, 'productId' | 'batchNo'>>;

/**
 * Correct a batch's details.
 *
 * Quantity is deliberately absent from `BatchPatch`. Stock only ever moves
 * through the ledger — an owner who needs to correct a count uses stock
 * adjustment, which records why.
 */
export async function updateBatch(
  ctx: TenantCtx,
  batchId: string,
  patch: BatchPatch,
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (patch.expiryDate !== undefined) values['expiryDate'] = patch.expiryDate || null;
  if (patch.mfgDate !== undefined) values['mfgDate'] = patch.mfgDate || null;
  if (patch.mrp !== undefined) values['mrp'] = patch.mrp || null;
  if (patch.purchasePrice !== undefined) values['purchasePrice'] = patch.purchasePrice || null;
  if (patch.note !== undefined) values['note'] = patch.note || null;
  if (Object.keys(values).length === 0) return;

  await getDb()
    .update(productBatches)
    .set(values)
    .where(
      and(eq(productBatches.id, batchId), eq(productBatches.businessId, ctx.businessId)),
    );
}

/**
 * Which batch to sell from: first expiry, first out.
 *
 * FEFO, not FIFO. A pharmacy's loss is not the money tied up in old stock, it
 * is the stock that reaches its expiry date unsold — so the right lot to reach
 * for is the one that dies soonest, regardless of when it arrived.
 *
 * Already-expired batches are skipped. Selling expired medicine is not a
 * rounding error to be defaulted into; if that is all there is, the counter is
 * told there is nothing sellable and has to deal with it deliberately.
 *
 * Returns null when no usable lot remains, which the caller should treat as
 * "out of stock" rather than falling back to an untracked sale.
 */
export async function pickBatchFEFO(
  ctx: TenantCtx,
  productId: string,
  tx: Executor = getDb(),
): Promise<BatchRow | undefined> {
  const rows = await tx.execute<BatchRow>(sql`
    ${BATCH_SELECT}
    where b.business_id = ${ctx.businessId}::uuid
      and b.product_id = ${productId}::uuid
      and b.quantity > 0
      and (b.expiry_date is null
           or b.expiry_date >= (now() at time zone 'Asia/Kolkata')::date)
    order by b.expiry_date asc nulls last, b.created_at asc
    limit 1
  `);
  return rows[0];
}

export type ExpiryFilter = {
  /** Days ahead to look. Defaults to EXPIRY_WARNING_DAYS. */
  withinDays?: number;
  /** Past the date rather than approaching it. */
  expired?: boolean;
  limit?: number;
};

/**
 * What is about to expire, or already has.
 *
 * Soonest first either way — for the warning list that is what to shift next,
 * and for the expired list that is what has been sitting there longest.
 *
 * Only batches with stock left. A lot that sold out in January is not a
 * problem in March, and listing it would bury the ones that are.
 */
export async function listExpiringBatches(
  ctx: TenantCtx,
  filters: ExpiryFilter = {},
): Promise<BatchRow[]> {
  const withinDays = filters.withinDays ?? EXPIRY_WARNING_DAYS;

  const window = filters.expired
    ? sql`b.expiry_date < (now() at time zone 'Asia/Kolkata')::date`
    : sql`b.expiry_date >= (now() at time zone 'Asia/Kolkata')::date
          and b.expiry_date <= (now() at time zone 'Asia/Kolkata')::date
                               + ${withinDays}::int`;

  const rows = await getDb().execute<BatchRow>(sql`
    ${BATCH_SELECT}
    where b.business_id = ${ctx.businessId}::uuid
      and b.quantity > 0
      and b.expiry_date is not null
      and ${window}
    order by b.expiry_date asc
    limit ${filters.limit ?? 200}
  `);
  return [...rows];
}

export type ExpiryCounts = {
  expiringSoon: number;
  expired: number;
  /** What the expired stock cost, at the price this lot was bought for. */
  expiredValue: string;
};

/** The two numbers the dashboard shows, in one round trip. */
export async function getExpiryCounts(ctx: TenantCtx): Promise<ExpiryCounts> {
  const [row] = await getDb().execute<{
    expiring_soon: number;
    expired: number;
    expired_value: string;
  }>(sql`
    with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
    select
      count(*) filter (
        where expiry_date >= (select d from today)
          and expiry_date <= (select d from today) + ${EXPIRY_WARNING_DAYS}::int)::int
        as expiring_soon,
      count(*) filter (where expiry_date < (select d from today))::int as expired,
      coalesce(sum(
        case when expiry_date < (select d from today)
             then quantity * coalesce(purchase_price, 0) else 0 end
      ), 0)::numeric(12,2)::text as expired_value
    from product_batches
    where business_id = ${ctx.businessId}::uuid
      and quantity > 0
      and expiry_date is not null
  `);

  return {
    expiringSoon: row?.expiring_soon ?? 0,
    expired: row?.expired ?? 0,
    expiredValue: row?.expired_value ?? '0.00',
  };
}

/**
 * Take an expired lot off the shelf.
 *
 * Written off through the ledger with reason `expired`, not by zeroing the row.
 * Two reasons: the rollup stays correct without anybody remembering to adjust
 * it, and "what did expiry cost me this year" becomes a question with an
 * answer — which is the whole reason a chemist wants this tracked.
 *
 * Returns the quantity removed, so the caller can say so rather than guess.
 */
export async function writeOffExpiredBatch(
  ctx: TenantCtx,
  batchId: string,
  note?: string,
): Promise<{ productId: string; quantity: string }> {
  return getDb().transaction(async (tx) => {
    const [batch] = await tx
      .select({
        id: productBatches.id,
        productId: productBatches.productId,
        batchNo: productBatches.batchNo,
        quantity: productBatches.quantity,
      })
      .from(productBatches)
      .where(
        and(eq(productBatches.id, batchId), eq(productBatches.businessId, ctx.businessId)),
      )
      .for('update')
      .limit(1);

    if (!batch) throw new Error('That batch no longer exists.');
    if (Number(batch.quantity) <= 0) {
      return { productId: batch.productId, quantity: '0' };
    }

    await recordMovement(ctx, tx, {
      productId: batch.productId,
      batchId: batch.id,
      qtyChange: `-${batch.quantity}`,
      reason: 'expired',
      refType: 'batch',
      refId: batch.id,
      note: note ?? `Expired — batch ${batch.batchNo}`,
    });

    return { productId: batch.productId, quantity: batch.quantity };
  });
}

/**
 * Batches for several products at once, for the billing form.
 *
 * One query rather than one per line: a bill with eight medicines on it would
 * otherwise open eight round trips to a database a couple of hundred
 * milliseconds away, which is the difference between a form that feels instant
 * and one that stutters while a customer waits.
 */
export async function listBatchesForProducts(
  ctx: TenantCtx,
  productIds: readonly string[],
): Promise<BatchRow[]> {
  if (productIds.length === 0) return [];

  // Bound as one array parameter rather than pasted into the string. These ids
  // arrive from a browser form, and `sql.raw` with a joined list is how a
  // product id becomes a SQL injection.
  const rows = await getDb().execute<BatchRow>(sql`
    ${BATCH_SELECT}
    where b.business_id = ${ctx.businessId}::uuid
      and b.product_id = any(${[...productIds]}::uuid[])
      and b.quantity > 0
    order by b.product_id, b.expiry_date asc nulls last
  `);
  return [...rows];
}

/**
 * How many lots this business is holding.
 *
 * Used by the seed script to refuse a second run. `createBatch` is an upsert
 * but stock movements are not, so running a seeder twice would silently double
 * every quantity — and the rollup would still reconcile, which is what makes it
 * worth an explicit guard rather than a hope.
 */
export async function countBatches(ctx: TenantCtx): Promise<[{ count: number }]> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from product_batches
    where business_id = ${ctx.businessId}::uuid
  `);
  return [{ count: row?.count ?? 0 }];
}

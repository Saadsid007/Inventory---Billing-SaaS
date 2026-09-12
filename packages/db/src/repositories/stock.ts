import type { StockReason, TenantCtx } from '@billwise/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb, type Executor } from '../client';
import { productBatches, products, stockMovements } from '../schema/index';

/**
 * Stock movements. Build spec §5.4.
 *
 * The rule this file exists to enforce:
 *
 *   `products.current_stock` is a CACHED ROLLUP of `stock_movements`, and the
 *   two are only ever changed together, in one transaction.
 *
 * Nothing else in the codebase may write `current_stock`. If a form or a
 * service updates it directly, the cache silently stops matching its own ledger
 * and no one finds out until a stock take.
 */

export type MovementInput = {
  productId: string;
  /** Negative for outward. */
  qtyChange: string;
  reason: StockReason;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  /**
   * Which lot moved, for a business that tracks batches.
   *
   * Optional, and every caller that existed before batches did leaves it
   * undefined — which is what makes this whole feature free for a kirana store
   * and a Jan Seva Kendra. Undefined means "the product has one undifferentiated
   * pile of stock", which is exactly what it meant before.
   */
  batchId?: string | null;
};

/**
 * Record one movement and update the cached rollup atomically.
 *
 * Takes an `Executor` so the caller can pass an open transaction — issuing an
 * invoice writes one of these per line and must not half-succeed.
 *
 * `track_inventory = false` products (services) are skipped: they have no stock
 * to move, and writing a movement for them would put rows in the ledger that
 * can never reconcile against a rollup that stays at zero.
 *
 * ## Batches
 *
 * When `batchId` is given, the batch's own quantity moves by the same amount in
 * the same statement style and the same transaction. That is the entire batch
 * mechanism, and it lives here rather than at the call sites for a reason: this
 * function is already the only place in the codebase allowed to write
 * `current_stock`, so making it the only place allowed to write
 * `product_batches.quantity` keeps one invariant instead of two —
 *
 *     sum(product_batches.quantity) == products.current_stock
 *
 * — and keeps it true through sales, returns, cancellations and adjustments
 * without any of them knowing batches exist.
 */
export async function recordMovement(
  ctx: TenantCtx,
  tx: Executor,
  input: MovementInput,
): Promise<void> {
  const [product] = await tx
    .select({ trackInventory: products.trackInventory })
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.businessId, ctx.businessId)))
    .limit(1);

  if (!product) {
    throw new Error(`Product ${input.productId} does not belong to this business.`);
  }
  if (!product.trackInventory) return;

  // Checked rather than trusted. A batch id from another business, or from
  // another product, would move stock that is not the one being sold — and the
  // rollup would still add up, so nothing downstream would ever notice.
  if (input.batchId) {
    const [batch] = await tx
      .select({ id: productBatches.id })
      .from(productBatches)
      .where(
        and(
          eq(productBatches.id, input.batchId),
          eq(productBatches.businessId, ctx.businessId),
          eq(productBatches.productId, input.productId),
        ),
      )
      .limit(1);

    if (!batch) {
      throw new Error(`Batch ${input.batchId} does not belong to this product.`);
    }
  }

  await tx.insert(stockMovements).values({
    businessId: ctx.businessId,
    productId: input.productId,
    batchId: input.batchId ?? null,
    qtyChange: input.qtyChange,
    reason: input.reason,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    note: input.note ?? null,
    createdBy: ctx.userId,
  });

  // Increment in SQL rather than read-modify-write in JS: two concurrent sales
  // of the same product would otherwise both read the old value and one
  // update would be lost.
  await tx
    .update(products)
    .set({ currentStock: sql`${products.currentStock} + ${input.qtyChange}::numeric` })
    .where(and(eq(products.id, input.productId), eq(products.businessId, ctx.businessId)));

  if (input.batchId) {
    await tx
      .update(productBatches)
      .set({
        quantity: sql`${productBatches.quantity} + ${input.qtyChange}::numeric`,
        // An emptied lot drops out of the picker on its own. Reactivated the
        // moment stock comes back into it — a cancelled bill must restore the
        // batch it sold from, not leave it hidden.
        isActive: sql`(${productBatches.quantity} + ${input.qtyChange}::numeric) > 0`,
      })
      .where(
        and(eq(productBatches.id, input.batchId), eq(productBatches.businessId, ctx.businessId)),
      );
  }
}

export async function recordMovements(
  ctx: TenantCtx,
  tx: Executor,
  inputs: readonly MovementInput[],
): Promise<void> {
  for (const input of inputs) {
    await recordMovement(ctx, tx, input);
  }
}

/**
 * Manual stock in / out. Phase 1g.
 *
 * NOT a purchase bill — just quantity, reason and a note. Purchase bills with
 * supplier and ITC fields are Phase 2.
 */
export async function adjustStock(
  ctx: TenantCtx,
  input: {
    productId: string;
    qtyChange: string;
    reason: StockReason;
    note?: string;
    batchId?: string | null;
  },
): Promise<void> {
  await getDb().transaction((tx) => recordMovement(ctx, tx, input));
}

/** The ledger for one product, newest first. Answers "why is my stock this?" */
export async function listMovements(
  ctx: TenantCtx,
  productId: string,
  limit = 100,
) {
  return getDb()
    .select({
      id: stockMovements.id,
      qtyChange: stockMovements.qtyChange,
      reason: stockMovements.reason,
      refType: stockMovements.refType,
      refId: stockMovements.refId,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.businessId, ctx.businessId),
        eq(stockMovements.productId, productId),
      ),
    )
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
}

export type StockDiscrepancy = {
  productId: string;
  name: string;
  cachedStock: string;
  ledgerStock: string;
};

/**
 * Every product whose cached rollup disagrees with its own ledger.
 *
 * Build spec §8.4 makes this a required test:
 *   `sum(stock_movements.qty_change) === products.current_stock`
 *
 * Also worth exposing as an admin health check — the answer should always be an
 * empty array, and the day it is not, something wrote `current_stock` without
 * going through this file.
 */
export async function findStockDiscrepancies(
  ctx: TenantCtx,
  tx: Executor = getDb(),
): Promise<StockDiscrepancy[]> {
  const rows = await tx.execute<StockDiscrepancy>(sql`
    select
      p.id            as "productId",
      p.name          as "name",
      p.current_stock as "cachedStock",
      coalesce(sum(m.qty_change), 0)::numeric(12,3) as "ledgerStock"
    from products p
    left join stock_movements m
      on m.product_id = p.id and m.business_id = p.business_id
    where p.business_id = ${ctx.businessId}::uuid
      and p.track_inventory = true
    group by p.id, p.name, p.current_stock
    having p.current_stock <> coalesce(sum(m.qty_change), 0)
  `);
  return [...rows];
}

export type BatchDiscrepancy = {
  productId: string;
  name: string;
  cachedStock: string;
  batchStock: string;
};

/**
 * Every batched product whose batches do not add up to its own rollup.
 *
 * The batch counterpart of `findStockDiscrepancies`, and the invariant that
 * makes batches safe to bolt onto an existing stock model:
 *
 *     sum(product_batches.quantity) === products.current_stock
 *
 * If this ever returns a row, something moved stock for a batched product
 * without naming a batch — and the shop's totals will still look right while
 * the shelf and the screen quietly disagree about which lot is left. That is
 * far harder to notice than a number that is plainly wrong.
 *
 * Only products actually carrying batches are checked. A shop that has never
 * used one has nothing to reconcile, which is why this costs the other
 * verticals nothing to run.
 */
export async function findBatchDiscrepancies(
  ctx: TenantCtx,
  tx: Executor = getDb(),
): Promise<BatchDiscrepancy[]> {
  const rows = await tx.execute<BatchDiscrepancy>(sql`
    select
      p.id            as "productId",
      p.name          as "name",
      p.current_stock as "cachedStock",
      coalesce(sum(b.quantity), 0)::numeric(12,3) as "batchStock"
    from products p
    join product_batches b
      on b.product_id = p.id and b.business_id = p.business_id
    where p.business_id = ${ctx.businessId}::uuid
      and p.track_inventory = true
    group by p.id, p.name, p.current_stock
    having p.current_stock <> coalesce(sum(b.quantity), 0)
  `);
  return [...rows];
}

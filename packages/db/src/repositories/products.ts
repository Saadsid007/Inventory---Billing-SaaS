import type { TenantCtx } from '@bahikhata/shared';
import { and, asc, eq, ilike, isNotNull, or, sql } from 'drizzle-orm';
import { getDb, type Executor } from '../client';
import { categories, products, stockMovements, taxRates, units } from '../schema/index';

/**
 * Products. Build spec §4, Phase 1b.
 *
 * Every query is scoped by `ctx.businessId`. `purchase_price` is stripped for
 * the 'staff' role — margins are the owner's business (spec Phase 3).
 */

export type ProductFilters = {
  search?: string | undefined;
  categoryId?: string | undefined;
  /** Only products at or below their low-stock threshold. */
  lowStockOnly?: boolean | undefined;
  includeInactive?: boolean | undefined;
  limit?: number;
  offset?: number;
};

const listColumns = {
  id: products.id,
  name: products.name,
  sku: products.sku,
  barcode: products.barcode,
  hsnCode: products.hsnCode,
  categoryId: products.categoryId,
  categoryName: categories.name,
  unitId: products.unitId,
  unitShortName: units.shortName,
  taxRateId: products.taxRateId,
  taxRate: taxRates.rate,
  cessRate: taxRates.cessRate,
  salePrice: products.salePrice,
  purchasePrice: products.purchasePrice,
  currentStock: products.currentStock,
  lowStockAlert: products.lowStockAlert,
  trackInventory: products.trackInventory,
  showInCatalog: products.showInCatalog,
  isActive: products.isActive,
  imageUrls: products.imageUrls,
};

export async function listProducts(ctx: TenantCtx, filters: ProductFilters = {}) {
  const where = [eq(products.businessId, ctx.businessId)];

  if (!filters.includeInactive) where.push(eq(products.isActive, true));
  if (filters.categoryId) where.push(eq(products.categoryId, filters.categoryId));

  if (filters.search) {
    // Shopkeepers search by whatever is to hand: a partial name, the SKU
    // printed on the shelf label, or a scanned barcode.
    const term = `%${filters.search.trim()}%`;
    where.push(
      or(
        ilike(products.name, term),
        ilike(products.sku, term),
        ilike(products.barcode, term),
      )!,
    );
  }

  if (filters.lowStockOnly) {
    where.push(isNotNull(products.lowStockAlert));
    where.push(eq(products.trackInventory, true));
    where.push(sql`${products.currentStock} <= ${products.lowStockAlert}`);
  }

  const rows = await getDb()
    .select(listColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(units, eq(units.id, products.unitId))
    .leftJoin(taxRates, eq(taxRates.id, products.taxRateId))
    .where(and(...where))
    .orderBy(asc(products.name))
    .limit(filters.limit ?? 200)
    .offset(filters.offset ?? 0);

  return redactForRole(ctx, rows);
}

/**
 * Derived from the query rather than written out by hand, so a column that is
 * nullable in the database cannot be typed as non-null here.
 */
export type ProductListItem = Awaited<ReturnType<typeof listProducts>>[number];

/**
 * Blank out cost price for staff.
 *
 * Done here rather than in the UI on purpose: a component that forgets to hide
 * a field leaks it, and so does any JSON response built from the raw row. The
 * value never leaves the repository in the first place.
 */
function redactForRole<T extends { purchasePrice: string | null }>(
  ctx: TenantCtx,
  rows: T[],
): T[] {
  if (ctx.role === 'owner') return rows;
  return rows.map((r) => ({ ...r, purchasePrice: null }));
}

export async function getProduct(ctx: TenantCtx, productId: string) {
  const [row] = await getDb()
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.businessId, ctx.businessId)))
    .limit(1);
  if (!row) return undefined;
  return ctx.role === 'owner' ? row : { ...row, purchasePrice: null };
}

/** Barcode scan during billing. Exact match, active products only. */
export async function findProductByBarcode(ctx: TenantCtx, barcode: string) {
  const [row] = await getDb()
    .select(listColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(units, eq(units.id, products.unitId))
    .leftJoin(taxRates, eq(taxRates.id, products.taxRateId))
    .where(
      and(
        eq(products.businessId, ctx.businessId),
        eq(products.barcode, barcode.trim()),
        eq(products.isActive, true),
      ),
    )
    .limit(1);
  return row ? redactForRole(ctx, [row])[0] : undefined;
}

export type ProductInput = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  unitId?: string | null;
  hsnCode?: string | null;
  taxRateId?: string | null;
  salePrice: string;
  purchasePrice?: string | null;
  openingStock?: string;
  lowStockAlert?: string | null;
  trackInventory?: boolean;
  description?: string | null;
  imageUrls?: string[];
  customFields?: Record<string, unknown>;
  showInCatalog?: boolean;
};

/**
 * Create a product.
 *
 * Opening stock is not just a column: it writes an `opening` row to
 * `stock_movements` in the same transaction, so the ledger explains the whole
 * of `current_stock` from the very first unit (spec §5.4 and Phase 1b).
 */
export async function createProduct(ctx: TenantCtx, input: ProductInput) {
  return getDb().transaction(async (tx) => {
    const opening = input.openingStock ?? '0';

    const [row] = await tx
      .insert(products)
      .values({
        businessId: ctx.businessId,
        name: input.name.trim(),
        sku: input.sku?.trim() || null,
        barcode: input.barcode?.trim() || null,
        categoryId: input.categoryId ?? null,
        unitId: input.unitId ?? null,
        hsnCode: input.hsnCode?.trim() || null,
        taxRateId: input.taxRateId ?? null,
        salePrice: input.salePrice,
        purchasePrice: input.purchasePrice ?? null,
        openingStock: opening,
        currentStock: opening,
        lowStockAlert: input.lowStockAlert ?? null,
        trackInventory: input.trackInventory ?? true,
        description: input.description ?? null,
        imageUrls: input.imageUrls ?? [],
        customFields: input.customFields ?? {},
        showInCatalog: input.showInCatalog ?? true,
      })
      .returning();

    if (row && Number(opening) !== 0 && (input.trackInventory ?? true)) {
      await tx.insert(stockMovements).values({
        businessId: ctx.businessId,
        productId: row.id,
        qtyChange: opening,
        reason: 'opening',
        note: 'Opening stock',
        createdBy: ctx.userId,
      });
    }

    return row;
  });
}

/**
 * Update a product.
 *
 * Deliberately cannot touch `current_stock` or `opening_stock`. Stock only ever
 * moves by writing to the ledger (see `stock.ts`) — letting a form overwrite
 * the cached rollup would silently desynchronise it from its own movements, and
 * nothing would ever detect that.
 */
export type ProductPatch = Partial<Omit<ProductInput, 'openingStock'>>;

export async function updateProduct(ctx: TenantCtx, productId: string, patch: ProductPatch) {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) values[key] = value;
  }
  if (Object.keys(values).length === 0) return;

  await getDb()
    .update(products)
    .set(values)
    .where(and(eq(products.id, productId), eq(products.businessId, ctx.businessId)));
}

/**
 * Retire a product.
 *
 * A soft delete, always. Invoice lines reference `product_id`, and an inventory
 * report from last year has to keep resolving. Deactivating hides it from
 * pickers and the catalog while leaving history intact.
 */
export async function deactivateProduct(ctx: TenantCtx, productId: string) {
  await getDb()
    .update(products)
    .set({ isActive: false, showInCatalog: false })
    .where(and(eq(products.id, productId), eq(products.businessId, ctx.businessId)));
}

export async function countLowStock(ctx: TenantCtx, tx: Executor = getDb()): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(
      and(
        eq(products.businessId, ctx.businessId),
        eq(products.isActive, true),
        eq(products.trackInventory, true),
        isNotNull(products.lowStockAlert),
        sql`${products.currentStock} <= ${products.lowStockAlert}`,
      ),
    );
  return row?.n ?? 0;
}

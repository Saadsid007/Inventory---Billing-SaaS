import { PRODUCT_TYPES, STOCK_REASONS } from '@billwise/shared';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumValues, updatedAt } from './_shared';
import { businesses } from './businesses';
import { categories, taxRates, units } from './masters';
import { users } from './users';

/**
 * Products and stock. Build spec §4 and §5.4.
 *
 * Money is numeric(12,2) and quantity numeric(12,3) — three decimals because
 * plenty of shops sell in kilos and litres, and rounding 0.250 kg to 0 or 1
 * would be absurd.
 */

export const products = pgTable(
  'products',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    /**
     * 'simple' for a shop. 'batch' for a medicine held per lot with an expiry —
     * see `productBatches` below. 'variant' and 'serial' are still reserved.
     */
    type: text({ enum: enumValues(PRODUCT_TYPES) })
      .notNull()
      .default('simple'),
    name: text().notNull(),
    sku: text(),
    barcode: text(),
    categoryId: uuid().references(() => categories.id),
    subcategoryId: uuid().references(() => categories.id),
    unitId: uuid().references(() => units.id),
    hsnCode: text(),
    taxRateId: uuid().references(() => taxRates.id),

    salePrice: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    /** Hidden from the 'staff' role — margins are the owner's business. */
    purchasePrice: numeric({ precision: 12, scale: 2 }),

    openingStock: numeric({ precision: 12, scale: 3 }).notNull().default('0'),
    /**
     * A CACHED ROLLUP of stock_movements, updated in the same transaction as
     * the movement that changes it. The ledger is the truth; this column exists
     * so a product list does not have to sum a million rows.
     */
    currentStock: numeric({ precision: 12, scale: 3 }).notNull().default('0'),
    lowStockAlert: numeric({ precision: 12, scale: 3 }),
    /** false for services, which have no stock to track. */
    trackInventory: boolean().notNull().default(true),

    /*
     * ---- Pharmacy fields. Null for every other kind of business. ----
     *
     * Real columns rather than entries in `customFields`, for one reason: a
     * chemist handed a prescription searches by salt far more often than by
     * brand, and a search has to be indexable. A jsonb key is not, without
     * reaching for GIN indexes to store five strings.
     *
     * They stay null for a kirana store, cost it nothing, and are only rendered
     * when `features.pharmacyFields` says so.
     */
    /** "Paracetamol 500mg + Caffeine 30mg" — what a prescription is written in. */
    saltComposition: text(),
    /** The non-branded name, e.g. Paracetamol for Crocin. */
    genericName: text(),
    manufacturer: text(),
    /** "10 tablets", "100ml", "1 strip of 15". */
    packSize: text(),
    /** See DRUG_SCHEDULES. Recorded for the counter to see, never enforced. */
    drugSchedule: text(),

    description: text(),
    imageUrls: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    customFields: jsonb().$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    showInCatalog: boolean().notNull().default(true),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('products_business_active_idx').on(t.businessId, t.isActive),
    // Partial unique: a business may leave SKU blank on most products, but two
    // products must never share one.
    uniqueIndex('products_business_sku_unq')
      .on(t.businessId, t.sku)
      .where(sql`${t.sku} is not null`),
    index('products_business_catalog_idx').on(t.businessId, t.showInCatalog),
  ],
);

/**
 * One lot of one medicine: a batch number, an expiry date, and what is left.
 *
 * ## Why a table and not columns on `products`
 *
 * Because a pharmacy holds the same medicine in several batches at once, each
 * bought on a different day at a different price and expiring on a different
 * date. "Paracetamol, expiry 03/2027" is not a property of Paracetamol.
 *
 * ## How this stays out of everyone else's way
 *
 * `products.current_stock` remains the cached rollup it has always been. For a
 * batched product it is the sum of `product_batches.quantity`, kept in step by
 * the same transaction that already maintains it — see `recordMovement` in
 * repositories/stock.ts, which is the only place either is written.
 *
 * The consequence is the point of the whole design: every existing query — the
 * dashboard, the reports, the catalog, low stock — keeps reading
 * `current_stock` and never learns that batches exist. A kirana store's tables
 * stay empty here and nothing about its screens changes.
 *
 * ## Money on a batch
 *
 * `mrp` and `purchasePrice` live here rather than only on the product because
 * they genuinely differ per lot: the same strip bought in January and in June
 * carries two printed MRPs, and billing at the wrong one is the sort of thing a
 * customer notices while standing at the counter.
 */
export const productBatches = pgTable(
  'product_batches',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** As printed on the strip. Free text — manufacturers agree on no format. */
    batchNo: text().notNull(),
    /**
     * Usually printed as MM/YYYY. Stored as the LAST day of that month, which
     * is what "EXP 03/2027" actually means — the medicine is good through
     * March. Storing the first would expire every batch a month early.
     */
    expiryDate: date(),
    mfgDate: date(),
    /** Printed on the pack. What the customer is charged unless discounted. */
    mrp: numeric({ precision: 12, scale: 2 }),
    /** What this lot cost. Drives the real margin, not the product's default. */
    purchasePrice: numeric({ precision: 12, scale: 2 }),
    /** What is left of this lot. Never written except through recordMovement. */
    quantity: numeric({ precision: 12, scale: 3 }).notNull().default('0'),
    /** Set when the lot is exhausted or written off, so pickers can skip it. */
    isActive: boolean().notNull().default(true),
    note: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // The FEFO picker's index: "oldest expiry still in stock, for this product".
    index('product_batches_business_product_expiry_idx').on(
      t.businessId,
      t.productId,
      t.expiryDate,
    ),
    // The expiry report scans by date across the whole shop.
    index('product_batches_business_expiry_idx').on(t.businessId, t.expiryDate),
    // One batch number per product. Receiving the same lot twice should add to
    // the batch that exists, not create a second row that splits its quantity.
    uniqueIndex('product_batches_product_batch_unq').on(t.businessId, t.productId, t.batchNo),
  ],
);

/**
 * Append-only stock ledger. Build spec §5.4.
 *
 * Nothing is ever updated or deleted here. Cancelling an invoice writes equal
 * and opposite movements rather than removing the originals — otherwise there
 * is no way to answer "why is my stock what it is?" three months later.
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    /**
     * Which lot moved. Null for every business that does not track batches,
     * which is what makes this column free for them.
     */
    batchId: uuid().references(() => productBatches.id),
    /** Negative for outward movement. */
    qtyChange: numeric({ precision: 12, scale: 3 }).notNull(),
    reason: text({ enum: enumValues(STOCK_REASONS) }).notNull(),
    /** 'invoice' — what caused this movement. */
    refType: text(),
    refId: uuid(),
    note: text(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index('stock_movements_business_product_time_idx').on(
      t.businessId,
      t.productId,
      t.createdAt,
    ),
    index('stock_movements_ref_idx').on(t.refType, t.refId),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  business: one(businesses, { fields: [products.businessId], references: [businesses.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  subcategory: one(categories, { fields: [products.subcategoryId], references: [categories.id] }),
  unit: one(units, { fields: [products.unitId], references: [units.id] }),
  taxRate: one(taxRates, { fields: [products.taxRateId], references: [taxRates.id] }),
  movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  batch: one(productBatches, {
    fields: [stockMovements.batchId],
    references: [productBatches.id],
  }),
}));

export const productBatchesRelations = relations(productBatches, ({ one, many }) => ({
  product: one(products, { fields: [productBatches.productId], references: [products.id] }),
  movements: many(stockMovements),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type ProductBatch = typeof productBatches.$inferSelect;
export type NewProductBatch = typeof productBatches.$inferInsert;

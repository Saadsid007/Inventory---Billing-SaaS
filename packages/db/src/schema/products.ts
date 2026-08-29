import { PRODUCT_TYPES, STOCK_REASONS } from '@billwise/shared';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
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
    /** 'simple' today. 'variant' | 'batch' | 'serial' are reserved for Phase 3. */
    type: text({ enum: enumValues(PRODUCT_TYPES) })
      .notNull()
      .default('simple'),
    name: text().notNull(),
    sku: text(),
    barcode: text(),
    categoryId: uuid().references(() => categories.id),
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
  unit: one(units, { fields: [products.unitId], references: [units.id] }),
  taxRate: one(taxRates, { fields: [products.taxRateId], references: [taxRates.id] }),
  movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

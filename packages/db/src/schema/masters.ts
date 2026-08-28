import { CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_TYPES } from '@bahikhata/shared';
import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { enumValues } from './_shared';
import { businesses } from './businesses';

/**
 * Per-business master lists. Build spec §4.
 *
 * These are how one codebase serves a kirana store and a garments wholesaler
 * without per-customer code: the business edits its own units, categories and
 * custom fields rather than asking for a feature.
 */

export const units = pgTable(
  'units',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** GST UQC, e.g. 'PCS'. Must be a real UQC for GSTR-1 to accept it. */
    shortName: text().notNull(),
  },
  (t) => [unique('units_business_short_unq').on(t.businessId, t.shortName)],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text().notNull(),
  },
  (t) => [unique('categories_business_name_unq').on(t.businessId, t.name)],
);

/**
 * User-defined fields.
 *
 * ONLY on products and parties — never on invoices. An invoice is a legal
 * document whose shape has to stay predictable for printing and for GSTR-1;
 * letting users bolt arbitrary fields onto it makes both unreliable.
 */
export const customFieldDefs = pgTable(
  'custom_field_defs',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    entity: text({ enum: enumValues(CUSTOM_FIELD_ENTITIES) }).notNull(),
    /** Machine key, slugified. The JSON key inside `custom_fields`. */
    key: text().notNull(),
    label: text().notNull(),
    type: text({ enum: enumValues(CUSTOM_FIELD_TYPES) }).notNull(),
    /** Choices, for `type = 'select'`. */
    options: jsonb().$type<string[]>(),
    required: boolean().notNull().default(false),
    showInCatalog: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [unique('custom_field_defs_business_entity_key_unq').on(t.businessId, t.entity, t.key)],
);

/**
 * Tax rates. Build spec §3.4: never hardcode GST slabs.
 *
 * GST 2.0, effective 22 Sep 2025, removed the 12% and 28% slabs. That will
 * happen again, and when it does an invoice issued last year must still print
 * the rate it was actually billed at — which is why rates are rows with an
 * `effective_from`, and why invoice lines snapshot the rate rather than
 * joining to this table.
 *
 * `business_id IS NULL` marks a global/system rate shared by every tenant.
 */
export const taxRates = pgTable(
  'tax_rates',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid().references(() => businesses.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** Percentage, e.g. 18.00. */
    rate: numeric({ precision: 5, scale: 2 }).notNull(),
    cessRate: numeric({ precision: 5, scale: 2 }).notNull().default('0'),
    effectiveFrom: date().notNull(),
    /** NULL means still in force. */
    effectiveTo: date(),
    isActive: boolean().notNull().default(true),
  },
  (t) => [index('tax_rates_business_active_idx').on(t.businessId, t.isActive)],
);

export const unitsRelations = relations(units, ({ one }) => ({
  business: one(businesses, { fields: [units.businessId], references: [businesses.id] }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  business: one(businesses, { fields: [categories.businessId], references: [businesses.id] }),
}));

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CustomFieldDef = typeof customFieldDefs.$inferSelect;
export type NewCustomFieldDef = typeof customFieldDefs.$inferInsert;
export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;

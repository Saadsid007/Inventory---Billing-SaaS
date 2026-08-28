import { PARTY_TYPES } from '@bahikhata/shared';
import { relations, sql } from 'drizzle-orm';
import { boolean, index, jsonb, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumValues } from './_shared';
import { businesses } from './businesses';

/**
 * Customers and suppliers. Build spec §4.
 *
 * One table for both, because in practice the same shop is often both — you
 * buy from them and sell to them — and forcing a choice at creation time just
 * produces duplicate records.
 */
export const parties = pgTable(
  'parties',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    type: text({ enum: enumValues(PARTY_TYPES) })
      .notNull()
      .default('customer'),
    name: text().notNull(),
    phone: text(),
    email: text(),
    gstin: text(),
    /**
     * Required for place-of-supply when a GSTIN is present. Without it the
     * invoice falls back to the GSTIN's first two digits, which is usually but
     * not always right (spec §5.2).
     */
    stateCode: text(),
    addressLine1: text(),
    city: text(),
    pincode: text(),
    /** Positive means they owe us. Carried forward from before the app existed. */
    openingBalance: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    customFields: jsonb().$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index('parties_business_type_idx').on(t.businessId, t.type),
    index('parties_business_name_idx').on(t.businessId, t.name),
    index('parties_business_phone_idx').on(t.businessId, t.phone),
  ],
);

export const partiesRelations = relations(parties, ({ one }) => ({
  business: one(businesses, { fields: [parties.businessId], references: [businesses.id] }),
}));

export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;

import { BUSINESS_STATUSES, MEMBER_ROLES, type StorefrontConfig, TAX_MODES } from '@billwise/shared';
import { relations, sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumValues } from './_shared';
import { users } from './users';

/**
 * Tenancy. Build spec §4.
 *
 * A `business` is THE tenant. Every business-owned table from here on carries
 * `business_id` with an index, no exceptions (spec §3.1), and every query is
 * scoped through it.
 */

export const businessStatusEnum = pgEnum('business_status', enumValues(BUSINESS_STATUSES));

export const businesses = pgTable(
  'businesses',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerUserId: uuid()
      .notNull()
      .references(() => users.id),
    name: text().notNull(),
    /** Public catalog URL: /store/[slug]. Globally unique, not per-tenant. */
    slug: text().notNull().unique(),
    legalName: text(),
    /** NULL means an unregistered business — it bills with cash memos, not tax invoices. */
    gstin: text(),
    /**
     * 2-digit GST state code, e.g. '09' for Uttar Pradesh. Required even for
     * unregistered businesses: it is the supplier state for place-of-supply,
     * and it gets snapshotted onto every invoice (spec §5.2).
     */
    stateCode: text().notNull(),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    pincode: text(),
    phone: text(),
    email: text(),
    logoUrl: text(),
    /**
     * Signature or stamp, printed above the "For <business>" line on an A4
     * invoice. A separate image from the logo: one is branding at the top of
     * the page, the other is an authorised signatory at the bottom, and a shop
     * often has one without the other.
     */
    signatureUrl: text(),

    /**
     * Signup grants a 10-day trial immediately — there is no approval queue.
     * A business is usable while `status = 'trial'` and `trial_ends_at` is in
     * the future, or while `status = 'active'` (paid).
     *
     * Expiry is NOT a stored status: it is derived from `trial_ends_at` by
     * `evaluateAccess()` in @billwise/shared, so no scheduled job has to run
     * for the answer to be correct.
     */
    status: businessStatusEnum().notNull().default('trial'),
    trialEndsAt: timestamp({ withTimezone: true }),
    /**
     * End of the paid month, extended by each payment.
     *
     * NULL on a paid business means "no end recorded" and grants access
     * forever: that is every row created before monthly billing existed, and
     * anything a super admin switches on by hand. Nobody loses access because
     * of when they signed up.
     */
    paidUntil: timestamp({ withTimezone: true }),
    /** Set when a payment is recorded and the business is switched to 'active'. */
    approvedAt: timestamp({ withTimezone: true }),
    approvedBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    // The super admin's queue, and the periodic sweep for expired trials.
    index('businesses_status_idx').on(t.status),
    index('businesses_owner_idx').on(t.ownerUserId),
  ],
);

/**
 * Who may act for a business, and as what.
 *
 * Phase 0b only ever creates an 'owner' row. 'staff' exists in the type from
 * day one because retrofitting a role column onto a live permissions system is
 * far more expensive than carrying an unused value (spec §3).
 */
export const businessMembers = pgTable(
  'business_members',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text({ enum: enumValues(MEMBER_ROLES) })
      .notNull()
      .default('owner'),
  },
  (t) => [
    unique('business_members_business_user_unq').on(t.businessId, t.userId),
    // Session -> "which businesses can this user act for" runs on every request.
    index('business_members_user_idx').on(t.userId),
  ],
);

/**
 * Per-business configuration. This table is what makes one codebase serve a
 * kirana store and a garments wholesaler without per-customer changes.
 */
export const businessSettings = pgTable('business_settings', {
  businessId: uuid()
    .primaryKey()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  currency: text().notNull().default('INR'),
  /** Whether line rates are entered tax-inclusive or tax-exclusive (spec §5.3). */
  defaultTaxMode: text({ enum: enumValues(TAX_MODES) })
    .notNull()
    .default('exclusive'),
  invoiceTerms: text(),
  invoiceFooter: text(),
  /** Some wholesalers publish a catalog but hide prices from the public. */
  showCatalogPrices: boolean().notNull().default(true),
  catalogEnabled: boolean().notNull().default(false),
  catalogWhatsapp: text(),
  theme: text().notNull().default('light'),
  storefrontConfig: jsonb('storefront_config')
    .$type<StorefrontConfig>()
    .notNull()
    .default(sql`'{}'::jsonb`),
});

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerUserId], references: [users.id] }),
  settings: one(businessSettings, {
    fields: [businesses.id],
    references: [businessSettings.businessId],
  }),
  members: many(businessMembers),
}));

export const businessMembersRelations = relations(businessMembers, ({ one }) => ({
  business: one(businesses, {
    fields: [businessMembers.businessId],
    references: [businesses.id],
  }),
  user: one(users, { fields: [businessMembers.userId], references: [users.id] }),
}));

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  business: one(businesses, {
    fields: [businessSettings.businessId],
    references: [businesses.id],
  }),
}));

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type NewBusinessMember = typeof businessMembers.$inferInsert;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type NewBusinessSettings = typeof businessSettings.$inferInsert;

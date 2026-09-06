import {
  INVOICE_KINDS,
  INVOICE_STATUSES,
  PAYMENT_DIRECTIONS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TAX_MODES,
} from '@billwise/shared';
import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumValues, updatedAt } from './_shared';
import { businesses } from './businesses';
import { parties } from './parties';
import { products } from './products';
import { users } from './users';

/**
 * Invoices. Build spec §4, §5.1, §5.3 and §5.5.
 *
 * The single most important rule in this file: INVOICE LINES SNAPSHOT
 * everything they print. Product names change, prices change, GST slabs change.
 * An invoice issued in 2026 must still print exactly what the customer was
 * handed in 2026, so nothing here joins to `products` at print time.
 */

export const invoiceKindEnum = pgEnum('invoice_kind', enumValues(INVOICE_KINDS));
export const invoiceStatusEnum = pgEnum('invoice_status', enumValues(INVOICE_STATUSES));
export const paymentStatusEnum = pgEnum('payment_status', enumValues(PAYMENT_STATUSES));

/**
 * One gapless number sequence per business, per document kind, per financial
 * year. Build spec §5.1.
 *
 * Deliberately NOT a Postgres SEQUENCE: sequences leak numbers on rollback, and
 * a gap in a GST invoice series is a compliance problem. The number is
 * allocated by locking this row inside the issuing transaction.
 */
export const invoiceSeries = pgTable(
  'invoice_series',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    kind: invoiceKindEnum().notNull(),
    /** '2026-27'. Derived from invoice_date, never from the current date. */
    fy: text().notNull(),
    prefix: text().notNull().default(''),
    nextNumber: integer().notNull().default(1),
    padding: integer().notNull().default(3),
  },
  (t) => [unique('invoice_series_business_kind_fy_unq').on(t.businessId, t.kind, t.fy)],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    kind: invoiceKindEnum().notNull(),
    status: invoiceStatusEnum().notNull().default('draft'),
    fy: text().notNull(),
    /** Assigned ONLY on issue. Drafts have NULL. Cancelled invoices keep theirs. */
    invoiceNo: text(),
    invoiceDate: date().notNull(),
    dueDate: date(),

    partyId: uuid().references(() => parties.id),
    // Party snapshots — a customer can change their address or GSTIN, and the
    // invoice they were given must not change with them.
    partyName: text().notNull(),
    partyGstin: text(),
    partyPhone: text(),
    partyAddress: text(),

    /** Snapshot of the business's state at the time of billing. */
    supplierStateCode: text().notNull(),
    placeOfSupply: text().notNull(),
    isInterstate: boolean().notNull(),

    taxMode: text({ enum: enumValues(TAX_MODES) })
      .notNull()
      .default('exclusive'),
    subtotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    discountTotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    cgstTotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    sgstTotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    igstTotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    cessTotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    otherCharges: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    roundOff: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    grandTotal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),

    amountPaid: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    paymentStatus: paymentStatusEnum().notNull().default('unpaid'),

    notes: text(),
    terms: text(),

    /**
     * Lets a customer open this one bill without logging in — the link sent
     * over WhatsApp.
     *
     * A separate random token rather than the row's id: an id leaks into logs,
     * referrers and screenshots long before anyone decides a bill should be
     * shareable, and a token can be rotated if a link goes somewhere it should
     * not have. Written only when a bill is first shared, so invoices nobody
     * sends never get one.
     */
    publicToken: text().unique(),

    cancelledAt: timestamp({ withTimezone: true }),
    cancelReason: text(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // The gaplessness guarantee, enforced by the database rather than trusted.
    uniqueIndex('invoices_business_kind_fy_no_unq')
      .on(t.businessId, t.kind, t.fy, t.invoiceNo)
      .where(sql`${t.invoiceNo} is not null`),
    index('invoices_business_date_idx').on(t.businessId, t.invoiceDate.desc()),
    index('invoices_business_party_idx').on(t.businessId, t.partyId),
    index('invoices_business_status_idx').on(t.businessId, t.status),
    index('invoices_business_payment_idx').on(t.businessId, t.paymentStatus),
  ],
);

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    lineNo: integer().notNull(),
    /** Nullable: ad-hoc lines that were never a catalogued product are allowed. */
    productId: uuid().references(() => products.id),

    // ---- SNAPSHOT FIELDS. Never join to products for printing. ----
    name: text().notNull(),
    hsnCode: text(),
    unit: text(),
    qty: numeric({ precision: 12, scale: 3 }).notNull(),
    rate: numeric({ precision: 12, scale: 2 }).notNull(),
    discountPct: numeric({ precision: 5, scale: 2 }).notNull().default('0'),
    discountAmount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    taxableValue: numeric({ precision: 12, scale: 2 }).notNull(),
    taxRate: numeric({ precision: 5, scale: 2 }).notNull().default('0'),
    cessRate: numeric({ precision: 5, scale: 2 }).notNull().default('0'),
    cgstAmount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    sgstAmount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    igstAmount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    cessAmount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    lineTotal: numeric({ precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index('invoice_lines_invoice_idx').on(t.invoiceId),
    index('invoice_lines_business_product_idx').on(t.businessId, t.productId),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    partyId: uuid().references(() => parties.id),
    /** NULL for an on-account payment not tied to a specific invoice. */
    invoiceId: uuid().references(() => invoices.id),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    direction: text({ enum: enumValues(PAYMENT_DIRECTIONS) }).notNull(),
    method: text({ enum: enumValues(PAYMENT_METHODS) }).notNull(),
    reference: text(),
    paidOn: date().notNull(),
    note: text(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index('payments_business_party_date_idx').on(t.businessId, t.partyId, t.paidOn),
    index('payments_business_invoice_idx').on(t.businessId, t.invoiceId),
  ],
);

/** Anonymous view counter for the public catalog. */
export const catalogViews = pgTable(
  'catalog_views',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    productId: uuid().references(() => products.id),
    viewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    referrer: text(),
  },
  (t) => [index('catalog_views_business_time_idx').on(t.businessId, t.viewedAt)],
);

/**
 * Minimal audit, invoices only (spec explicitly rules out a system-wide log).
 *
 * No foreign keys on purpose: this must survive the deletion of whatever it
 * describes, or it is not an audit trail.
 */
export const invoiceAudit = pgTable(
  'invoice_audit',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    businessId: uuid().notNull(),
    invoiceId: uuid().notNull(),
    action: text().notNull(),
    changedBy: uuid(),
    snapshot: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [index('invoice_audit_business_invoice_idx').on(t.businessId, t.invoiceId)],
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, { fields: [invoices.businessId], references: [businesses.id] }),
  party: one(parties, { fields: [invoices.partyId], references: [parties.id] }),
  lines: many(invoiceLines),
  payments: many(payments),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceLines.productId], references: [products.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  party: one(parties, { fields: [payments.partyId], references: [parties.id] }),
}));

export type InvoiceSeries = typeof invoiceSeries.$inferSelect;
export type NewInvoiceSeries = typeof invoiceSeries.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

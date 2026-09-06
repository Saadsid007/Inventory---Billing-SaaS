import { APPLICATION_STATUSES } from '@billwise/shared';
import { date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumValues, updatedAt } from './_shared';
import { businesses } from './businesses';
import { invoices } from './invoices';
import { parties } from './parties';
import { products } from './products';
import { users } from './users';

/**
 * Work in hand at a Jan Seva Kendra.
 *
 * ## Why this table exists
 *
 * A shop sells something and the transaction is over. A CSC takes ₹200 for a
 * PAN card and the work runs for two weeks, during which the single most common
 * question at the counter is "bhaiya mera card aaya?". Today that lives in a
 * paper diary. Without somewhere to keep it, the billing screens are only half
 * the job.
 *
 * ## Why it is not just a column on the invoice
 *
 * One receipt can cover several jobs — a family walks in and gets three Aadhaar
 * updates on one bill. Each one has its own acknowledgement number and its own
 * status, and they finish on different days. And a job can exist with no bill
 * at all: work started, money taken later.
 *
 * ## What is deliberately NOT stored here
 *
 * No Aadhaar number, and no scans or photographs of anybody's documents.
 * Holding Aadhaar data pulls a one-room shop inside the Aadhaar Act's storage
 * rules, and a leak from a small business's database is a far worse outcome
 * than the mild convenience it buys. `documentsHeld` is a plain checklist of
 * what physical paper is in the drawer — "Aadhaar copy, 2 photos" — which is
 * the thing an owner actually needs to look up. The government's own
 * acknowledgement number is enough to track any application, and it is not
 * sensitive.
 */
export const serviceApplications = pgTable(
  'service_applications',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),

    partyId: uuid().references(() => parties.id),
    /** The receipt this was billed on, when it was billed at all. */
    invoiceId: uuid().references(() => invoices.id, { onDelete: 'set null' }),
    /** The service master row, for reporting. Null for one-off work. */
    serviceId: uuid().references(() => products.id),

    /** Snapshot, like an invoice line. A renamed service must not rewrite history. */
    serviceName: text().notNull(),
    /** Snapshot too, so a list can show who it was for without a join. */
    partyName: text(),
    partyPhone: text(),

    status: text({ enum: enumValues(APPLICATION_STATUSES) })
      .notNull()
      .default('applied'),

    /** The government acknowledgement / URN / enrolment number. Not sensitive. */
    referenceNo: text(),

    appliedOn: date().notNull(),
    /** What the customer was told. Drives the "overdue" list. */
    expectedOn: date(),
    deliveredOn: date(),

    /** Free text checklist of the paper being held. Never a number, never a scan. */
    documentsHeld: text(),
    note: text(),

    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // "What is still open" and "what is ready to collect" are the two lists the
    // dashboard and the work screen are built from.
    index('service_applications_business_status_idx').on(t.businessId, t.status),
    index('service_applications_business_applied_idx').on(t.businessId, t.appliedOn.desc()),
    index('service_applications_business_party_idx').on(t.businessId, t.partyId),
    index('service_applications_invoice_idx').on(t.invoiceId),
  ],
);

export type ServiceApplication = typeof serviceApplications.$inferSelect;
export type NewServiceApplication = typeof serviceApplications.$inferInsert;

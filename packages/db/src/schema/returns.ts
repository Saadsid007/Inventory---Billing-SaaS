import { index, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt } from './_shared';
import { businesses } from './businesses';
import { invoices } from './invoices';
import { parties } from './parties';
import { products } from './products';
import { users } from './users';

/**
 * Sales returns. What a customer brought back.
 *
 * A return is its own document, not an edit of the bill. The original invoice
 * was printed, handed over and possibly filed by a CA; changing its quantities
 * afterwards would make the paper and the database disagree, and there would be
 * no record that anything came back at all.
 *
 * So a return records what returned, puts the stock back, and reduces what the
 * customer owes. The invoice keeps saying what was sold on the day it was sold.
 *
 * This is NOT a GST credit note. That is a numbered document with its own
 * series and its own place in GSTR-1, and it arrives with the rest of Phase 2.
 * `invoiceId` is kept so a credit note can be built from these rows later
 * without asking anyone to enter them again.
 */
export const salesReturns = pgTable(
  'sales_returns',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    /** The bill the goods came back from. Null for a return with no bill to hand. */
    invoiceId: uuid().references(() => invoices.id),
    partyId: uuid().references(() => parties.id),
    returnDate: text().notNull(),
    /** What the customer is credited, in money. */
    totalAmount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    reason: text(),
    note: text(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index('sales_returns_business_idx').on(t.businessId),
    index('sales_returns_invoice_idx').on(t.invoiceId),
    index('sales_returns_party_idx').on(t.partyId),
  ],
);

export const salesReturnLines = pgTable(
  'sales_return_lines',
  {
    id: uuid().primaryKey().defaultRandom(),
    returnId: uuid()
      .notNull()
      .references(() => salesReturns.id, { onDelete: 'cascade' }),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    productId: uuid().references(() => products.id),
    /** Snapshot, like an invoice line. A renamed product must not rewrite history. */
    name: text().notNull(),
    qty: numeric({ precision: 12, scale: 3 }).notNull(),
    rate: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    amount: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    restock: text().notNull().default('yes'),
  },
  (t) => [index('sales_return_lines_return_idx').on(t.returnId)],
);

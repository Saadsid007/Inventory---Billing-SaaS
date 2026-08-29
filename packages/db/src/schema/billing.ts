import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { createdAt } from './_shared';

/**
 * Subscription payments.
 *
 * Separate from `payments`, which records money a shopkeeper's own customers
 * paid them. This is money the shopkeeper paid us, and mixing the two would
 * put our revenue inside a tenant's books.
 *
 * A row is written when a QR is generated, and updated when the money lands.
 * Nothing here is ever deleted: a payment record that can disappear is no use
 * the day somebody says they paid and we cannot find it.
 */
export const subscriptionPayments = pgTable(
  'subscription_payments',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    provider: text().notNull().default('razorpay'),
    /** The provider's QR code id. Unique, so a webhook cannot double-credit. */
    providerRef: text().notNull().unique(),
    /** The provider's payment id, once money has actually arrived. */
    paymentRef: text(),
    /** Money as a string, never a float (spec rule 3). */
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    currency: text().notNull().default('INR'),
    /** created | paid | expired | failed */
    status: text().notNull().default('created'),
    method: text(),
    /** How many months this payment buys. One, for now. */
    months: numeric({ precision: 3, scale: 0 }).notNull().default('1'),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('subscription_payments_business_idx').on(t.businessId)],
);

import { boolean, integer, jsonb, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './_shared';
import { users } from './users';

/**
 * What each kind of business pays.
 *
 * ## Why this is a table and not a constant
 *
 * The price used to be `MONTHLY_PRICE_INR = '299.00'` in the shared package,
 * which meant changing it was a code edit, a review, a build and a deploy —
 * for a number. Worse, the moment a second business type existed the constant
 * was wrong for one of them, and the fix was going to be a second constant,
 * then a third.
 *
 * So: one row per business type, edited from the admin panel. Adding a vertical
 * later is an INSERT, not a release.
 *
 * ## What is deliberately not here
 *
 * No per-business override. A price that can differ per shop is a discount
 * system, and a discount system needs an audit trail, an expiry and a reason —
 * none of which exist yet, and a half-built one is how a customer ends up
 * charged the wrong amount with nobody able to say why.
 *
 * ## The money rule still applies
 *
 * `monthlyPrice` is numeric(12,2) and is read as a string all the way to the
 * payment call. Never parse it to a float on the way past.
 */
export const plans = pgTable('plans', {
  /**
   * The business type this plan is for — 'retail', 'jan_seva'. Not a foreign
   * key because business types are a code-level union; this column is what
   * ties a row to one of them.
   */
  businessType: text().primaryKey(),
  /** Shown on the pricing page and the billing screen, e.g. "Jan Seva Kendra". */
  label: text().notNull(),
  /** One line under the price. */
  tagline: text(),
  monthlyPrice: numeric({ precision: 12, scale: 2 }).notNull(),
  /** Days of full access on signup, before the first payment is due. */
  trialDays: integer().notNull().default(10),
  /**
   * The "what you get" bullets, as an ordered array of plain strings.
   *
   * Plain text on purpose. The moment this holds markup, an admin panel becomes
   * a way to inject HTML into every customer's billing page.
   */
  features: jsonb().$type<string[]>().notNull().default([]),
  /** A type that exists in code but is not being sold yet. */
  isActive: boolean().notNull().default(true),
  updatedBy: uuid().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

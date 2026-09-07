import type { BusinessType } from './business-types';

/**
 * Subscription model.
 *
 * Register → 10 days of full access immediately → a monthly price after that.
 * There is no approval step: a shopkeeper who signs up at 9pm is billing
 * customers at 9:01pm.
 *
 * ## Where the price actually comes from
 *
 * The `plans` table, edited from the admin panel — see
 * packages/db/src/schema/plans.ts. What is below is the fallback used when
 * that row has not been seeded yet, and the seed values themselves.
 *
 * Nothing that charges money should read these constants directly. Read the
 * plan. A constant cannot be corrected without a deploy, and the one thing you
 * do not want to need a deploy for is the number you are billing people.
 */

export const TRIAL_DAYS = 10;

/**
 * Fallback monthly price. A money string, never a number (spec rule 3).
 *
 * Retail's number, because every business that existed before business types
 * did was a shop.
 */
export const MONTHLY_PRICE_INR = '299.00';

export type PlanDefaults = {
  label: string;
  tagline: string;
  monthlyPrice: string;
  trialDays: number;
  features: string[];
};

/**
 * What each vertical is worth, before an admin touches it.
 *
 * A Jan Seva Kendra is a one-room counter turning over a few hundred rupees a
 * day; a shop with stock, GST returns and a catalog is not. Charging both ₹299
 * priced the smaller one out for features it will never open.
 */
export const PLAN_DEFAULTS: Record<BusinessType, PlanDefaults> = {
  retail: {
    label: 'Shop or business',
    tagline: 'Billing, stock and GST for a shop that sells goods.',
    monthlyPrice: '299.00',
    trialDays: TRIAL_DAYS,
    features: [
      'Unlimited bills, products and customers',
      'GST and non-GST billing, with all five document types',
      'A4 and 80mm thermal printing',
      'Automatic stock tracking and low-stock alerts',
      'Customer ledger with a running balance',
      'Your public catalog and QR code',
      'Sales, tax, stock and outstanding reports, with CSV exports',
    ],
  },
  jan_seva: {
    label: 'Jan Seva Kendra / CSC',
    tagline: 'Receipts and a work register for a service counter.',
    monthlyPrice: '149.00',
    trialDays: TRIAL_DAYS,
    features: [
      'Unlimited receipts, services and customers',
      'Work register — applied, in process, ready, delivered',
      'Part payment today, the rest on collection — both tracked',
      'Send the receipt on WhatsApp, and a message when the work is ready',
      'A4 and 80mm slips with the reference number on them',
      'One screen for who owes you what',
      'Earnings report, after the government fee is taken out',
    ],
  },
};

/**
 * The lowest advertised price, whole rupees, for marketing copy.
 *
 * Used where the page is statically rendered and cannot ask the database which
 * plans exist — the site metadata, the OG image, the signup blurb. Those all
 * say "from", so being a default rather than the live number is honest: it is
 * a floor, and an admin lowering a price only ever makes it more true.
 *
 * Anywhere that quotes an exact price to somebody about to pay it reads the
 * `plans` row instead.
 */
export const FROM_PRICE_INR = String(
  Math.min(...Object.values(PLAN_DEFAULTS).map((p) => Number(p.monthlyPrice))),
);

export function trialEndsAt(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

/** Whole days left, floored at 0. Used for the trial countdown. */
export function trialDaysRemaining(endsAt: Date, now: Date = new Date()): number {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/**
 * Where a paid month ends.
 *
 * Counted from the later of "now" and the current expiry, so paying early adds
 * a month to what you already have rather than throwing the remainder away.
 *
 * Calendar months, not 30 days: someone who pays on the 5th expects to pay
 * again on the 5th. JavaScript rolls 31 January + 1 month into 3 March, so the
 * day is clamped to the end of the shorter month.
 */
export function addOneMonth(from: Date): Date {
  const day = from.getDate();
  const next = new Date(from);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDayOfNextMonth));
  return next;
}

export function nextPeriodEnd(currentEnd: Date | null, now: Date = new Date()): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return addOneMonth(base);
}

/** Whole days until the paid month runs out. Same rules as the trial. */
export function subscriptionDaysRemaining(paidUntil: Date, now: Date = new Date()): number {
  return trialDaysRemaining(paidUntil, now);
}

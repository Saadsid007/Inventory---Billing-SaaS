/**
 * Subscription model.
 *
 * Register → 10 days of full access immediately → ₹299/month after that.
 * There is no approval step: a shopkeeper who signs up at 9pm is billing
 * customers at 9:01pm.
 */

export const TRIAL_DAYS = 10;

/** Monthly price. A money string, never a number (spec rule 3). */
export const MONTHLY_PRICE_INR = '299.00';

export function trialEndsAt(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

/** Whole days left, floored at 0. Used for the "N din bache hain" banner. */
export function trialDaysRemaining(endsAt: Date, now: Date = new Date()): number {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

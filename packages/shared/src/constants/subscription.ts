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

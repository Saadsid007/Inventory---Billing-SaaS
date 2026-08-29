/**
 * Tenant scoping. Build spec §3.
 *
 * Every repository function takes `TenantCtx` as its first argument — including
 * reads. `businessId` is only ever read from here. If you see it come from a
 * request body or a query parameter, that is a bug.
 */

export const MEMBER_ROLES = ['owner', 'staff'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * `pending` and `rejected` are retained for the enum's history but are no
 * longer produced: signup grants a trial immediately rather than queueing for
 * manual approval. A new business starts at `trial`.
 */
export const BUSINESS_STATUSES = [
  'pending',
  'trial',
  'active',
  'suspended',
  'rejected',
] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export type TenantCtx = {
  businessId: string;
  userId: string;
  role: MemberRole;
};

/**
 * Why a business may or may not use the app right now.
 *
 * `trial_expired` is deliberately *derived* from `trial_ends_at` rather than
 * stored as a status. A stored "expired" value would need a scheduled job to
 * write it, and the day that job failed every trial would silently stay open.
 * Computing it means the answer is always right without anything having run.
 */
export type AccessState =
  | 'ok'
  | 'trial_expired'
  | 'payment_due'
  | 'suspended'
  | 'rejected'
  | 'unknown';

export type AccessInput = {
  status: BusinessStatus;
  trialEndsAt: Date | null;
  /**
   * End of the paid month. `null` means "paid, with no end recorded" — the
   * shape of every row that predates monthly billing, and of anything a super
   * admin switches on by hand. Those keep working forever on purpose; nobody
   * should lose access because of when they signed up.
   */
  paidUntil?: Date | null;
};

export function evaluateAccess(
  { status, trialEndsAt, paidUntil }: AccessInput,
  now: Date = new Date(),
): AccessState {
  switch (status) {
    case 'active':
      if (!paidUntil) return 'ok';
      return paidUntil.getTime() > now.getTime() ? 'ok' : 'payment_due';
    case 'trial':
      // A missing end date means the trial was never stamped. Treat that as
      // open rather than locking someone out over a data bug.
      if (!trialEndsAt) return 'ok';
      return trialEndsAt.getTime() > now.getTime() ? 'ok' : 'trial_expired';
    case 'suspended':
      return 'suspended';
    case 'rejected':
      return 'rejected';
    case 'pending':
      // Legacy: predates the trial model. Nothing creates it any more.
      return 'trial_expired';
    default:
      return 'unknown';
  }
}

export function canAccessApp(input: AccessInput, now: Date = new Date()): boolean {
  return evaluateAccess(input, now) === 'ok';
}

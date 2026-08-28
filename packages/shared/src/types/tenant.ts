/**
 * Tenant scoping. Build spec §3.
 *
 * Every repository function takes this as its first argument — including reads.
 * `businessId` is only ever read from here. If you see it come from a request
 * body or a query parameter, that is a bug.
 */

export const MEMBER_ROLES = ['owner', 'staff'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

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

/** Statuses that grant access to the authenticated app beyond /app/pending. */
export const ACTIVE_BUSINESS_STATUSES: readonly BusinessStatus[] = ['trial', 'active'];

export function isActiveBusinessStatus(status: BusinessStatus): boolean {
  return ACTIVE_BUSINESS_STATUSES.includes(status);
}

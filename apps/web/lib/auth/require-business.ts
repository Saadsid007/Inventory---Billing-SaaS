import 'server-only';
import { findUserById, getBusinessStatus, resolveMembership } from '@billwise/db';
import {
  type AccessState,
  type BusinessStatus,
  type TenantCtx,
  evaluateAccess,
} from '@billwise/shared';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/auth';

/**
 * Tenant resolution. Build spec §3.
 *
 * This is the only place `businessId` enters the application. Everything
 * downstream receives it inside a `TenantCtx` and passes that to repositories,
 * which scope every query by it. Nothing reads a business id from a request
 * body, a query parameter or a route segment — if you find code doing that,
 * it is a tenancy bug, not a shortcut.
 *
 * ## Why the access check is here and not in the proxy
 *
 * `proxy.ts` runs on the edge runtime with no database, so it can only read
 * what a JWT already holds — and a 30-day JWT would keep reporting a stale
 * subscription state for weeks. Someone who pays at noon would stay locked out
 * until their token happened to refresh.
 *
 * So the responsibility is split:
 *   • proxy.ts   — "is there a session at all?" Cheap, no database.
 *   • this file  — "is this business allowed in *right now*?" One indexed read
 *                  per request, always current.
 *
 * A payment or a suspension therefore takes effect on the very next request.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
};

/** Authenticated user, or a redirect to login. No business required. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    isSuperAdmin: session.user.isSuperAdmin,
  };
}

export type Membership = {
  ctx: TenantCtx;
  businessName: string;
  slug: string;
  status: BusinessStatus;
  trialEndsAt: Date | null;
  /** End of the paid month. Null means no end recorded — see evaluateAccess. */
  paidUntil: Date | null;
  createdAt: Date;
  /** Derived, not stored — see `evaluateAccess` in @billwise/shared. */
  access: AccessState;
};

/**
 * Resolve the active business WITHOUT gating on its status.
 *
 * Used by `/app/pending`, which by definition has to render for a business that
 * is not allowed into the rest of the app.
 *
 * Wrapped in React's `cache` so a layout, its page, and any server action in
 * the same request share one status read instead of hitting the database three
 * times for the same answer.
 */
export const requireMembership = cache(async function requireMembership(): Promise<Membership> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  let businessId = session.businessId;
  let role = session.role;

  // A session minted in the gap between user creation and business creation
  // has no business on its token. Recover by re-resolving rather than bouncing
  // the user to an error page.
  if (!businessId || !role) {
    const membership = await resolveMembership(session.user.id);
    if (!membership) {
      redirect('/register');
    }
    businessId = membership.businessId;
    role = membership.role;
  }

  const ctx: TenantCtx = { businessId, userId: session.user.id, role };

  const row = await getBusinessStatus(ctx);
  if (!row) {
    // The membership row survived but the business did not. Nothing sane to
    // render; send them back through signup.
    redirect('/register');
  }

  return {
    ctx,
    businessName: row.name,
    slug: row.slug,
    status: row.status,
    trialEndsAt: row.trialEndsAt,
    paidUntil: row.paidUntil,
    createdAt: row.createdAt,
    access: evaluateAccess({
      status: row.status,
      trialEndsAt: row.trialEndsAt,
      paidUntil: row.paidUntil,
    }),
  };
});

/**
 * The standard guard for every page under `/app`.
 *
 * Returns a `TenantCtx` for a business on an open trial or inside a paid month,
 * and otherwise sends them to billing, which is the one screen that renders for
 * a business without access.
 *
 * Call it in the layout AND in any server action that mutates data. A layout
 * guard does not protect a POST.
 */
export async function requireBusiness(): Promise<TenantCtx> {
  const { ctx, access } = await requireMembership();
  if (access !== 'ok') {
    redirect('/app/billing');
  }
  return ctx;
}

/**
 * Guard for `/admin`. Super admins see metadata and counts only (spec §6).
 *
 * The flag is read LIVE from the database, not from the session token. It is
 * on the JWT too, but a 30-day token would keep granting admin access for a
 * month after the flag was revoked — which is the wrong failure mode for the
 * one role that can suspend a paying customer's business.
 *
 * One indexed read by primary key, cached per request. The app layout uses it
 * too, only to decide whether to show the Admin panel link — a grant or a
 * revocation therefore shows up on the very next page, instead of whenever the
 * person next happens to log in.
 */
export const isSuperAdminLive = cache(async function isSuperAdminLive(
  userId: string,
): Promise<boolean> {
  const live = await findUserById(userId);
  return live?.isSuperAdmin ?? false;
});

export const requireSuperAdmin = cache(async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();

  if (!(await isSuperAdminLive(user.id))) {
    // Not a 403: an ordinary user should not learn that /admin exists at all.
    redirect('/app');
  }

  return { ...user, isSuperAdmin: true };
});

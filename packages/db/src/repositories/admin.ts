import { sql } from 'drizzle-orm';
import { getDb } from '../client';

/**
 * Super admin. Build spec §6:
 *
 *   "/admin/businesses/[id]  Metadata only — NEVER business transaction data"
 *
 * These functions are unscoped by tenant, which is the whole point, so the
 * boundary has to be in what they SELECT. An admin sees how many invoices a
 * shop has issued; they never see an invoice. No party names, no product names,
 * no amounts, no ledger. A support tool is not a reason to read a customer's
 * books.
 *
 * Every caller must be behind `requireSuperAdmin()`.
 */

export type AdminBusinessRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  stateCode: string;
  gstin: string | null;
  ownerName: string;
  ownerEmail: string;
  trialEndsAt: string | null;
  paidUntil: string | null;
  createdAt: string;
  /** Counts only — never the rows behind them. */
  invoiceCount: number;
  productCount: number;
  partyCount: number;
  lastInvoiceAt: string | null;
};

export async function listAllBusinesses(opts: { search?: string } = {}) {
  const search = opts.search?.trim();
  const rows = await getDb().execute<AdminBusinessRow>(sql`
    select
      b.id::text as "id", b.name, b.slug, b.status::text as "status",
      b.state_code as "stateCode", b.gstin,
      u.name as "ownerName", u.email as "ownerEmail",
      b.trial_ends_at::text as "trialEndsAt",
      b.paid_until::text as "paidUntil",
      b.created_at::text as "createdAt",
      (select count(*) from invoices i where i.business_id = b.id)::int as "invoiceCount",
      (select count(*) from products p where p.business_id = b.id)::int as "productCount",
      (select count(*) from parties pa where pa.business_id = b.id)::int as "partyCount",
      (select max(i.created_at)::text from invoices i where i.business_id = b.id)
        as "lastInvoiceAt"
    from businesses b
    join users u on u.id = b.owner_user_id
    ${
      search
        ? sql`where b.name ilike ${'%' + search + '%'} or u.email ilike ${'%' + search + '%'}
                 or b.slug ilike ${'%' + search + '%'}`
        : sql``
    }
    order by b.created_at desc
    limit 200
  `);
  return [...rows];
}

export type AdminStats = {
  businesses: number;
  trialing: number;
  paying: number;
  suspended: number;
  users: number;
  invoices: number;
  activeThisWeek: number;
};

/** Aggregates for the admin home. Counts only. */
export async function getAdminStats(): Promise<AdminStats> {
  const [row] = await getDb().execute<{
    businesses: number;
    trialing: number;
    paying: number;
    suspended: number;
    users: number;
    invoices: number;
    active_week: number;
  }>(sql`
    select
      (select count(*) from businesses)::int as businesses,
      (select count(*) from businesses
        where status = 'trial' and (trial_ends_at is null or trial_ends_at > now()))::int
        as trialing,
      (select count(*) from businesses
        where status = 'active' and (paid_until is null or paid_until > now()))::int as paying,
      (select count(*) from businesses where status = 'suspended')::int as suspended,
      (select count(*) from users)::int as users,
      (select count(*) from invoices where status = 'issued')::int as invoices,
      (select count(distinct business_id) from invoices
        where created_at > now() - interval '7 days')::int as active_week
  `);

  return {
    businesses: row?.businesses ?? 0,
    trialing: row?.trialing ?? 0,
    paying: row?.paying ?? 0,
    suspended: row?.suspended ?? 0,
    users: row?.users ?? 0,
    invoices: row?.invoices ?? 0,
    activeThisWeek: row?.active_week ?? 0,
  };
}

/**
 * Mark a business as paid.
 *
 * The manual half of the subscription model — payment happens outside the
 * product (spec §7 rules out in-app checkout), and someone flips this once it
 * lands. Phase 3 replaces it with Razorpay automation.
 */
export async function markBusinessPaid(businessId: string, adminUserId: string): Promise<void> {
  await getDb().execute(sql`
    update businesses
    set status = 'active',
        approved_at = now(),
        approved_by = ${adminUserId}::uuid,
        -- One month from whichever is later: today, or whatever they have
        -- left. Marking someone paid twice by mistake gives them two months
        -- rather than resetting them to one.
        paid_until = greatest(coalesce(paid_until, now()), now()) + interval '1 month'
    where id = ${businessId}::uuid
  `);
}

/**
 * Suspend or restore a business.
 *
 * Suspension is not a delete: the shop's data stays exactly where it is and
 * comes back untouched. `evaluateAccess()` locks them out of the app and the
 * catalog 404s, and that is all.
 */
export async function setBusinessSuspended(
  businessId: string,
  suspended: boolean,
): Promise<void> {
  await getDb().execute(sql`
    update businesses
    set status = ${suspended ? 'suspended' : 'active'}::business_status
    where id = ${businessId}::uuid
  `);
}

/** Extend a trial. For a shop that asks for a few more days. */
export async function extendTrial(businessId: string, days: number): Promise<void> {
  const capped = Math.max(1, Math.min(days, 90));
  await getDb().execute(sql`
    update businesses
    set status = 'trial',
        trial_ends_at = greatest(coalesce(trial_ends_at, now()), now())
                        + (${capped} || ' days')::interval
    where id = ${businessId}::uuid
  `);
}

// ------------------------------------------------------- admin accounts ----

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  /** Whether this admin also runs a shop of their own. */
  businessCount: number;
};

export async function listAdmins(): Promise<AdminUser[]> {
  const rows = await getDb().execute<AdminUser>(sql`
    select u.id::text as "id", u.name, u.email, u.created_at::text as "createdAt",
           (select count(*) from businesses b where b.owner_user_id = u.id)::int
             as "businessCount"
    from users u
    where u.is_super_admin = true
    order by u.created_at
  `);
  return [...rows];
}

export type GrantResult =
  | { ok: true; name: string; email: string }
  | { ok: false; reason: 'not_found' | 'already_admin' };

/**
 * Make an existing user a super admin, by email.
 *
 * Deliberately cannot create a user. There is no email delivery in this
 * product, so "invite by email" would mean writing a row nobody can ever log
 * into. The person signs up normally first, then gets promoted — which also
 * means they chose their own password and we never handled it.
 */
export async function grantAdminByEmail(email: string): Promise<GrantResult> {
  const normalised = email.trim().toLowerCase();

  const [existing] = await getDb().execute<{ id: string; name: string; is_super_admin: boolean }>(
    sql`select id::text, name, is_super_admin from users where email = ${normalised}`,
  );

  if (!existing) return { ok: false, reason: 'not_found' };
  if (existing.is_super_admin) return { ok: false, reason: 'already_admin' };

  await getDb().execute(
    sql`update users set is_super_admin = true where id = ${existing.id}::uuid`,
  );
  return { ok: true, name: existing.name, email: normalised };
}

/**
 * Remove someone's admin rights.
 *
 * Refuses to remove the LAST admin: an empty admin list means nobody can ever
 * grant it again, and the only way back would be a manual database edit. Also
 * refuses self-revocation, so a mis-click cannot lock you out of the panel you
 * are standing in.
 */
export type RevokeResult =
  | { ok: true }
  | { ok: false; reason: 'self' | 'last_admin' | 'not_found' };

export async function revokeAdmin(
  targetUserId: string,
  actingUserId: string,
): Promise<RevokeResult> {
  if (targetUserId === actingUserId) return { ok: false, reason: 'self' };

  const [counts] = await getDb().execute<{ total: number; exists: boolean }>(sql`
    select
      (select count(*) from users where is_super_admin = true)::int as total,
      exists(select 1 from users where id = ${targetUserId}::uuid and is_super_admin = true)
        as "exists"
  `);

  if (!counts?.exists) return { ok: false, reason: 'not_found' };
  if ((counts.total ?? 0) <= 1) return { ok: false, reason: 'last_admin' };

  await getDb().execute(
    sql`update users set is_super_admin = false where id = ${targetUserId}::uuid`,
  );
  return { ok: true };
}

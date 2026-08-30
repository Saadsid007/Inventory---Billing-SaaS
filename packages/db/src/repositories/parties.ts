import type { PartyType, TenantCtx } from '@billwise/shared';
import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { getDb, type Executor } from '../client';
import { parties } from '../schema/index';

/**
 * Customers and suppliers, and what they owe. Build spec Phase 1c.
 *
 * "Kisne kitna udhaar dena hai" is one of the five pains this product exists to
 * solve, so the balance arithmetic here matters as much as the tax engine.
 */

export type PartyFilters = {
  search?: string | undefined;
  type?: PartyType | undefined;
  includeInactive?: boolean | undefined;
  limit?: number;
  offset?: number;
};

export async function listParties(ctx: TenantCtx, filters: PartyFilters = {}) {
  const where = [eq(parties.businessId, ctx.businessId)];
  if (!filters.includeInactive) where.push(eq(parties.isActive, true));

  if (filters.type) {
    // A party marked 'both' must appear in the customer list AND the supplier
    // list — the same shop you buy from is often the one you sell to.
    where.push(
      filters.type === 'both'
        ? eq(parties.type, 'both')
        : inArray(parties.type, [filters.type, 'both']),
    );
  }

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      or(ilike(parties.name, term), ilike(parties.phone, term), ilike(parties.gstin, term))!,
    );
  }

  return getDb()
    .select()
    .from(parties)
    .where(and(...where))
    .orderBy(asc(parties.name))
    .limit(filters.limit ?? 200)
    .offset(filters.offset ?? 0);
}

export async function getParty(ctx: TenantCtx, partyId: string) {
  const [row] = await getDb()
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.businessId, ctx.businessId)))
    .limit(1);
  return row;
}

export type PartyInput = {
  type?: PartyType;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  pincode?: string | null;
  openingBalance?: string;
  customFields?: Record<string, unknown>;
};

export async function createParty(ctx: TenantCtx, input: PartyInput) {
  const [row] = await getDb()
    .insert(parties)
    .values({
      businessId: ctx.businessId,
      type: input.type ?? 'customer',
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      gstin: input.gstin?.trim().toUpperCase() || null,
      stateCode: input.stateCode ?? null,
      addressLine1: input.addressLine1 ?? null,
      city: input.city ?? null,
      pincode: input.pincode ?? null,
      openingBalance: input.openingBalance ?? '0',
      customFields: input.customFields ?? {},
    })
    .returning();
  return row;
}

export async function updateParty(ctx: TenantCtx, partyId: string, patch: Partial<PartyInput>) {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) values[key] = value;
  }
  if (Object.keys(values).length === 0) return;

  await getDb()
    .update(parties)
    .set(values)
    .where(and(eq(parties.id, partyId), eq(parties.businessId, ctx.businessId)));
}

/** Soft delete — invoices reference this party and their history must resolve. */
export async function deactivateParty(ctx: TenantCtx, partyId: string) {
  await getDb()
    .update(parties)
    .set({ isActive: false })
    .where(and(eq(parties.id, partyId), eq(parties.businessId, ctx.businessId)));
}

export type PartyBalance = {
  partyId: string;
  name: string;
  phone: string | null;
  openingBalance: string;
  invoicedTotal: string;
  paidIn: string;
  paidOut: string;
  /** Goods sent back, which reduce what they owe without any money moving. */
  returned: string;
  /** Positive means they owe the business. */
  outstanding: string;
};

/**
 * Outstanding per party. Build spec Phase 1c:
 *
 *   outstanding = opening_balance + sum(issued invoices) - sum(payments in)
 *
 * Two things that would quietly corrupt this if forgotten:
 *
 *  - Only `status = 'issued'` counts. Drafts are not owed, and cancelled
 *    invoices are not owed either — but cancelled ones keep their number, so
 *    filtering by "has a number" would wrongly include them.
 *  - Estimates and delivery challans are excluded. They are not accounting
 *    documents; nobody owes money for a quotation.
 *
 * The arithmetic runs in Postgres `numeric`, not JavaScript. Summing money in
 * JS floats is how a ledger ends up a rupee out over a few hundred invoices.
 */
export async function listPartyBalances(
  ctx: TenantCtx,
  tx: Executor = getDb(),
): Promise<PartyBalance[]> {
  const rows = await tx.execute<PartyBalance>(sql`
    with invoiced as (
      select party_id, sum(grand_total) total
      from invoices
      where business_id = ${ctx.businessId}::uuid
        and status = 'issued'
        and kind not in ('estimate', 'delivery_challan')
      group by party_id
    ),
    received as (
      select party_id,
             sum(case when direction = 'in'  then amount else 0 end) as paid_in,
             sum(case when direction = 'out' then amount else 0 end) as paid_out
      from payments
      where business_id = ${ctx.businessId}::uuid
      group by party_id
    ),
    -- Goods that came back. A return reduces what the customer owes exactly
    -- like a payment does, without any money having moved.
    returned as (
      select party_id, sum(total_amount) total
      from sales_returns
      where business_id = ${ctx.businessId}::uuid
      group by party_id
    )
    select
      p.id    as "partyId",
      p.name  as "name",
      p.phone as "phone",
      p.opening_balance::text                       as "openingBalance",
      coalesce(i.total, 0)::numeric(12,2)::text     as "invoicedTotal",
      coalesce(r.paid_in, 0)::numeric(12,2)::text   as "paidIn",
      coalesce(r.paid_out, 0)::numeric(12,2)::text  as "paidOut",
      coalesce(rt.total, 0)::numeric(12,2)::text    as "returned",
      (p.opening_balance
        + coalesce(i.total, 0)
        - coalesce(r.paid_in, 0)
        + coalesce(r.paid_out, 0)
        - coalesce(rt.total, 0))::numeric(12,2)::text as "outstanding"
    from parties p
    left join invoiced i on i.party_id = p.id
    left join received r on r.party_id = p.id
    left join returned rt on rt.party_id = p.id
    where p.business_id = ${ctx.businessId}::uuid
      and p.is_active = true
    order by (p.opening_balance
        + coalesce(i.total, 0)
        - coalesce(rt.total, 0)
        - coalesce(r.paid_in, 0)
        + coalesce(r.paid_out, 0)) desc
  `);
  return [...rows];
}

export async function getPartyBalance(
  ctx: TenantCtx,
  partyId: string,
): Promise<PartyBalance | undefined> {
  const all = await listPartyBalances(ctx);
  return all.find((b) => b.partyId === partyId);
}

export type LedgerEntry = {
  kind: 'invoice' | 'payment' | 'return';
  id: string;
  date: string;
  label: string;
  /** Positive increases what they owe, negative reduces it. */
  amount: string;
  reference: string | null;
};

/**
 * One party's transactions, oldest first, for a running-balance view.
 *
 * Cancelled invoices ARE included, with a zero amount. Leaving them out makes
 * the ledger look like an invoice vanished — which is exactly the accusation
 * a cancellation invites.
 */
export async function listPartyLedger(
  ctx: TenantCtx,
  partyId: string,
): Promise<LedgerEntry[]> {
  const rows = await getDb().execute<LedgerEntry>(sql`
    select 'invoice' as kind,
           i.id::text as id,
           i.invoice_date::text as date,
           (i.kind::text || ' ' || coalesce(i.invoice_no, 'draft')
             || case when i.status = 'cancelled' then ' (cancelled)' else '' end) as label,
           (case when i.status = 'issued' then i.grand_total else 0 end)::numeric(12,2)::text
             as amount,
           i.invoice_no as reference
    from invoices i
    where i.business_id = ${ctx.businessId}::uuid
      and i.party_id = ${partyId}::uuid
      and i.status <> 'draft'
      and i.kind not in ('estimate', 'delivery_challan')

    union all

    select 'payment' as kind,
           p.id::text,
           p.paid_on::text,
           ('Payment ' || p.method) as label,
           (case when p.direction = 'in' then -p.amount else p.amount end)::numeric(12,2)::text,
           p.reference
    from payments p
    where p.business_id = ${ctx.businessId}::uuid
      and p.party_id = ${partyId}::uuid

    union all

    select 'return' as kind,
           r.id::text,
           r.return_date::text,
           ('Return' || coalesce(' against ' || i.invoice_no, '')) as label,
           (-r.total_amount)::numeric(12,2)::text,
           i.invoice_no as reference
    from sales_returns r
    left join invoices i on i.id = r.invoice_id
    where r.business_id = ${ctx.businessId}::uuid
      and r.party_id = ${partyId}::uuid

    order by date asc, kind desc
  `);
  return [...rows];
}

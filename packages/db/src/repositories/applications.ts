import {
  type ApplicationStatus,
  OPEN_APPLICATION_STATUSES,
  type TenantCtx,
} from '@billwise/shared';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { serviceApplications } from '../schema/index';

/**
 * Work in hand at a Jan Seva Kendra. Every function is scoped by `ctx`, like
 * every other repository — see businesses.ts for why that is not optional.
 */

export type ApplicationInput = {
  partyId?: string | null;
  partyName?: string | null;
  partyPhone?: string | null;
  invoiceId?: string | null;
  serviceId?: string | null;
  serviceName: string;
  status?: ApplicationStatus;
  referenceNo?: string | null;
  appliedOn: string;
  expectedOn?: string | null;
  documentsHeld?: string | null;
  note?: string | null;
};

export async function createApplication(ctx: TenantCtx, input: ApplicationInput) {
  const [row] = await getDb()
    .insert(serviceApplications)
    .values({
      businessId: ctx.businessId,
      partyId: input.partyId ?? null,
      partyName: input.partyName ?? null,
      partyPhone: input.partyPhone ?? null,
      invoiceId: input.invoiceId ?? null,
      serviceId: input.serviceId ?? null,
      serviceName: input.serviceName.trim(),
      status: input.status ?? 'applied',
      referenceNo: input.referenceNo?.trim() || null,
      appliedOn: input.appliedOn,
      expectedOn: input.expectedOn ?? null,
      documentsHeld: input.documentsHeld?.trim() || null,
      note: input.note?.trim() || null,
      createdBy: ctx.userId,
    })
    .returning();
  return row;
}

export type ApplicationPatch = Partial<
  Pick<
    ApplicationInput,
    'status' | 'referenceNo' | 'expectedOn' | 'documentsHeld' | 'note' | 'serviceName'
  >
> & { deliveredOn?: string | null };

/**
 * Update a job.
 *
 * Moving to `delivered` stamps the date automatically unless one was given —
 * nobody at a counter is going to type today's date to hand over a card, and a
 * delivered job with no delivery date makes the register useless later.
 */
export async function updateApplication(
  ctx: TenantCtx,
  applicationId: string,
  patch: ApplicationPatch,
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (patch.status !== undefined) values['status'] = patch.status;
  if (patch.referenceNo !== undefined) values['referenceNo'] = patch.referenceNo?.trim() || null;
  if (patch.expectedOn !== undefined) values['expectedOn'] = patch.expectedOn || null;
  if (patch.documentsHeld !== undefined) {
    values['documentsHeld'] = patch.documentsHeld?.trim() || null;
  }
  if (patch.note !== undefined) values['note'] = patch.note?.trim() || null;
  if (patch.serviceName !== undefined) values['serviceName'] = patch.serviceName.trim();

  if (patch.deliveredOn !== undefined) {
    values['deliveredOn'] = patch.deliveredOn || null;
  } else if (patch.status === 'delivered') {
    values['deliveredOn'] = sql`(now() at time zone 'Asia/Kolkata')::date`;
  }

  if (Object.keys(values).length === 0) return;

  await getDb()
    .update(serviceApplications)
    .set(values)
    .where(
      and(
        eq(serviceApplications.id, applicationId),
        eq(serviceApplications.businessId, ctx.businessId),
      ),
    );
}

export async function deleteApplication(ctx: TenantCtx, applicationId: string): Promise<void> {
  await getDb()
    .delete(serviceApplications)
    .where(
      and(
        eq(serviceApplications.id, applicationId),
        eq(serviceApplications.businessId, ctx.businessId),
      ),
    );
}

export type ApplicationRow = {
  id: string;
  serviceName: string;
  partyId: string | null;
  partyName: string | null;
  partyPhone: string | null;
  invoiceId: string | null;
  invoiceNo: string | null;
  status: ApplicationStatus;
  referenceNo: string | null;
  appliedOn: string;
  expectedOn: string | null;
  deliveredOn: string | null;
  documentsHeld: string | null;
  note: string | null;
  /** What is still owed on the receipt this was billed on. Zero when unbilled. */
  balance: string;
  /** Past its promised date and not finished. Drives the red count. */
  isOverdue: boolean;
};

export type ApplicationFilters = {
  status?: ApplicationStatus | undefined;
  /** Everything not yet handed over or rejected. */
  openOnly?: boolean | undefined;
  search?: string | undefined;
  partyId?: string | undefined;
  limit?: number;
};

/**
 * The work register.
 *
 * Joins the receipt so the list can show what is still owed beside each job —
 * the two questions at the counter are "is it ready?" and "how much is left?",
 * and answering them from one screen is the point.
 */
export async function listApplications(
  ctx: TenantCtx,
  filters: ApplicationFilters = {},
): Promise<ApplicationRow[]> {
  const where = [sql`a.business_id = ${ctx.businessId}::uuid`];

  if (filters.status) where.push(sql`a.status = ${filters.status}`);
  else if (filters.openOnly) {
    where.push(sql`a.status in ${sql.raw(`('${OPEN_APPLICATION_STATUSES.join("','")}')`)}`);
  }
  if (filters.partyId) where.push(sql`a.party_id = ${filters.partyId}::uuid`);
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      sql`(a.service_name ilike ${term} or a.party_name ilike ${term}
           or a.reference_no ilike ${term} or a.party_phone ilike ${term})`,
    );
  }

  const rows = await getDb().execute<ApplicationRow>(sql`
    select a.id::text                as "id",
           a.service_name            as "serviceName",
           a.party_id::text          as "partyId",
           coalesce(a.party_name, p.name) as "partyName",
           coalesce(a.party_phone, p.phone) as "partyPhone",
           a.invoice_id::text        as "invoiceId",
           i.invoice_no              as "invoiceNo",
           a.status                  as "status",
           a.reference_no            as "referenceNo",
           a.applied_on::text        as "appliedOn",
           a.expected_on::text       as "expectedOn",
           a.delivered_on::text      as "deliveredOn",
           a.documents_held          as "documentsHeld",
           a.note                    as "note",
           coalesce((i.grand_total - i.amount_paid), 0)::numeric(12,2)::text as "balance",
           (a.expected_on is not null
             and a.expected_on < (now() at time zone 'Asia/Kolkata')::date
             and a.status in ('applied', 'in_process')) as "isOverdue"
    from service_applications a
    left join parties p  on p.id = a.party_id
    left join invoices i on i.id = a.invoice_id
    where ${sql.join(where, sql` and `)}
    order by
      -- Anything late floats to the top; then the newest work.
      (a.expected_on is not null
        and a.expected_on < (now() at time zone 'Asia/Kolkata')::date
        and a.status in ('applied', 'in_process')) desc,
      a.applied_on desc,
      a.created_at desc
    limit ${filters.limit ?? 200}
  `);
  return [...rows];
}

export async function getApplication(
  ctx: TenantCtx,
  applicationId: string,
): Promise<ApplicationRow | undefined> {
  const [row] = await getDb()
    .select({ id: serviceApplications.id })
    .from(serviceApplications)
    .where(
      and(
        eq(serviceApplications.id, applicationId),
        eq(serviceApplications.businessId, ctx.businessId),
      ),
    )
    .limit(1);
  if (!row) return undefined;

  const all = await listApplications(ctx, { limit: 1000 });
  return all.find((a) => a.id === applicationId);
}

/** Everything booked against one receipt, so the bill can list the work. */
export async function listApplicationsForInvoice(ctx: TenantCtx, invoiceId: string) {
  return getDb()
    .select()
    .from(serviceApplications)
    .where(
      and(
        eq(serviceApplications.businessId, ctx.businessId),
        eq(serviceApplications.invoiceId, invoiceId),
      ),
    )
    .orderBy(desc(serviceApplications.createdAt));
}

export type ApplicationCounts = {
  open: number;
  ready: number;
  overdue: number;
  deliveredThisMonth: number;
};

/** The four numbers on the Jan Seva dashboard, in one round trip. */
export async function getApplicationCounts(ctx: TenantCtx): Promise<ApplicationCounts> {
  const [row] = await getDb().execute<{
    open: number;
    ready: number;
    overdue: number;
    delivered_month: number;
  }>(sql`
    with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
    select
      count(*) filter (where status in ('applied','in_process','ready'))::int as open,
      count(*) filter (where status = 'ready')::int as ready,
      count(*) filter (
        where status in ('applied','in_process')
          and expected_on is not null
          and expected_on < (select d from today))::int as overdue,
      count(*) filter (
        where status = 'delivered'
          and delivered_on >= date_trunc('month', (select d from today)))::int as delivered_month
    from service_applications
    where business_id = ${ctx.businessId}::uuid
  `);

  return {
    open: row?.open ?? 0,
    ready: row?.ready ?? 0,
    overdue: row?.overdue ?? 0,
    deliveredThisMonth: row?.delivered_month ?? 0,
  };
}

/** Bulk status change from the work list — "mark these three delivered". */
export async function setApplicationStatus(
  ctx: TenantCtx,
  ids: readonly string[],
  status: ApplicationStatus,
): Promise<void> {
  if (ids.length === 0) return;
  await getDb()
    .update(serviceApplications)
    .set({
      status,
      ...(status === 'delivered'
        ? { deliveredOn: sql`(now() at time zone 'Asia/Kolkata')::date` }
        : {}),
    })
    .where(
      and(
        eq(serviceApplications.businessId, ctx.businessId),
        inArray(serviceApplications.id, [...ids]),
      ),
    );
}

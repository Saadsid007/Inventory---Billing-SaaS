import type { InvoiceKind, TenantCtx } from '@billwise/shared';
import { sql } from 'drizzle-orm';
import type { Executor } from '../client';

/**
 * Gapless invoice numbering — the locking half. Build spec §5.1.
 *
 * ## Why not a Postgres SEQUENCE
 *
 * Sequences do not roll back. If a transaction takes number 42 and then fails,
 * 42 is burned and the series jumps 41 → 43. A gap in a GST invoice series is a
 * compliance problem you get to explain to an officer, so the counter has to be
 * an ordinary row that rolls back with everything else.
 *
 * ## Why an upsert instead of the spec's SELECT ... FOR UPDATE
 *
 * The spec's pseudocode is `SELECT … FOR UPDATE`, then `INSERT` if the row is
 * missing. That has a race on the very first invoice of a series: two
 * concurrent issues both find nothing, both try to insert, and one fails — or
 * worse, under READ COMMITTED the loser re-selects, still cannot see the
 * winner's uncommitted row, and spins.
 *
 * `INSERT … ON CONFLICT DO UPDATE` collapses that into one atomic statement. It
 * takes the same row lock, so concurrent issues serialise exactly as intended,
 * and `RETURNING` gives the post-update value — from which the allocated number
 * is always `next_number - 1`, on both the insert path (1 → 2) and the update
 * path (n → n+1).
 *
 * ## This function does not format the number
 *
 * It returns the raw counter plus the series shape. Turning that into `INV-007`
 * is `formatInvoiceNumber()` in `@billwise/core`, because `packages/db` is only
 * allowed to depend on `@billwise/shared` (spec §2.5 dependency rules) — and
 * because string formatting has no business being untestable behind a database.
 *
 * ## Caller's obligation
 *
 * MUST be called inside the same transaction that sets `invoices.invoice_no`
 * and `status = 'issued'`. Called outside one, a later failure leaves the
 * counter advanced and the number unused — reintroducing the exact gap this
 * function exists to prevent.
 */

export type AllocatedNumber = {
  /** The raw counter value. Format it with `formatInvoiceNumber` from core. */
  number: number;
  prefix: string;
  padding: number;
};

export type AllocateArgs = {
  kind: InvoiceKind;
  /** Financial year, derived from the INVOICE DATE, not from today. */
  fy: string;
  /** Applied only when the series is created. Ignored if it already exists. */
  defaultPrefix?: string;
  defaultPadding?: number;
};

export async function allocateInvoiceNumber(
  ctx: TenantCtx,
  tx: Executor,
  args: AllocateArgs,
): Promise<AllocatedNumber> {
  const rows = await tx.execute<{ allocated: number; prefix: string; padding: number }>(sql`
    insert into invoice_series (business_id, kind, fy, prefix, padding, next_number)
    values (
      ${ctx.businessId}::uuid,
      ${args.kind}::invoice_kind,
      ${args.fy},
      ${args.defaultPrefix ?? ''},
      ${args.defaultPadding ?? 3},
      2
    )
    on conflict (business_id, kind, fy)
      do update set next_number = invoice_series.next_number + 1
    returning
      (invoice_series.next_number - 1)::int as allocated,
      invoice_series.prefix,
      invoice_series.padding
  `);

  const row = rows[0];
  if (!row) {
    throw new Error(
      `Could not allocate an invoice number for ${args.kind} ${args.fy}. ` +
        'This should be impossible — the upsert always returns a row.',
    );
  }

  return { number: row.allocated, prefix: row.prefix, padding: row.padding };
}

export type SeriesRow = {
  id: string;
  kind: InvoiceKind;
  fy: string;
  prefix: string;
  nextNumber: number;
  padding: number;
};

/** Every series this business has used. Backs the settings screen. */
export async function listSeries(ctx: TenantCtx, tx: Executor): Promise<SeriesRow[]> {
  const rows = await tx.execute<SeriesRow>(sql`
    select id, kind, fy, prefix, next_number as "nextNumber", padding
    from invoice_series
    where business_id = ${ctx.businessId}::uuid
    order by fy desc, kind
  `);
  return [...rows];
}

/**
 * Change a series' prefix or padding.
 *
 * Deliberately does NOT allow editing `next_number`. Letting a user rewind the
 * counter would produce two invoices sharing a number, which is worse than any
 * problem it might solve. Cosmetic changes only — already-issued invoices keep
 * the number they were snapshotted with.
 */
export async function updateSeriesShape(
  ctx: TenantCtx,
  tx: Executor,
  args: { kind: InvoiceKind; fy: string; prefix: string; padding: number },
): Promise<void> {
  await tx.execute(sql`
    update invoice_series
    set prefix = ${args.prefix}, padding = ${args.padding}
    where business_id = ${ctx.businessId}::uuid
      and kind = ${args.kind}::invoice_kind
      and fy = ${args.fy}
  `);
}

import {
  type InvoiceKind,
  type InvoiceStatus,
  NON_ACCOUNTING_INVOICE_KINDS,
  type PaymentMethod,
  type TaxMode,
  type TenantCtx,
} from '@billwise/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb, type Executor } from '../client';
import {
  invoiceAudit,
  invoiceLines,
  invoices,
  payments,
  stockMovements,
} from '../schema/index';
import { allocateInvoiceNumber } from './numbering';
import { recordMovement } from './stock';

/**
 * Invoices. Build spec §4, §5.1, §5.4, Phase 1d.
 *
 * This file owns the transactions. The *decisions* — what tax is due, what the
 * number looks like — are made by pure functions in `@billwise/core` and
 * arrive here already computed, because `packages/db` may only depend on
 * `@billwise/shared` (spec §2.5).
 *
 * Where a formatted number is needed, the formatter is injected as a callback
 * rather than imported. Same reason.
 */

export type InvoiceLineInput = {
  productId?: string | null;
  /** Snapshot. Never re-read from `products` when printing. */
  name: string;
  hsnCode?: string | null;
  unit?: string | null;
  qty: string;
  rate: string;
  discountPct?: string;
  discountAmount?: string;
  taxableValue: string;
  taxRate: string;
  cessRate?: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  cessAmount: string;
  lineTotal: string;
};

export type InvoiceInput = {
  kind: InvoiceKind;
  fy: string;
  invoiceDate: string;
  dueDate?: string | null;

  partyId?: string | null;
  partyName: string;
  partyGstin?: string | null;
  partyPhone?: string | null;
  partyAddress?: string | null;

  supplierStateCode: string;
  placeOfSupply: string;
  isInterstate: boolean;

  taxMode: TaxMode;
  subtotal: string;
  discountTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  cessTotal: string;
  otherCharges: string;
  roundOff: string;
  grandTotal: string;

  notes?: string | null;
  terms?: string | null;
  lines: readonly InvoiceLineInput[];
};

// ------------------------------------------------------------- reads ------

export type InvoiceFilters = {
  from?: string | undefined;
  to?: string | undefined;
  partyId?: string | undefined;
  kind?: InvoiceKind | undefined;
  status?: InvoiceStatus | undefined;
  paymentStatus?: 'unpaid' | 'partial' | 'paid' | undefined;
  search?: string | undefined;
  limit?: number;
  offset?: number;
};

export async function listInvoices(ctx: TenantCtx, filters: InvoiceFilters = {}) {
  const where = [eq(invoices.businessId, ctx.businessId)];
  if (filters.from) where.push(sql`${invoices.invoiceDate} >= ${filters.from}`);
  if (filters.to) where.push(sql`${invoices.invoiceDate} <= ${filters.to}`);
  if (filters.partyId) where.push(eq(invoices.partyId, filters.partyId));
  if (filters.kind) where.push(eq(invoices.kind, filters.kind));
  if (filters.status) where.push(eq(invoices.status, filters.status));
  if (filters.paymentStatus) where.push(eq(invoices.paymentStatus, filters.paymentStatus));
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    where.push(sql`(${invoices.invoiceNo} ilike ${term} or ${invoices.partyName} ilike ${term})`);
  }

  return getDb()
    .select({
      id: invoices.id,
      kind: invoices.kind,
      status: invoices.status,
      invoiceNo: invoices.invoiceNo,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      partyId: invoices.partyId,
      partyName: invoices.partyName,
      grandTotal: invoices.grandTotal,
      amountPaid: invoices.amountPaid,
      paymentStatus: invoices.paymentStatus,
    })
    .from(invoices)
    .where(and(...where))
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);
}

export async function getInvoice(ctx: TenantCtx, invoiceId: string) {
  const [head] = await getDb()
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, ctx.businessId)))
    .limit(1);
  if (!head) return undefined;

  const lines = await getDb()
    .select()
    .from(invoiceLines)
    .where(
      and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.businessId, ctx.businessId)),
    )
    .orderBy(invoiceLines.lineNo);

  return { ...head, lines };
}

// ------------------------------------------------------------ writes ------

/** Create a draft. No number is assigned and no stock moves — that is `issue`. */
export async function createDraft(ctx: TenantCtx, input: InvoiceInput) {
  return getDb().transaction(async (tx) => {
    const [head] = await tx
      .insert(invoices)
      .values({
        businessId: ctx.businessId,
        kind: input.kind,
        status: 'draft',
        fy: input.fy,
        invoiceNo: null,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate ?? null,
        partyId: input.partyId ?? null,
        partyName: input.partyName,
        partyGstin: input.partyGstin ?? null,
        partyPhone: input.partyPhone ?? null,
        partyAddress: input.partyAddress ?? null,
        supplierStateCode: input.supplierStateCode,
        placeOfSupply: input.placeOfSupply,
        isInterstate: input.isInterstate,
        taxMode: input.taxMode,
        subtotal: input.subtotal,
        discountTotal: input.discountTotal,
        cgstTotal: input.cgstTotal,
        sgstTotal: input.sgstTotal,
        igstTotal: input.igstTotal,
        cessTotal: input.cessTotal,
        otherCharges: input.otherCharges,
        roundOff: input.roundOff,
        grandTotal: input.grandTotal,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        createdBy: ctx.userId,
      })
      .returning();

    await insertLines(tx, ctx, head!.id, input.lines);
    await writeAudit(tx, ctx, head!.id, 'created', null);
    return head!;
  });
}

async function insertLines(
  tx: Executor,
  ctx: TenantCtx,
  invoiceId: string,
  lines: readonly InvoiceLineInput[],
) {
  if (lines.length === 0) return;
  await tx.insert(invoiceLines).values(
    lines.map((l, i) => ({
      businessId: ctx.businessId,
      invoiceId,
      lineNo: i + 1,
      productId: l.productId ?? null,
      name: l.name,
      hsnCode: l.hsnCode ?? null,
      unit: l.unit ?? null,
      qty: l.qty,
      rate: l.rate,
      discountPct: l.discountPct ?? '0',
      discountAmount: l.discountAmount ?? '0',
      taxableValue: l.taxableValue,
      taxRate: l.taxRate,
      cessRate: l.cessRate ?? '0',
      cgstAmount: l.cgstAmount,
      sgstAmount: l.sgstAmount,
      igstAmount: l.igstAmount,
      cessAmount: l.cessAmount,
      lineTotal: l.lineTotal,
    })),
  );
}

/** Replace a draft's contents. Refuses to touch anything already issued. */
export async function updateDraft(ctx: TenantCtx, invoiceId: string, input: InvoiceInput) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx
      .select({ status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, ctx.businessId)))
      .for('update')
      .limit(1);

    if (!current) throw new InvoiceNotFoundError(invoiceId);
    if (current.status !== 'draft') {
      // Spec §5.4: editing an issued invoice means reversing and rewriting
      // stock movements. Phase 1 takes the safe option — cancel and re-create.
      throw new InvoiceNotEditableError(current.status);
    }

    await tx
      .update(invoices)
      .set({
        kind: input.kind,
        fy: input.fy,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate ?? null,
        partyId: input.partyId ?? null,
        partyName: input.partyName,
        partyGstin: input.partyGstin ?? null,
        partyPhone: input.partyPhone ?? null,
        partyAddress: input.partyAddress ?? null,
        supplierStateCode: input.supplierStateCode,
        placeOfSupply: input.placeOfSupply,
        isInterstate: input.isInterstate,
        taxMode: input.taxMode,
        subtotal: input.subtotal,
        discountTotal: input.discountTotal,
        cgstTotal: input.cgstTotal,
        sgstTotal: input.sgstTotal,
        igstTotal: input.igstTotal,
        cessTotal: input.cessTotal,
        otherCharges: input.otherCharges,
        roundOff: input.roundOff,
        grandTotal: input.grandTotal,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, ctx.businessId)));

    await tx
      .delete(invoiceLines)
      .where(
        and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.businessId, ctx.businessId)),
      );
    await insertLines(tx, ctx, invoiceId, input.lines);
    await writeAudit(tx, ctx, invoiceId, 'edited', null);
  });
}

export class InvoiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Invoice ${id} not found for this business.`);
    this.name = 'InvoiceNotFoundError';
  }
}

export class InvoiceNotEditableError extends Error {
  constructor(status: string) {
    super(`An invoice with status '${status}' cannot be edited. Cancel and re-create it.`);
    this.name = 'InvoiceNotEditableError';
  }
}

export type IssueResult = { invoiceNo: string; number: number };

/**
 * Issue a draft. Build spec §5.1 and §5.4.
 *
 * One transaction does all three things, and it has to:
 *
 *   1. allocate the next number in the series (row-locked, gapless)
 *   2. stamp it on the invoice and flip status to 'issued'
 *   3. write one negative stock movement per line
 *
 * If any part fails, the whole thing rolls back — including the counter, which
 * is why it is a row and not a SEQUENCE. A number handed out for an invoice
 * that was never issued is a permanent gap in a GST series.
 *
 * `formatNumber` is injected rather than imported so this package keeps its
 * single dependency on `@billwise/shared`. Pass `formatInvoiceNumber` from
 * `@billwise/core`.
 */
export async function issueInvoice(
  ctx: TenantCtx,
  args: {
    invoiceId: string;
    formatNumber: (shape: { prefix: string; padding: number }, n: number) => string;
  },
): Promise<IssueResult> {
  return getDb().transaction(async (tx) => {
    const [head] = await tx
      .select({
        id: invoices.id,
        kind: invoices.kind,
        fy: invoices.fy,
        status: invoices.status,
      })
      .from(invoices)
      .where(and(eq(invoices.id, args.invoiceId), eq(invoices.businessId, ctx.businessId)))
      .for('update')
      .limit(1);

    if (!head) throw new InvoiceNotFoundError(args.invoiceId);
    if (head.status !== 'draft') {
      throw new InvoiceNotEditableError(head.status);
    }

    const allocated = await allocateInvoiceNumber(ctx, tx, { kind: head.kind, fy: head.fy });
    const invoiceNo = args.formatNumber(
      { prefix: allocated.prefix, padding: allocated.padding },
      allocated.number,
    );

    await tx
      .update(invoices)
      .set({ invoiceNo, status: 'issued' })
      .where(eq(invoices.id, args.invoiceId));

    // Estimates and delivery challans do not move stock: they are not
    // accounting documents, and a quotation that silently decrements inventory
    // would have shopkeepers chasing stock that never left.
    if (!NON_ACCOUNTING_INVOICE_KINDS.includes(head.kind)) {
      const lines = await tx
        .select({ productId: invoiceLines.productId, qty: invoiceLines.qty })
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, args.invoiceId));

      for (const line of lines) {
        if (!line.productId) continue; // ad-hoc line, nothing to decrement
        await recordMovement(ctx, tx, {
          productId: line.productId,
          qtyChange: `-${line.qty}`,
          reason: 'sale',
          refType: 'invoice',
          refId: args.invoiceId,
        });
      }
    }

    await writeAudit(tx, ctx, args.invoiceId, 'issued', { invoiceNo });
    return { invoiceNo, number: allocated.number };
  });
}

/**
 * Cancel an issued invoice. Build spec §5.1 and §5.4.
 *
 * The invoice KEEPS its number. Never reused, never deleted — a missing number
 * in a GST series looks exactly like a hidden sale, and "we deleted it" is not
 * an answer anyone wants to give.
 *
 * Stock is restored by writing equal and opposite movements with reason
 * `sale_cancelled`, not by removing the originals. The ledger has to keep
 * explaining what happened.
 */
export async function cancelInvoice(
  ctx: TenantCtx,
  args: { invoiceId: string; reason: string },
): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [head] = await tx
      .select({ id: invoices.id, kind: invoices.kind, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, args.invoiceId), eq(invoices.businessId, ctx.businessId)))
      .for('update')
      .limit(1);

    if (!head) throw new InvoiceNotFoundError(args.invoiceId);
    if (head.status !== 'issued') {
      throw new Error(`Only an issued invoice can be cancelled (this one is '${head.status}').`);
    }

    await tx
      .update(invoices)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: args.reason,
        // invoiceNo deliberately untouched.
      })
      .where(eq(invoices.id, args.invoiceId));

    // Reverse exactly what was recorded, rather than recomputing from lines —
    // if a line was somehow skipped on issue, un-skipping it now would put
    // stock back that never left.
    const original = await tx
      .select({ productId: stockMovements.productId, qtyChange: stockMovements.qtyChange })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.businessId, ctx.businessId),
          eq(stockMovements.refType, 'invoice'),
          eq(stockMovements.refId, args.invoiceId),
          eq(stockMovements.reason, 'sale'),
        ),
      );

    for (const m of original) {
      await recordMovement(ctx, tx, {
        productId: m.productId,
        qtyChange: negate(m.qtyChange),
        reason: 'sale_cancelled',
        refType: 'invoice',
        refId: args.invoiceId,
        note: args.reason,
      });
    }

    await writeAudit(tx, ctx, args.invoiceId, 'cancelled', { reason: args.reason });
  });
}

function negate(value: string): string {
  return value.startsWith('-') ? value.slice(1) : `-${value}`;
}

// ---------------------------------------------------------- payments ------

export type PaymentInput = {
  invoiceId?: string | null;
  partyId?: string | null;
  amount: string;
  direction: 'in' | 'out';
  method: PaymentMethod;
  reference?: string | null;
  paidOn: string;
  note?: string | null;
};

/**
 * Record a payment and refresh the invoice's paid total.
 *
 * `amount_paid` and `payment_status` are recomputed from the payments table
 * rather than incremented, so a deleted or corrected payment cannot leave them
 * drifting. Same principle as `current_stock`: the rows are the truth, the
 * column is a cache.
 */
export async function recordPayment(ctx: TenantCtx, input: PaymentInput): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.insert(payments).values({
      businessId: ctx.businessId,
      partyId: input.partyId ?? null,
      invoiceId: input.invoiceId ?? null,
      amount: input.amount,
      direction: input.direction,
      method: input.method,
      reference: input.reference ?? null,
      paidOn: input.paidOn,
      note: input.note ?? null,
      createdBy: ctx.userId,
    });

    if (input.invoiceId) {
      await refreshPaymentStatus(ctx, tx, input.invoiceId);
    }
  });
}

export async function refreshPaymentStatus(
  ctx: TenantCtx,
  tx: Executor,
  invoiceId: string,
): Promise<void> {
  await tx.execute(sql`
    update invoices i
    set amount_paid = p.paid,
        payment_status = case
          when p.paid <= 0             then 'unpaid'::payment_status
          when p.paid >= i.grand_total then 'paid'::payment_status
          else 'partial'::payment_status
        end
    from (
      select coalesce(sum(case when direction = 'in' then amount else -amount end), 0) as paid
      from payments
      where business_id = ${ctx.businessId}::uuid and invoice_id = ${invoiceId}::uuid
    ) p
    where i.id = ${invoiceId}::uuid and i.business_id = ${ctx.businessId}::uuid
  `);
}

// ------------------------------------------------------------- audit ------

async function writeAudit(
  tx: Executor,
  ctx: TenantCtx,
  invoiceId: string,
  action: 'created' | 'issued' | 'edited' | 'cancelled',
  snapshot: unknown,
): Promise<void> {
  await tx.insert(invoiceAudit).values({
    businessId: ctx.businessId,
    invoiceId,
    action,
    changedBy: ctx.userId,
    snapshot: snapshot ?? null,
  });
}

'use server';

import { buildInvoice, formatInvoiceNumber } from '@billwise/core';
import {
  cancelInvoice,
  createDraft,
  createParty,
  ensureReceiptToken,
  getBusiness,
  getInvoice,
  getParty,
  issueInvoice,
  listReturnsForInvoice,
  recordPayment,
  recordSalesReturn,
  updateDraft,
} from '@billwise/db';
import {
  appOrigin,
  cancelInvoiceSchema,
  invoiceInputSchema,
  partySchema,
  paymentInputSchema,
  receiptShareMessage,
  salesReturnSchema,
  whatsappShareUrl,
} from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { indianDate } from '@/lib/csv';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';

/**
 * Invoice actions. Build spec §2.5 hard rule 4: validate with a shared schema,
 * call core and the repositories, format a response. No arithmetic here.
 *
 * The client never sends totals. It sends what a person typed; `buildInvoice`
 * in `@billwise/core` recomputes every figure server-side. A browser must not
 * be able to decide what a customer owes.
 */

export type InvoiceActionResult =
  | { ok: true; invoiceId: string; invoiceNo?: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveInvoiceDraftAction(
  raw: unknown,
  invoiceId?: string,
): Promise<InvoiceActionResult> {
  const ctx = await requireBusiness();

  const parsed = invoiceInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const input = parsed.data;

  const business = await getBusiness(ctx);
  if (!business) return { ok: false, formError: 'Could not load your business profile.' };

  // The party's state comes from the stored record, not from the form — a
  // client that posts its own state code could flip IGST to CGST/SGST.
  const party = input.partyId ? await getParty(ctx, input.partyId) : undefined;

  const built = buildInvoice({
    kind: input.kind,
    invoiceDate: input.invoiceDate,
    taxMode: input.taxMode,
    supplierStateCode: business.stateCode,
    partyStateCode: party?.stateCode,
    partyGstin: party?.gstin ?? input.partyGstin,
    placeOfSupplyOverride: input.placeOfSupply,
    otherCharges: input.otherCharges,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      hsnCode: l.hsnCode,
      unit: l.unit,
      qty: l.qty,
      rate: l.rate,
      discountPct: l.discountPct,
      discountAmount: l.discountAmount,
      taxRate: l.taxRate,
      cessRate: l.cessRate,
    })),
  });

  const record = {
    kind: input.kind,
    fy: built.fy,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate ?? null,
    partyId: input.partyId ?? null,
    partyName: input.partyName,
    partyGstin: party?.gstin ?? input.partyGstin ?? null,
    partyPhone: party?.phone ?? input.partyPhone ?? null,
    partyAddress: input.partyAddress ?? null,
    supplierStateCode: business.stateCode,
    placeOfSupply: built.placeOfSupply,
    isInterstate: built.isInterstate,
    taxMode: input.taxMode,
    subtotal: built.subtotal,
    discountTotal: built.discountTotal,
    cgstTotal: built.cgstTotal,
    sgstTotal: built.sgstTotal,
    igstTotal: built.igstTotal,
    cessTotal: built.cessTotal,
    otherCharges: built.otherCharges,
    roundOff: built.roundOff,
    grandTotal: built.grandTotal,
    notes: input.notes ?? null,
    terms: input.terms ?? null,
    /*
     * Batch details put back onto the computed lines.
     *
     * `buildInvoice` lives in `@billwise/core` and deals only in money — it has
     * no reason to know a lot number, and giving it one would put pharmacy
     * concepts inside the tax engine every vertical shares. So it computes, and
     * the three fields it does not care about are reattached here.
     *
     * By index, because `buildInvoice` maps one output line per input line in
     * order. Asserted rather than assumed: if that ever stops being true, a
     * silent mismatch would attach batch numbers to the wrong medicines on a
     * printed bill, which is the worst possible way to find out.
     */
    lines: built.lines.map((line, i) => {
      const source = input.lines[i];
      return {
        ...line,
        batchId: source?.batchId ?? null,
        batchNo: source?.batchNo ?? null,
        expiryDate: source?.expiryDate ?? null,
      };
    }),
  };

  if (built.lines.length !== input.lines.length) {
    console.error('buildInvoice changed the line count; batch details would misalign');
    return { ok: false, formError: 'Could not save this bill. Please try again.' };
  }

  try {
    if (invoiceId) {
      await updateDraft(ctx, invoiceId, record);
      revalidatePath('/app/invoices');
      revalidatePath(`/app/invoices/${invoiceId}`);
      return { ok: true, invoiceId };
    }
    const created = await createDraft(ctx, record);
    revalidatePath('/app/invoices');
    return { ok: true, invoiceId: created.id };
  } catch (error) {
    console.error('saveInvoiceDraft failed', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('cannot be edited')) {
      return { ok: false, formError: 'This invoice has been issued and can no longer be edited.' };
    }
    return { ok: false, formError: 'Could not save this invoice. Please try again.' };
  }
}

/**
 * Issue a draft — assign its number and move the stock.
 *
 * `formatInvoiceNumber` is passed in because `packages/db` may not depend on
 * `@billwise/core` (spec §2.5). The repository allocates the counter under a
 * row lock; core turns it into `INV-007`.
 */
export async function issueInvoiceAction(invoiceId: string): Promise<InvoiceActionResult> {
  const ctx = await requireBusiness();
  try {
    const result = await issueInvoice(ctx, { invoiceId, formatNumber: formatInvoiceNumber });
    revalidatePath('/app/invoices');
    revalidatePath(`/app/invoices/${invoiceId}`);
    revalidatePath('/app/products');
    revalidatePath('/app/parties');
    return { ok: true, invoiceId, invoiceNo: result.invoiceNo };
  } catch (error) {
    console.error('issueInvoice failed', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('cannot be edited')) {
      return { ok: false, formError: 'This invoice has already been issued.' };
    }
    return { ok: false, formError: 'Could not issue this invoice. Please try again.' };
  }
}

export async function cancelInvoiceAction(
  invoiceId: string,
  raw: unknown,
): Promise<InvoiceActionResult> {
  const ctx = await requireBusiness();

  const parsed = cancelInvoiceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await cancelInvoice(ctx, { invoiceId, reason: parsed.data.reason });
    revalidatePath('/app/invoices');
    revalidatePath(`/app/invoices/${invoiceId}`);
    revalidatePath('/app/products');
    revalidatePath('/app/parties');
    return { ok: true, invoiceId };
  } catch (error) {
    console.error('cancelInvoice failed', error);
    return { ok: false, formError: 'Only an issued invoice can be cancelled.' };
  }
}

export async function recordPaymentAction(
  invoiceId: string,
  raw: unknown,
): Promise<InvoiceActionResult> {
  const ctx = await requireBusiness();

  const parsed = paymentInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const invoice = await getInvoice(ctx, invoiceId);
  if (!invoice) return { ok: false, formError: 'That invoice no longer exists.' };
  if (invoice.status !== 'issued') {
    return { ok: false, formError: 'Only an issued invoice can take a payment.' };
  }

  await recordPayment(ctx, {
    invoiceId,
    partyId: invoice.partyId,
    amount: parsed.data.amount,
    direction: 'in',
    method: parsed.data.method,
    paidOn: parsed.data.paidOn,
    reference: parsed.data.reference ?? null,
    note: parsed.data.note ?? null,
  });

  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath('/app/invoices');
  revalidatePath('/app/parties');
  return { ok: true, invoiceId };
}

/** Inline party creation from the invoice form, so billing never leaves the page. */
export async function quickCreatePartyAction(
  raw: unknown,
): Promise<
  { ok: true; party: { id: string; name: string; gstin: string | null; stateCode: string | null; phone: string | null } }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> }
> {
  const ctx = await requireBusiness();

  const parsed = partySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const created = await createParty(ctx, {
    type: parsed.data.type,
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    gstin: parsed.data.gstin ?? null,
    stateCode: parsed.data.stateCode ?? null,
    openingBalance: parsed.data.openingBalance,
  });

  revalidatePath('/app/parties');
  return {
    ok: true,
    party: {
      id: created!.id,
      name: created!.name,
      gstin: created!.gstin,
      stateCode: created!.stateCode,
      phone: created!.phone,
    },
  };
}

/**
 * Record a sales return.
 *
 * The quantity check is here, not in the schema: only the server knows what
 * this invoice actually sold and how much has already come back. A client that
 * posts "return 500 of an item we sold 2 of" gets refused rather than quietly
 * inflating stock.
 */
export async function recordReturnAction(
  raw: unknown,
): Promise<{ ok: true; returnId: string } | { ok: false; error: string }> {
  const ctx = await requireBusiness();

  const parsed = salesReturnSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the return details.' };
  }
  const input = parsed.data;
  if (!input.invoiceId) return { ok: false, error: 'A return needs an invoice.' };

  const invoice = await getInvoice(ctx, input.invoiceId);
  if (!invoice) return { ok: false, error: 'That invoice no longer exists.' };
  if (invoice.status !== 'issued') {
    return { ok: false, error: 'Only an issued invoice can take a return.' };
  }

  const previous = await listReturnsForInvoice(ctx, input.invoiceId);

  // How much of each invoice line has already come back.
  const returnedSoFar = new Map<string, number>();
  for (const ret of previous) {
    for (const line of ret.lines) {
      if (!line.invoiceLineId) continue;
      returnedSoFar.set(
        line.invoiceLineId,
        (returnedSoFar.get(line.invoiceLineId) ?? 0) + Number(line.qty),
      );
    }
  }

  const byId = new Map(invoice.lines.map((line) => [line.id, line]));
  const lines = [];

  for (const requested of input.lines) {
    const line = byId.get(requested.lineId);
    if (!line) return { ok: false, error: 'That item is not on this bill.' };

    const qty = Number(requested.qty);
    const left = Number(line.qty) - (returnedSoFar.get(line.id) ?? 0);
    if (qty > left + 1e-9) {
      return {
        ok: false,
        error: `Only ${left} of ${line.name} can still be returned against this bill.`,
      };
    }

    /*
     * Tax in proportion to what came back.
     *
     * Taken from the amounts actually charged on the line rather than
     * recomputed from the rate: the invoice rounded its tax per line, and
     * recomputing here would drift a paisa at a time away from the figure on
     * the paper the customer is holding.
     */
    const share = Number(line.qty) === 0 ? 0 : qty / Number(line.qty);
    const part = (value: string) => (Number(value) * share).toFixed(2);

    lines.push({
      productId: line.productId,
      invoiceLineId: line.id,
      name: line.name,
      qty: requested.qty,
      rate: line.rate,
      amount: part(line.lineTotal),
      hsnCode: line.hsnCode,
      taxRate: line.taxRate,
      taxableValue: part(line.taxableValue),
      cgstAmount: part(line.cgstAmount),
      sgstAmount: part(line.sgstAmount),
      igstAmount: part(line.igstAmount),
      cessAmount: part(line.cessAmount),
      restock: requested.restock,
    });
  }

  try {
    const { returnId } = await recordSalesReturn(ctx, {
      invoiceId: input.invoiceId,
      partyId: invoice.partyId,
      returnDate: input.returnDate,
      reason: input.reason,
      note: input.note,
      lines,
    });

    revalidatePath(`/app/invoices/${input.invoiceId}`);
    revalidatePath('/app/returns');
    revalidatePath('/app/reports');
    revalidatePath('/app/parties');
    revalidatePath('/app/products');
    revalidatePath('/app');
    return { ok: true, returnId };
  } catch (error) {
    console.error('recordReturn failed', error);
    return { ok: false, error: 'Could not save that return. Please try again.' };
  }
}

export type ShareResult =
  | { ok: true; whatsappUrl: string | null; message: string; link: string }
  | { ok: false; error: string };

/**
 * Prepare a bill for sending over WhatsApp.
 *
 * Returns the link and the message rather than sending anything: `wa.me` opens
 * WhatsApp with the text ready and the shopkeeper taps send. Nothing leaves the
 * shop without the person who took the money seeing it first — and it needs no
 * Meta account, no template approval and no per-message fee.
 *
 * `whatsappUrl` is null when the customer has no usable number. That is not an
 * error: the caller offers "copy message" instead, which is what a walk-in
 * customer standing at the counter needs anyway.
 */
export async function shareInvoiceAction(invoiceId: string): Promise<ShareResult> {
  const ctx = await requireBusiness();

  const [invoice, business, membership] = await Promise.all([
    getInvoice(ctx, invoiceId),
    getBusiness(ctx),
    requireMembership(),
  ]);

  if (!invoice) return { ok: false, error: 'That bill no longer exists.' };
  if (invoice.status === 'draft') {
    return { ok: false, error: 'Issue the bill before sharing it.' };
  }

  let token: string;
  try {
    token = await ensureReceiptToken(ctx, invoiceId);
  } catch (error) {
    console.error('ensureReceiptToken failed', error);
    return { ok: false, error: 'Could not create a share link. Please try again.' };
  }

  const link = `${appOrigin(process.env['NEXT_PUBLIC_APP_URL'])}/r/${token}`;
  const balance = (Number(invoice.grandTotal) - Number(invoice.amountPaid)).toFixed(2);

  const message = receiptShareMessage({
    businessName: business?.name ?? membership.businessName,
    documentLabel: membership.profile.terms.document,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: indianDate(invoice.invoiceDate),
    items: invoice.lines.map((l) => l.name),
    grandTotal: invoice.grandTotal,
    amountPaid: invoice.amountPaid,
    balance,
    link,
    businessPhone: business?.phone ?? null,
  });

  return {
    ok: true,
    whatsappUrl: whatsappShareUrl(invoice.partyPhone, message),
    message,
    link,
  };
}

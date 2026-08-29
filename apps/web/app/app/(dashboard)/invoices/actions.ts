'use server';

import { buildInvoice, formatInvoiceNumber } from '@billwise/core';
import {
  cancelInvoice,
  createDraft,
  createParty,
  getBusiness,
  getInvoice,
  getParty,
  issueInvoice,
  recordPayment,
  updateDraft,
} from '@billwise/db';
import {
  cancelInvoiceSchema,
  invoiceInputSchema,
  partySchema,
  paymentInputSchema,
} from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

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
    lines: built.lines,
  };

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

'use server';

import { buildInvoice, formatInvoiceNumber } from '@billwise/core';
import {
  createApplication,
  createDraft,
  createParty,
  deleteApplication,
  getApplication,
  getBusiness,
  issueInvoice,
  recordPayment,
  setApplicationStatus,
  updateApplication,
} from '@billwise/db';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  PAYMENT_METHODS,
  type PaymentMethod,
  applicationPatchSchema,
  applicationSchema,
} from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

/**
 * Work at the counter. Every action re-checks the guard — a layout does not
 * protect a POST (spec §2.5 rule 4).
 */

export type WorkResult = { ok: true; id?: string } | { ok: false; error: string };

export async function addWorkAction(raw: unknown): Promise<WorkResult> {
  const ctx = await requireBusiness();

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }
  const input = parsed.data;

  try {
    const row = await createApplication(ctx, {
      serviceName: input.serviceName,
      serviceId: input.serviceId ?? null,
      partyId: input.partyId ?? null,
      partyName: input.partyName ?? null,
      partyPhone: input.partyPhone ?? null,
      invoiceId: input.invoiceId ?? null,
      referenceNo: input.referenceNo ?? null,
      appliedOn: input.appliedOn,
      expectedOn: input.expectedOn ?? null,
      documentsHeld: input.documentsHeld ?? null,
      note: input.note ?? null,
    });
    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/deliveries');
    revalidatePath('/app/seva');
    return { ok: true, id: row?.id };
  } catch (error) {
    console.error('addWork failed', error);
    return { ok: false, error: 'Could not save that. Please try again.' };
  }
}

export async function updateWorkAction(id: string, raw: unknown): Promise<WorkResult> {
  const ctx = await requireBusiness();

  const parsed = applicationPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }

  try {
    await updateApplication(ctx, id, parsed.data);
    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/deliveries');
    revalidatePath('/app/seva');
    return { ok: true };
  } catch (error) {
    console.error('updateWork failed', error);
    return { ok: false, error: 'Could not update that. Please try again.' };
  }
}

export async function setWorkStatusAction(
  ids: string[],
  status: ApplicationStatus,
): Promise<WorkResult> {
  const ctx = await requireBusiness();
  if (!APPLICATION_STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };

  try {
    await setApplicationStatus(ctx, ids, status);
    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/deliveries');
    revalidatePath('/app/seva');
    return { ok: true };
  } catch (error) {
    console.error('setWorkStatus failed', error);
    return { ok: false, error: 'Could not update. Please try again.' };
  }
}

export async function deleteWorkAction(id: string): Promise<WorkResult> {
  const ctx = await requireBusiness();
  try {
    await deleteApplication(ctx, id);
    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/deliveries');
    revalidatePath('/app/seva');
    return { ok: true };
  } catch (error) {
    console.error('deleteWork failed', error);
    return { ok: false, error: 'Could not remove that. Please try again.' };
  }
}

/**
 * The WhatsApp text for "your work is ready, come and collect it".
 *
 * Built on the server so the balance comes from the database rather than from
 * whatever the page was showing when it loaded — the customer may have paid
 * something in between, and quoting them a balance they have already settled is
 * worse than sending nothing.
 *
 * The shop's name and phone number are in the message because the customer
 * receives it from an unknown number. Without them it reads as spam, and the
 * one message the whole feature exists to send gets ignored.
 */
export async function readyMessageAction(
  id: string,
): Promise<{ ok: true; message: string; phone: string | null } | { ok: false; error: string }> {
  const ctx = await requireBusiness();

  // By id, not by listing the register and searching it — that cost a thousand
  // rows over the wire every time somebody tapped the WhatsApp button.
  const [row, business] = await Promise.all([getApplication(ctx, id), getBusiness(ctx)]);
  if (!row) return { ok: false, error: 'That work is not on the register any more.' };

  const balance = Number(row.balance);
  const lines = [
    `Hello${row.partyName ? ` ${row.partyName}` : ''},`,
    '',
    `Your work is ready: *${row.serviceName}*`,
  ];
  if (row.referenceNo) lines.push(`Reference no: ${row.referenceNo}`);
  if (row.invoiceNo) lines.push(`Receipt no: ${row.invoiceNo}`);
  if (balance > 0) {
    lines.push('', `*Balance to pay on collection: ₹${balance.toFixed(2)}*`);
  } else {
    lines.push('', 'Nothing left to pay.');
  }
  lines.push('', 'Please come and collect it. Thank you.');
  if (business?.name) {
    lines.push('', `— ${business.name}${business.phone ? `, ${business.phone}` : ''}`);
  }

  return { ok: true, message: lines.join('\n'), phone: row.partyPhone };
}

export type GenerateReceiptForWorkInput = {
  applicationId: string;
  rate: string;
  amountReceived: string;
  method: PaymentMethod;
  receiptDate?: string;
  notes?: string;
};

export type GenerateReceiptResult =
  | { ok: true; invoiceId: string; invoiceNo: string; balance: string }
  | { ok: false; error: string };

/**
 * Generate a cash memo / receipt directly from a work row, and optionally
 * record the initial payment.
 */
export async function generateReceiptForWorkAction(
  input: GenerateReceiptForWorkInput,
): Promise<GenerateReceiptResult> {
  const ctx = await requireBusiness();

  const rateNum = Number(input.rate);
  if (!Number.isFinite(rateNum) || rateNum < 0) {
    return { ok: false, error: 'Enter a valid fee for this work.' };
  }

  const receivedNum = Number(input.amountReceived || 0);
  if (!Number.isFinite(receivedNum) || receivedNum < 0) {
    return { ok: false, error: 'Enter a valid amount received.' };
  }

  if (receivedNum > rateNum) {
    return { ok: false, error: 'Amount received cannot exceed the work fee.' };
  }

  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) {
    return { ok: false, error: 'Choose how the money was paid.' };
  }

  const row = await getApplication(ctx, input.applicationId);
  if (!row) {
    return { ok: false, error: 'This work record was not found.' };
  }
  if (row.invoiceId) {
    return { ok: false, error: 'This work already has a receipt attached.' };
  }

  const business = await getBusiness(ctx);
  const supplierState = business?.stateCode ?? '09';
  const receiptDate = input.receiptDate || new Date().toISOString().slice(0, 10);

  let partyId = row.partyId ?? null;
  const partyName = row.partyName?.trim() || 'Walk-in customer';
  const partyPhone = row.partyPhone?.trim() || null;

  if (!partyId && row.partyName) {
    try {
      const created = await createParty(ctx, {
        type: 'customer',
        name: row.partyName.trim(),
        phone: partyPhone,
        stateCode: supplierState,
      });
      partyId = created?.id ?? null;
    } catch (err) {
      console.error('quick party create failed', err);
    }
  }

  const built = buildInvoice({
    kind: business?.gstin ? 'tax_invoice' : 'cash_memo',
    invoiceDate: receiptDate,
    taxMode: 'exclusive',
    supplierStateCode: supplierState,
    partyStateCode: supplierState,
    lines: [
      {
        productId: row.serviceId,
        name: row.serviceName,
        qty: '1',
        rate: input.rate,
        taxRate: '0',
      },
    ],
  });

  try {
    const draft = await createDraft(ctx, {
      kind: business?.gstin ? 'tax_invoice' : 'cash_memo',
      fy: built.fy,
      invoiceDate: receiptDate,
      partyId,
      partyName,
      partyPhone,
      supplierStateCode: supplierState,
      placeOfSupply: built.placeOfSupply,
      isInterstate: built.isInterstate,
      taxMode: 'exclusive',
      subtotal: built.subtotal,
      discountTotal: built.discountTotal,
      cgstTotal: built.cgstTotal,
      sgstTotal: built.sgstTotal,
      igstTotal: built.igstTotal,
      cessTotal: built.cessTotal,
      otherCharges: built.otherCharges,
      roundOff: built.roundOff,
      grandTotal: built.grandTotal,
      notes: input.notes ?? row.note ?? null,
      lines: built.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        qty: l.qty,
        rate: l.rate,
        taxableValue: l.taxableValue,
        taxRate: l.taxRate,
        cgstAmount: l.cgstAmount,
        sgstAmount: l.sgstAmount,
        igstAmount: l.igstAmount,
        cessAmount: l.cessAmount,
        lineTotal: l.lineTotal,
      })),
    });

    const { invoiceNo } = await issueInvoice(ctx, {
      invoiceId: draft.id,
      formatNumber: formatInvoiceNumber,
    });

    if (receivedNum > 0) {
      await recordPayment(ctx, {
        invoiceId: draft.id,
        partyId,
        amount: Math.min(receivedNum, Number(built.grandTotal)).toFixed(2),
        direction: 'in',
        method: input.method,
        paidOn: receiptDate,
      });
    }

    await updateApplication(ctx, row.id, {
      invoiceId: draft.id,
    });

    const balance = Math.max(0, Number(built.grandTotal) - receivedNum).toFixed(2);

    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/receipts');
    revalidatePath('/app/seva/deliveries');
    revalidatePath('/app/seva');

    return {
      ok: true,
      invoiceId: draft.id,
      invoiceNo,
      balance,
    };
  } catch (error) {
    console.error('generateReceiptForWork failed', error);
    return { ok: false, error: 'Could not generate receipt. Please try again.' };
  }
}


'use server';

import { buildInvoice, formatInvoiceNumber } from '@billwise/core';
import {
  createApplication,
  createDraft,
  createParty,
  getBusiness,
  issueInvoice,
  listSevaServices,
  recordPayment,
} from '@billwise/db';
import { sevaReceiptSchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

/**
 * Making a receipt at a Jan Seva counter.
 *
 * ## Why this is its own action and not the invoice form's
 *
 * The shop's invoice action handles tax modes, place of supply, HSN, discounts
 * per line and five document kinds. None of that exists here: a CSC that is not
 * registered gives a cash memo, at one rate, to one customer, usually for one
 * job. Reusing the big action would mean the small form had to fill in a dozen
 * fields it has no opinion about.
 *
 * What it does reuse is everything that decides money: `buildInvoice` for the
 * totals and `formatInvoiceNumber` for the number, exactly as the shop side
 * does. Two ways of adding up a bill is how two screens start disagreeing.
 *
 * ## Why the work register is written here
 *
 * A receipt and the jobs on it are one act at the counter. Recording the money
 * and then asking the owner to go and add three rows to the register is how the
 * register ends up empty and useless.
 */

export type ReceiptResult =
  | { ok: true; invoiceId: string; invoiceNo: string }
  | { ok: false; error: string };

export async function createReceiptAction(raw: unknown): Promise<ReceiptResult> {
  const ctx = await requireBusiness();

  const parsed = sevaReceiptSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }
  const input = parsed.data;

  const business = await getBusiness(ctx);
  const supplierState = business?.stateCode ?? '09';

  // Rates come from the master, never from the browser. A posted price is a
  // number somebody could have edited in devtools.
  const services = await listSevaServices(ctx, { includeInactive: true });
  const byId = new Map(services.map((s) => [s.id, s]));

  const lines = input.lines.map((line) => {
    const service = line.serviceId ? byId.get(line.serviceId) : undefined;
    return {
      serviceId: service?.id ?? null,
      // A one-off job that is not on the rate list is normal here, so a typed
      // name and price are allowed — but only when no service was chosen.
      name: service?.name ?? line.name,
      rate: service ? service.price : line.rate,
      qty: line.qty,
      tracked: line.tracked,
      expectedOn: line.expectedOn ?? null,
      referenceNo: line.referenceNo ?? null,
      documentsHeld: line.documentsHeld ?? null,
    };
  });

  if (lines.some((l) => !l.name.trim())) {
    return { ok: false, error: 'Every line needs a name.' };
  }

  let partyId = input.partyId ?? null;
  let partyName = input.partyName?.trim() ?? '';
  const partyPhone = input.partyPhone?.trim() ?? '';

  // A walk-in with a phone number is worth keeping: the "your work is ready"
  // message needs somewhere to go, and next time they are already on file.
  if (!partyId && partyName) {
    try {
      const created = await createParty(ctx, {
        type: 'customer',
        name: partyName,
        phone: partyPhone || null,
        stateCode: supplierState,
      });
      partyId = created?.id ?? null;
    } catch (error) {
      // Not fatal — the receipt still stands with the name snapshotted on it.
      console.error('quick party create failed', error);
    }
  }

  if (partyId && !partyName) partyName = 'Customer';
  if (!partyName) partyName = 'Walk-in customer';

  const built = buildInvoice({
    // Registered CSCs are rare; a GSTIN in settings is what turns this into a
    // tax invoice, and until then a cash memo is the honest document.
    kind: business?.gstin ? 'tax_invoice' : 'cash_memo',
    invoiceDate: input.receiptDate,
    taxMode: 'exclusive',
    supplierStateCode: supplierState,
    partyStateCode: supplierState,
    lines: lines.map((l) => ({
      productId: l.serviceId,
      name: l.name,
      qty: l.qty,
      rate: l.rate,
      taxRate: '0',
    })),
  });

  try {
    const draft = await createDraft(ctx, {
      kind: business?.gstin ? 'tax_invoice' : 'cash_memo',
      fy: built.fy,
      invoiceDate: input.receiptDate,
      partyId,
      partyName,
      partyPhone: partyPhone || null,
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
      notes: input.note ?? null,
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

    // Money taken now. Zero is allowed — plenty of work is billed and collected
    // when the customer comes back for it.
    const received = Number(input.amountReceived);
    if (received > 0) {
      await recordPayment(ctx, {
        invoiceId: draft.id,
        partyId,
        amount: Math.min(received, Number(built.grandTotal)).toFixed(2),
        direction: 'in',
        method: input.method,
        paidOn: input.receiptDate,
      });
    }

    // One register row per job that runs for days. A family doing three Aadhaar
    // updates on one receipt is three jobs with three acknowledgement numbers,
    // finishing on three different days.
    for (const line of lines) {
      if (!line.tracked) continue;
      await createApplication(ctx, {
        partyId,
        partyName,
        partyPhone: partyPhone || null,
        invoiceId: draft.id,
        serviceId: line.serviceId,
        serviceName: line.name,
        appliedOn: input.receiptDate,
        expectedOn: line.expectedOn,
        referenceNo: line.referenceNo,
        documentsHeld: line.documentsHeld,
      });
    }

    revalidatePath('/app/seva');
    revalidatePath('/app/seva/receipts');
    revalidatePath('/app/seva/work');
    revalidatePath('/app/seva/customers');

    return { ok: true, invoiceId: draft.id, invoiceNo };
  } catch (error) {
    console.error('createReceipt failed', error);
    return { ok: false, error: 'Could not save this receipt. Please try again.' };
  }
}

export type PayResult = { ok: true } | { ok: false; error: string };

/** Take the rest of the money when the customer collects their work. */
export async function collectBalanceAction(
  invoiceId: string,
  raw: { amount: string; method: string; paidOn: string },
): Promise<PayResult> {
  const ctx = await requireBusiness();

  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }

  try {
    await recordPayment(ctx, {
      invoiceId,
      amount: amount.toFixed(2),
      direction: 'in',
      method: raw.method as 'cash',
      paidOn: raw.paidOn,
    });
    revalidatePath(`/app/seva/receipts/${invoiceId}`);
    revalidatePath('/app/seva/receipts');
    revalidatePath('/app/seva');
    revalidatePath('/app/seva/work');
    return { ok: true };
  } catch (error) {
    console.error('collectBalance failed', error);
    return { ok: false, error: 'Could not record that payment. Please try again.' };
  }
}

'use server';

import { allocatePayment } from '@billwise/core';
import {
  createParty,
  deactivateParty,
  getParty,
  listOpenInvoices,
  recordPartyPayment,
  updateParty,
} from '@billwise/db';
import { partyPaymentSchema, partySchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

export type PartyActionResult =
  | { ok: true; partyId: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function savePartyAction(
  raw: unknown,
  partyId?: string,
): Promise<PartyActionResult> {
  // The layout guard protects navigation, not a POST. Every action re-checks.
  const ctx = await requireBusiness();

  const parsed = partySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const input = parsed.data;

  const values = {
    type: input.type,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    gstin: input.gstin ?? null,
    stateCode: input.stateCode ?? null,
    addressLine1: input.addressLine1 ?? null,
    city: input.city ?? null,
    pincode: input.pincode ?? null,
    customFields: input.customFields,
  };

  try {
    if (partyId) {
      const existing = await getParty(ctx, partyId);
      if (!existing) return { ok: false, formError: 'That contact no longer exists.' };

      // Opening balance is deliberately NOT editable after creation. It is the
      // starting point of a ledger, and silently moving it would change every
      // running balance since without leaving a trace of why.
      await updateParty(ctx, partyId, values);
      revalidatePath('/app/parties');
      revalidatePath(`/app/parties/${partyId}`);
      return { ok: true, partyId };
    }

    const created = await createParty(ctx, {
      ...values,
      openingBalance: input.openingBalance,
    });
    revalidatePath('/app/parties');
    return { ok: true, partyId: created!.id };
  } catch (error) {
    console.error('saveParty failed', error);
    return { ok: false, formError: 'Could not save this contact. Please try again.' };
  }
}

export async function deactivatePartyAction(partyId: string): Promise<void> {
  const ctx = await requireBusiness();
  await deactivateParty(ctx, partyId);
  revalidatePath('/app/parties');
}

export type PartyPaymentResult =
  | { ok: true; settled: number; partPaid: number; onAccount: string; total: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

/**
 * One payment received from a customer, spread across their open bills.
 *
 * The split is recomputed here from bills read inside this request, never taken
 * from the form. The browser worked one out too, for the preview — but a
 * preview is a picture, and a bill may have been paid on another till in the
 * seconds since it was drawn. Trusting the posted split would let a stale page
 * overpay a settled invoice.
 */
export async function recordPartyPaymentAction(
  partyId: string,
  raw: unknown,
): Promise<PartyPaymentResult> {
  const ctx = await requireBusiness();

  const parsed = partyPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      formError: parsed.error.issues[0]?.message,
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const party = await getParty(ctx, partyId);
  if (!party) return { ok: false, formError: 'That contact no longer exists.' };

  const open = await listOpenInvoices(ctx, partyId);
  const plan = allocatePayment({ tenders: parsed.data.tenders, invoices: open });

  if (Number(plan.total) <= 0) {
    return { ok: false, formError: 'Enter an amount greater than zero.' };
  }

  try {
    await recordPartyPayment(ctx, {
      partyId,
      paidOn: parsed.data.paidOn,
      note: parsed.data.note ?? null,
      allocations: plan.allocations,
      unallocatedParts: plan.unallocatedParts,
    });
  } catch (error) {
    console.error('recordPartyPayment failed', error);
    return { ok: false, formError: 'Could not record this payment. Please try again.' };
  }

  revalidatePath(`/app/parties/${partyId}`);
  revalidatePath('/app/parties');
  revalidatePath('/app/invoices');
  revalidatePath('/app');
  for (const allocation of plan.allocations) {
    revalidatePath(`/app/invoices/${allocation.invoiceId}`);
  }

  return {
    ok: true,
    settled: plan.allocations.filter((a) => Number(a.dueAfter) === 0).length,
    partPaid: plan.allocations.filter((a) => Number(a.dueAfter) > 0).length,
    onAccount: plan.unallocated,
    total: plan.total,
  };
}

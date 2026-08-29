'use server';

import { createParty, deactivateParty, getParty, updateParty } from '@billwise/db';
import { partySchema } from '@billwise/shared';
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

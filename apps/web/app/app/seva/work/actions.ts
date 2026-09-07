'use server';

import {
  createApplication,
  deleteApplication,
  getApplication,
  getBusiness,
  setApplicationStatus,
  updateApplication,
} from '@billwise/db';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
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

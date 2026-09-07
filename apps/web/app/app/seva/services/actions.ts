'use server';

import { createSevaService, setSevaServiceActive, updateSevaService } from '@billwise/db';
import { sevaServiceSchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

export type ServiceResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath('/app/seva/services');
  revalidatePath('/app/seva/receipts/new');
  revalidatePath('/app/seva/work');
}

export async function saveServiceAction(
  raw: unknown,
  serviceId?: string,
): Promise<ServiceResult> {
  const ctx = await requireBusiness();

  const parsed = sevaServiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }

  const input = parsed.data;
  if (Number(input.govtFee) > Number(input.price)) {
    // Not a validation rule so much as a typo catch: a government fee larger
    // than the total means the shop is paying to do the work.
    return { ok: false, error: 'Government fee cannot be more than the total charge.' };
  }

  try {
    if (serviceId) {
      await updateSevaService(ctx, serviceId, { ...input, sku: input.sku ?? null });
    } else {
      await createSevaService(ctx, { ...input, sku: input.sku ?? null });
    }
    revalidate();
    return { ok: true };
  } catch (error) {
    console.error('saveService failed', error);
    return { ok: false, error: 'Could not save that. Please try again.' };
  }
}

export async function setServiceActiveAction(
  serviceId: string,
  isActive: boolean,
): Promise<ServiceResult> {
  const ctx = await requireBusiness();
  try {
    await setSevaServiceActive(ctx, serviceId, isActive);
    revalidate();
    return { ok: true };
  } catch (error) {
    console.error('setServiceActive failed', error);
    return { ok: false, error: 'Could not update that. Please try again.' };
  }
}

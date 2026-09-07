'use server';

import { upsertPlan } from '@billwise/db';
import { type BusinessType, planSchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth/require-business';

/**
 * Editing what Billwise charges.
 *
 * `requireSuperAdmin()` again, inside the action. The panel's layout already
 * guards the page, and that is worth exactly nothing against a POST sent
 * directly — this endpoint changes the price every customer pays.
 *
 * Who changed it is recorded on the row. A price that can move with nobody's
 * name attached is the kind of thing that becomes unanswerable six months
 * later when a customer asks why they were billed what they were billed.
 */

export type PricingResult = { ok: true } | { ok: false; error: string };

export async function savePlanAction(
  businessType: BusinessType,
  raw: unknown,
): Promise<PricingResult> {
  const admin = await requireSuperAdmin();

  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }

  try {
    await upsertPlan(businessType, parsed.data, admin.id);

    // Every surface that quotes a price. The public pricing page is revalidated
    // on a timer as well, but an admin who just saved should be able to open it
    // and see the new number rather than wait out the window.
    revalidatePath('/admin/pricing');
    revalidatePath('/pricing');
    revalidatePath('/app/billing');
    return { ok: true };
  } catch (error) {
    console.error('savePlan failed', error);
    return { ok: false, error: 'Could not save that plan. Please try again.' };
  }
}

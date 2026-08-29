'use server';

import {
  extendTrial,
  grantAdminByEmail,
  markBusinessPaid,
  revokeAdmin,
  setBusinessSuspended,
} from '@bahikhata/db';
import { emailSchema } from '@bahikhata/shared';
import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth/require-business';

/**
 * Super admin actions. Build spec §6.
 *
 * Every one re-checks `requireSuperAdmin()`. These endpoints can suspend a
 * paying customer's business; a layout guard is not a control on a POST.
 *
 * There is deliberately no "delete business" action. Suspension already stops
 * access and 404s the catalog, and it is reversible. A support tool that can
 * destroy a shop's books is a liability, not a feature.
 */

export type AdminResult = { ok: true } | { ok: false; error: string };

export async function markPaidAction(businessId: string): Promise<AdminResult> {
  const admin = await requireSuperAdmin();
  try {
    await markBusinessPaid(businessId, admin.id);
    revalidatePath('/admin');
    return { ok: true };
  } catch (error) {
    console.error('markPaid failed', error);
    return { ok: false, error: 'Could not update that business.' };
  }
}

export async function setSuspendedAction(
  businessId: string,
  suspended: boolean,
): Promise<AdminResult> {
  await requireSuperAdmin();
  try {
    await setBusinessSuspended(businessId, suspended);
    revalidatePath('/admin');
    return { ok: true };
  } catch (error) {
    console.error('setSuspended failed', error);
    return { ok: false, error: 'Could not update that business.' };
  }
}

export async function extendTrialAction(
  businessId: string,
  days: number,
): Promise<AdminResult> {
  await requireSuperAdmin();
  try {
    await extendTrial(businessId, days);
    revalidatePath('/admin');
    return { ok: true };
  } catch (error) {
    console.error('extendTrial failed', error);
    return { ok: false, error: 'Could not extend that trial.' };
  }
}

// ------------------------------------------------------- admin accounts ----

/**
 * Promote an existing account to super admin, by email.
 *
 * There is no invite: the person must already have signed up. That is a
 * deliberate limitation — with no email delivery, an "invite" would create a
 * row nobody could log into, and it keeps their password entirely their own.
 */
export async function grantAdminAction(rawEmail: string): Promise<AdminResult> {
  await requireSuperAdmin();

  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { ok: false, error: 'That does not look like an email address.' };
  }

  try {
    const result = await grantAdminByEmail(parsed.data);
    if (!result.ok) {
      return {
        ok: false,
        error:
          result.reason === 'already_admin'
            ? 'That person is already an admin.'
            : 'Nobody has signed up with that email yet. Ask them to create an account first, then add them here.',
      };
    }
    revalidatePath('/admin/admins');
    return { ok: true };
  } catch (error) {
    console.error('grantAdmin failed', error);
    return { ok: false, error: 'Could not add that admin.' };
  }
}

export async function revokeAdminAction(targetUserId: string): Promise<AdminResult> {
  const admin = await requireSuperAdmin();

  try {
    const result = await revokeAdmin(targetUserId, admin.id);
    if (!result.ok) {
      return {
        ok: false,
        error:
          result.reason === 'self'
            ? 'You cannot remove your own admin access.'
            : result.reason === 'last_admin'
              ? 'This is the only admin left. Add another one first.'
              : 'That person is not an admin.',
      };
    }
    revalidatePath('/admin/admins');
    return { ok: true };
  } catch (error) {
    console.error('revokeAdmin failed', error);
    return { ok: false, error: 'Could not remove that admin.' };
  }
}

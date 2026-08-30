'use server';

import { getBusiness, updateBusinessProfile } from '@billwise/db';
import { MAX_IMAGE_BYTES } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';
import { isWebp } from '@/lib/storage/image-format';
import {
  businessLogoPath,
  businessSignaturePath,
  deletePublicObject,
  pathFromPublicUrl,
  uploadPublicObject,
} from '@/lib/storage/supabase-storage';

/**
 * The two images a business owns: its logo and its signature.
 *
 * Both are in the public bucket (spec §2). The logo prints on invoices and
 * shows on the public catalog, and the signature prints on invoices, so neither
 * can live behind a signed URL.
 *
 * One implementation for both, because everything except the column and the
 * storage folder is identical, and two copies of an upload-validate-replace
 * routine is two places for the delete-the-old-file step to be forgotten.
 */

export type ImageSlot = 'logo' | 'signature';
export type ImageResult = { ok: true; url: string | null } | { ok: false; error: string };

const SLOTS = {
  logo: { path: businessLogoPath, field: 'logoUrl' as const, label: 'logo' },
  signature: { path: businessSignaturePath, field: 'signatureUrl' as const, label: 'signature' },
};

export async function uploadBusinessImageAction(
  slot: ImageSlot,
  formData: FormData,
): Promise<ImageResult> {
  const ctx = await requireBusiness();
  const { path, field, label } = SLOTS[slot];

  if (ctx.role !== 'owner') {
    return { ok: false, error: `Only the owner can change the ${label}.` };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' };
  if (file.size === 0) return { ok: false, error: 'That file is empty.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'That image is too large.' };

  const buffer = await file.arrayBuffer();
  if (!isWebp(new Uint8Array(buffer.slice(0, 12)))) {
    return { ok: false, error: 'Only webp images are accepted.' };
  }

  const previous = (await getBusiness(ctx))?.[field] ?? null;

  try {
    const url = await uploadPublicObject(path(ctx.businessId), buffer, 'image/webp');
    await updateBusinessProfile(ctx, { [field]: url });

    // Replace, don't accumulate. A shop has one logo and one signature, and old
    // versions would otherwise pile up in storage forever. Done after the row
    // is updated so a failure here only orphans a file rather than breaking the
    // live image.
    const oldPath = previous ? pathFromPublicUrl(previous) : undefined;
    if (oldPath && oldPath.startsWith(`${ctx.businessId}/`)) {
      await deletePublicObject(oldPath);
    }

    revalidatePath('/app/settings');
    revalidatePath('/app');
    return { ok: true, url };
  } catch (error) {
    console.error(`${label} upload failed`, error);
    return { ok: false, error: 'Upload failed. Please try again.' };
  }
}

export async function removeBusinessImageAction(slot: ImageSlot): Promise<ImageResult> {
  const ctx = await requireBusiness();
  const { field, label } = SLOTS[slot];

  if (ctx.role !== 'owner') {
    return { ok: false, error: `Only the owner can change the ${label}.` };
  }

  const current = (await getBusiness(ctx))?.[field] ?? null;
  await updateBusinessProfile(ctx, { [field]: null });

  const path = current ? pathFromPublicUrl(current) : undefined;
  if (path && path.startsWith(`${ctx.businessId}/`)) {
    await deletePublicObject(path);
  }

  revalidatePath('/app/settings');
  revalidatePath('/app');
  return { ok: true, url: null };
}

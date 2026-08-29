'use server';

import { getBusiness, updateBusinessProfile } from '@bahikhata/db';
import { MAX_IMAGE_BYTES } from '@bahikhata/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';
import { isWebp } from '@/lib/storage/image-format';
import {
  businessLogoPath,
  deletePublicObject,
  pathFromPublicUrl,
  uploadPublicObject,
} from '@/lib/storage/supabase-storage';

/**
 * Business logo. Build spec §2: public bucket — it prints on invoices and
 * shows on the public catalog, so it cannot live behind a signed URL.
 */

export type LogoResult = { ok: true; logoUrl: string | null } | { ok: false; error: string };

export async function uploadLogoAction(formData: FormData): Promise<LogoResult> {
  const ctx = await requireBusiness();
  if (ctx.role !== 'owner') {
    return { ok: false, error: 'Only the owner can change the logo.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' };
  if (file.size === 0) return { ok: false, error: 'That file is empty.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'That image is too large.' };

  const buffer = await file.arrayBuffer();
  if (!isWebp(new Uint8Array(buffer.slice(0, 12)))) {
    return { ok: false, error: 'Only webp images are accepted.' };
  }

  const previous = (await getBusiness(ctx))?.logoUrl ?? null;

  try {
    const logoUrl = await uploadPublicObject(
      businessLogoPath(ctx.businessId),
      buffer,
      'image/webp',
    );
    await updateBusinessProfile(ctx, { logoUrl });

    // Replace, don't accumulate — a shop has one logo, and old versions would
    // otherwise pile up in storage forever. Done after the row is updated so a
    // failure here only orphans a file rather than breaking the live logo.
    const oldPath = previous ? pathFromPublicUrl(previous) : undefined;
    if (oldPath && oldPath.startsWith(`${ctx.businessId}/`)) {
      await deletePublicObject(oldPath);
    }

    revalidatePath('/app/settings');
    revalidatePath('/app');
    return { ok: true, logoUrl };
  } catch (error) {
    console.error('logo upload failed', error);
    return { ok: false, error: 'Upload failed. Please try again.' };
  }
}

export async function removeLogoAction(): Promise<LogoResult> {
  const ctx = await requireBusiness();
  if (ctx.role !== 'owner') {
    return { ok: false, error: 'Only the owner can change the logo.' };
  }

  const current = (await getBusiness(ctx))?.logoUrl ?? null;
  await updateBusinessProfile(ctx, { logoUrl: null });

  const path = current ? pathFromPublicUrl(current) : undefined;
  if (path && path.startsWith(`${ctx.businessId}/`)) {
    await deletePublicObject(path);
  }

  revalidatePath('/app/settings');
  revalidatePath('/app');
  return { ok: true, logoUrl: null };
}

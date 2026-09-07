'use server';

import { normaliseGstin, validateGstin } from '@billwise/core';
import { updateBusinessProfile, updateSettings } from '@billwise/db';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

export type SettingsResult = { ok: true } | { ok: false; error: string };

type Input = {
  name?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  city?: unknown;
  pincode?: unknown;
  gstin?: unknown;
  invoiceFooter?: unknown;
};

const text = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export async function saveSevaSettingsAction(raw: Input): Promise<SettingsResult> {
  const ctx = await requireBusiness();

  const name = text(raw.name, 80);
  if (name.length < 2) return { ok: false, error: 'Kendra ka naam likhiye.' };

  const phone = text(raw.phone, 20);
  if (phone && !/^[+\d][\d\s-]{7,}$/.test(phone)) {
    return { ok: false, error: 'Mobile number theek nahi lag raha.' };
  }

  const gstinRaw = text(raw.gstin, 20);
  let gstin: string | null = null;
  if (gstinRaw) {
    const normalised = normaliseGstin(gstinRaw);
    // Checked rather than accepted: a wrong GSTIN silently turns every receipt
    // into a tax invoice carrying a number that does not exist.
    if (!validateGstin(normalised).valid) {
      return { ok: false, error: 'Yeh GSTIN sahi nahi hai. Dobara dekhiye ya khaali chhod dijiye.' };
    }
    gstin = normalised;
  }

  try {
    await updateBusinessProfile(ctx, {
      name,
      phone: phone || null,
      addressLine1: text(raw.addressLine1, 120) || null,
      city: text(raw.city, 60) || null,
      pincode: text(raw.pincode, 10) || null,
      gstin,
    });
    await updateSettings(ctx, { invoiceFooter: text(raw.invoiceFooter, 300) || null });

    revalidatePath('/app/seva/settings');
    revalidatePath('/app/seva');
    return { ok: true };
  } catch (error) {
    console.error('saveSevaSettings failed', error);
    return { ok: false, error: 'Save nahi ho paya. Dobara koshish kariye.' };
  }
}

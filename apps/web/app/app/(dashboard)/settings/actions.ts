'use server';

import {
  createCustomFieldDef,
  createUnit,
  deleteCustomFieldDef,
  deleteUnit,
  getBusiness,
  updateBusinessProfile,
  updateSettings,
} from '@billwise/db';
import {
  businessProfileSchema,
  businessSettingsSchema,
  customFieldSchema,
  slugify,
  unitSchema,
} from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

export type SettingsResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveProfileAction(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireBusiness();
  const parsed = businessProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await updateBusinessProfile(ctx, {
      name: parsed.data.name,
      legalName: parsed.data.legalName ?? null,
      gstin: parsed.data.gstin ?? null,
      stateCode: parsed.data.stateCode,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressLine2: parsed.data.addressLine2 ?? null,
      city: parsed.data.city ?? null,
      pincode: parsed.data.pincode ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only the owner')) {
      return { ok: false, formError: 'Only the owner can change the business profile.' };
    }
    throw error;
  }

  revalidatePath('/app/settings');
  revalidatePath('/app');
  const business = await getBusiness(ctx);
  if (business?.slug) {
    revalidatePath(`/store/${business.slug}`);
    revalidatePath(`/store/${business.slug}/[productSlug]`, 'page');
  }
  return { ok: true };
}

export async function saveSettingsAction(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireBusiness();
  const parsed = businessSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await updateSettings(ctx, {
    defaultTaxMode: parsed.data.defaultTaxMode,
    invoiceTerms: parsed.data.invoiceTerms ?? null,
    invoiceFooter: parsed.data.invoiceFooter ?? null,
    showCatalogPrices: parsed.data.showCatalogPrices,
    catalogEnabled: parsed.data.catalogEnabled,
    catalogWhatsapp: parsed.data.catalogWhatsapp ?? null,
  });

  revalidatePath('/app/settings');
  return { ok: true };
}

export async function addUnitAction(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireBusiness();
  const parsed = unitSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await createUnit(ctx, parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message.includes('units_business_short_unq')) {
      return { ok: false, fieldErrors: { shortName: 'You already have a unit with this code.' } };
    }
    throw error;
  }

  revalidatePath('/app/settings');
  return { ok: true };
}

export async function removeUnitAction(unitId: string): Promise<void> {
  const ctx = await requireBusiness();
  await deleteUnit(ctx, unitId);
  revalidatePath('/app/settings');
}

export async function addCustomFieldAction(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireBusiness();
  const parsed = customFieldSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  // The machine key is derived from the label, never typed. It becomes a JSON
  // key on every product row, so it has to be stable and safe — and a user
  // should not have to think about that distinction at all.
  const key = slugify(parsed.data.label).replace(/-/g, '_');
  if (!key) return { ok: false, fieldErrors: { label: 'Use at least one letter or number.' } };

  try {
    await createCustomFieldDef(ctx, {
      entity: parsed.data.entity,
      key,
      label: parsed.data.label,
      type: parsed.data.type,
      ...(parsed.data.options !== undefined && { options: parsed.data.options }),
      required: parsed.data.required,
      showInCatalog: parsed.data.showInCatalog,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('custom_field_defs')) {
      return { ok: false, fieldErrors: { label: 'You already have a field with this name.' } };
    }
    throw error;
  }

  revalidatePath('/app/settings');
  return { ok: true };
}

export async function removeCustomFieldAction(defId: string): Promise<void> {
  const ctx = await requireBusiness();
  await deleteCustomFieldDef(ctx, defId);
  revalidatePath('/app/settings');
}

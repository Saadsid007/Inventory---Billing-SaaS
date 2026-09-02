'use server';

import { getBusiness, updateBusinessProfile, updateSettings, updateStorefrontConfig } from '@billwise/db';
import type { StorefrontConfig } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

export type SaveStorefrontInput = {
  config: StorefrontConfig;
  catalogWhatsapp?: string | null;
  showCatalogPrices?: boolean;
  catalogEnabled?: boolean;
  logoUrl?: string | null;
};

export async function saveStorefrontCustomizationAction(input: SaveStorefrontInput) {
  try {
    const ctx = await requireBusiness();

    // 1. Update storefront configuration
    await updateStorefrontConfig(ctx, input.config);

    // 2. Update common settings (whatsapp, catalog prices, enabled)
    await updateSettings(ctx, {
      ...(input.catalogWhatsapp !== undefined && { catalogWhatsapp: input.catalogWhatsapp }),
      ...(input.showCatalogPrices !== undefined && { showCatalogPrices: input.showCatalogPrices }),
      ...(input.catalogEnabled !== undefined && { catalogEnabled: input.catalogEnabled }),
    });

    // 3. Update logo if provided and user is owner
    if (input.logoUrl !== undefined && ctx.role === 'owner') {
      await updateBusinessProfile(ctx, { logoUrl: input.logoUrl });
    }

    const business = await getBusiness(ctx);
    if (business?.slug) {
      revalidatePath(`/store/${business.slug}`);
      revalidatePath(`/store/${business.slug}/[productSlug]`, 'page');
    }
    revalidatePath('/app/storefront');
    revalidatePath('/app/catalog');

    return { ok: true };
  } catch (error) {
    console.error('Failed to save storefront customization', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to save changes.' };
  }
}

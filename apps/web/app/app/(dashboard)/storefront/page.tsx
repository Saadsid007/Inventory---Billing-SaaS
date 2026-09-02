import { getBusiness, getSettings } from '@billwise/db';
import type { StorefrontConfig } from '@billwise/shared';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { StorefrontCustomizer } from './storefront-customizer';

export const metadata: Metadata = {
  title: 'Storefront Customizer | Online Store Branding & Templates',
};

export default async function StorefrontPage() {
  const ctx = await requireBusiness();
  const [business, settings] = await Promise.all([
    getBusiness(ctx),
    getSettings(ctx),
  ]);

  const config = (settings?.storefrontConfig as StorefrontConfig) || null;

  return (
    <div className="mx-auto max-w-6xl">
      <StorefrontCustomizer
        initialConfig={config}
        businessName={business?.name ?? 'My Store'}
        slug={business?.slug ?? 'store'}
        phone={business?.phone ?? null}
        email={business?.email ?? null}
        logoUrl={business?.logoUrl ?? null}
        showCatalogPrices={settings?.showCatalogPrices ?? true}
        catalogEnabled={settings?.catalogEnabled ?? false}
        city={business?.city ?? null}
        addressLine1={business?.addressLine1 ?? null}
        addressLine2={business?.addressLine2 ?? null}
        pincode={business?.pincode ?? null}
      />
    </div>
  );
}

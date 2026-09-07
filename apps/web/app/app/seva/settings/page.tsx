import { getBusiness, getSettings } from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { SevaSettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Settings, cut to what a Jan Seva Kendra actually sets.
 *
 * The shop's settings page runs to five tabs — profile, invoice numbering,
 * units, categories, custom fields, storefront. A CSC has no units, no
 * categories and no storefront to design. What it has is a shop name, an
 * address and a phone number that need to be right because they print on every
 * receipt, and a GSTIN that is usually blank.
 *
 * The phone number is called out separately: without it the WhatsApp share has
 * no shop number to sign off with, and the customer gets a bill from nobody.
 */
export default async function SevaSettingsPage() {
  const ctx = await requireBusiness();
  const [business, settings] = await Promise.all([getBusiness(ctx), getSettings(ctx)]);

  return (
    <PageBody className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Settings"
        description="All of this is printed on every receipt you give out."
      />
      <SevaSettingsForm
        initial={{
          name: business?.name ?? '',
          phone: business?.phone ?? '',
          addressLine1: business?.addressLine1 ?? '',
          city: business?.city ?? '',
          pincode: business?.pincode ?? '',
          gstin: business?.gstin ?? '',
          invoiceFooter: settings?.invoiceFooter ?? '',
        }}
      />
    </PageBody>
  );
}

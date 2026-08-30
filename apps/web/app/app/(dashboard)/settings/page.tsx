import {
  getBusiness,
  getSettings,
  listCategories,
  listCustomFieldDefs,
  listUnits,
} from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { CategoriesSection } from './categories-section';
import { CustomFieldsSection } from './custom-fields-section';
import { InvoiceSettingsSection } from './invoice-settings-section';
import { BusinessImageSection } from './logo-section';
import { ProfileSection } from './profile-section';
import { UnitsSection } from './units-section';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const ctx = await requireBusiness();

  const [business, settings, units, categories, productFields, partyFields] = await Promise.all([
    getBusiness(ctx),
    getSettings(ctx),
    listUnits(ctx),
    listCategories(ctx),
    listCustomFieldDefs(ctx, 'product'),
    listCustomFieldDefs(ctx, 'party'),
  ]);

  return (
    <PageBody className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Settings"
        description="Your business details, and the lists that shape your products and invoices."
      />

      <ProfileSection
        initial={{
          name: business?.name ?? '',
          legalName: business?.legalName ?? '',
          gstin: business?.gstin ?? '',
          stateCode: business?.stateCode ?? '',
          addressLine1: business?.addressLine1 ?? '',
          addressLine2: business?.addressLine2 ?? '',
          city: business?.city ?? '',
          pincode: business?.pincode ?? '',
          phone: business?.phone ?? '',
          email: business?.email ?? '',
        }}
      />

      <BusinessImageSection
        slot="logo"
        title="Logo"
        description="Printed on your invoices and shown at the top of your public catalog."
        initialUrl={business?.logoUrl ?? null}
      />

      <BusinessImageSection
        slot="signature"
        title="Signature"
        description="Printed above your name at the bottom of an A4 invoice, so a bill can go out already signed."
        hint="A photo or scan of a signature or rubber stamp works. Sign on plain white paper, crop it close, and it will print cleanly. It is not used on 80mm thermal bills, where the print quality is too coarse for it."
        initialUrl={business?.signatureUrl ?? null}
        wide
      />

      <InvoiceSettingsSection
        initial={{
          defaultTaxMode: settings?.defaultTaxMode ?? 'exclusive',
          invoiceTerms: settings?.invoiceTerms ?? '',
          invoiceFooter: settings?.invoiceFooter ?? '',
          showCatalogPrices: settings?.showCatalogPrices ?? true,
          catalogEnabled: settings?.catalogEnabled ?? false,
          catalogWhatsapp: settings?.catalogWhatsapp ?? '',
        }}
      />

      <UnitsSection units={units.map((u) => ({ id: u.id, name: u.name, shortName: u.shortName }))} />

      <CategoriesSection categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <CustomFieldsSection
        productFields={productFields.map((f) => ({ id: f.id, label: f.label, type: f.type }))}
        partyFields={partyFields.map((f) => ({ id: f.id, label: f.label, type: f.type }))}
      />
    </PageBody>
  );
}

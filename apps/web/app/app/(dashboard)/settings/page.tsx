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
import { LogoSection } from './logo-section';
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

      <LogoSection initialUrl={business?.logoUrl ?? null} />

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

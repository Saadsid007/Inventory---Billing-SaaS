import {
  getBusiness,
  getSettings,
  listCustomFieldDefs,
  listUnits,
} from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requireBusiness } from '@/lib/auth/require-business';
import { CustomFieldsSection } from './custom-fields-section';
import { InvoiceSettingsSection } from './invoice-settings-section';
import { BusinessImageSection } from './logo-section';
import { ProfileSection } from './profile-section';
import { SettingsTabs } from './settings-tabs';
import { UnitsSection } from './units-section';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const ctx = await requireBusiness();

  const [business, settings, units, productFields, partyFields] = await Promise.all([
    getBusiness(ctx),
    getSettings(ctx),
    listUnits(ctx),
    listCustomFieldDefs(ctx, 'product'),
    listCustomFieldDefs(ctx, 'party'),
  ]);

  return (
    <PageBody className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your business details, invoices & catalog configuration, and custom master lists."
      />

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}>
        <SettingsTabs
        profileContent={
          <div className="space-y-6">
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

            <div className="grid gap-6 md:grid-cols-2">
              <BusinessImageSection
                slot="logo"
                title="Logo"
                description="Printed on your invoices and shown at the top of your public catalog."
                initialUrl={business?.logoUrl ?? null}
              />

              <BusinessImageSection
                slot="signature"
                title="Signature"
                description="Printed above your name at the bottom of an A4 invoice."
                hint="A photo or scan of a signature or stamp. Sign on plain white paper, crop close."
                initialUrl={business?.signatureUrl ?? null}
                wide
              />
            </div>
          </div>
        }
        invoicingContent={
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
        }
        unitsContent={
          <UnitsSection units={units.map((u) => ({ id: u.id, name: u.name, shortName: u.shortName }))} />
        }
        customFieldsContent={
          <CustomFieldsSection
            productFields={productFields.map((f) => ({ id: f.id, label: f.label, type: f.type }))}
            partyFields={partyFields.map((f) => ({ id: f.id, label: f.label, type: f.type }))}
          />
        }
      />
      </Suspense>
    </PageBody>
  );
}

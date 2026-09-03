import { getBusiness, getSettings, listParties, listProducts } from '@billwise/db';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceForm } from './invoice-form';

export const metadata: Metadata = {
  title: 'Create Invoice · Distraction-Free Billing',
};

export default async function NewInvoicePage() {
  const ctx = await requireBusiness();

  const [business, settings, parties, products] = await Promise.all([
    getBusiness(ctx),
    getSettings(ctx),
    listParties(ctx, { type: 'customer' }),
    // Loaded up front rather than searched over the wire: billing has to work
    // at counter speed, and a few hundred products is a trivial payload.
    listProducts(ctx, { limit: 500 }),
  ]);

  return (
    <main className="min-h-dvh w-full bg-muted/20 px-3 pb-20 pt-3 sm:px-4 sm:pt-4 md:px-6">
      {/* Phone: full width. Desktop/tablet: 80% of the viewport, centered. */}
      <div className="mx-auto w-full max-w-[100%] sm:w-[80%] sm:max-w-none">
        <InvoiceForm
          business={business}
          supplierStateCode={business?.stateCode ?? '09'}
          supplierHasGstin={Boolean(business?.gstin)}
          defaultTaxMode={settings?.defaultTaxMode ?? 'exclusive'}
          defaultTerms={settings?.invoiceTerms ?? ''}
          parties={parties.map((p) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            gstin: p.gstin,
            stateCode: p.stateCode,
          }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            hsnCode: p.hsnCode,
            unitShortName: p.unitShortName,
            salePrice: p.salePrice,
            taxRate: p.taxRate,
            cessRate: p.cessRate,
          }))}
        />
      </div>
    </main>
  );
}

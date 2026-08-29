import { getBusiness, getSettings, listParties, listProducts } from '@bahikhata/db';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceForm } from '../invoice-form';

export const metadata: Metadata = { title: 'New invoice' };

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
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
      <InvoiceForm
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
  );
}

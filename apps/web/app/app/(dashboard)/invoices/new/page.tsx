import { getBusiness, getSettings, listParties, listProducts } from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
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
    <PageBody className="mx-auto max-w-3xl">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All invoices
          </Link>
        }
        title="New invoice"
        description="Pick a customer, add what they bought, and the tax works itself out."
      />
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
    </PageBody>
  );
}

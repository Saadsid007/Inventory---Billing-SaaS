import {
  getBusiness,
  getSettings,
  listBatchesForProducts,
  listParties,
  listProducts,
} from '@billwise/db';
import type { Metadata } from 'next';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';
import { InvoiceForm } from './invoice-form';

export const metadata: Metadata = {
  title: 'Create Invoice · Distraction-Free Billing',
};

export default async function NewInvoicePage() {
  const [ctx, { profile }] = await Promise.all([requireBusiness(), requireMembership()]);

  const [business, settings, parties, products] = await Promise.all([
    getBusiness(ctx),
    getSettings(ctx),
    listParties(ctx, { type: 'customer' }),
    // Loaded up front rather than searched over the wire: billing has to work
    // at counter speed, and a few hundred products is a trivial payload.
    listProducts(ctx, { limit: 500 }),
  ]);

  /*
   * One query for every lot on the shelf, rather than one per line as the form
   * is filled in. A chemist's counter cannot wait on a round trip per item, and
   * the whole list is a few hundred rows.
   *
   * Skipped entirely for a business that does not track batches — which is why
   * a kirana store's billing form costs exactly what it did before.
   */
  const batches = profile.features.batchTracking
    ? await listBatchesForProducts(ctx, products.map((p) => p.id))
    : [];

  const batchesByProduct = new Map<string, typeof batches>();
  for (const batch of batches) {
    const list = batchesByProduct.get(batch.productId);
    if (list) list.push(batch);
    else batchesByProduct.set(batch.productId, [batch]);
  }

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
          batchTracking={profile.features.batchTracking}
          products={products.map((p) => ({
            id: p.id,
            // A chemist searches by salt as often as by brand, so the search
            // box needs it on the option rather than behind another query.
            name: p.name,
            sku: p.sku ?? p.saltComposition,
            hsnCode: p.hsnCode,
            unitShortName: p.unitShortName,
            salePrice: p.salePrice,
            taxRate: p.taxRate,
            cessRate: p.cessRate,
            // Already ordered soonest-expiry-first by the query, which is what
            // makes `batches[0]` the FEFO pick in the form.
            batches: (batchesByProduct.get(p.id) ?? []).map((b) => ({
              id: b.id,
              batchNo: b.batchNo,
              expiryDate: b.expiryDate,
              mrp: b.mrp,
              quantity: b.quantity,
            })),
          }))}
        />
      </div>
    </main>
  );
}

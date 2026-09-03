import { listProducts } from '@billwise/db';
import { Alert, PageBody } from '@billwise/ui';
import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { StockManager } from './stock-manager';

export const metadata: Metadata = { title: 'Stock & Inventory' };

export default async function StockPage() {
  const ctx = await requireBusiness();
  const products = (await listProducts(ctx, { limit: 1000 })).filter((p) => p.trackInventory);

  return (
    <PageBody className="space-y-6">
      <StockManager
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          categoryName: p.categoryName,
          hsnCode: p.hsnCode,
          unit: p.unitShortName,
          currentStock: p.currentStock,
          lowStockAlert: p.lowStockAlert,
          salePrice: p.salePrice,
          purchasePrice: p.purchasePrice,
          imageUrl: p.imageUrls?.[0] ?? null,
        }))}
      />

      <Alert variant="info" icon={Info} title="Inventory Ledger & Stock Adjustments">
        All manual adjustments write signed movement records to your immutable stock ledger.
        Positive quantities represent arrivals/returns; negative quantities record dispatches,
        shrinkage, or breakages.
      </Alert>
    </PageBody>
  );
}

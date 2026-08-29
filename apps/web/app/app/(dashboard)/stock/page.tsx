import { listProducts } from '@bahikhata/db';
import { EmptyState } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { StockForm } from './stock-form';

export const metadata: Metadata = { title: 'Stock in / out' };

export default async function StockPage() {
  const ctx = await requireBusiness();
  const products = (await listProducts(ctx, { limit: 500 })).filter((p) => p.trackInventory);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stock in / out</h1>
        <p className="text-sm text-muted-foreground">
          Record goods arriving or leaving outside a sale — a delivery from a supplier,
          breakage, or a stock count correction.
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState
          title="No products with inventory tracking"
          description="Add a product with tracking switched on, then you can move its stock here."
          action={
            <Link
              href="/app/products/new"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add a product
            </Link>
          }
        />
      ) : (
        <StockForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.unitShortName,
            currentStock: p.currentStock,
          }))}
        />
      )}

      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        This is not a purchase bill. It records a quantity and a reason, nothing more —
        supplier invoices with input-credit fields come in a later release.
      </p>
    </div>
  );
}

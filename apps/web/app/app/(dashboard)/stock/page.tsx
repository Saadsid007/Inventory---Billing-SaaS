import { listProducts } from '@billwise/db';
import { Alert, Button, EmptyState, PageBody, PageHeader } from '@billwise/ui';
import { Info, Package, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { StockForm } from './stock-form';

export const metadata: Metadata = { title: 'Stock in / out' };

export default async function StockPage() {
  const ctx = await requireBusiness();
  const products = (await listProducts(ctx, { limit: 500 })).filter((p) => p.trackInventory);

  return (
    <PageBody className="mx-auto max-w-2xl">
      <PageHeader
        title="Stock in / out"
        description="Record goods arriving or leaving outside a sale: a delivery from a supplier, breakage, or a stock-count correction."
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing to move yet"
          description="Stock movements need a product with inventory tracking switched on. Add one and it will show up here."
          action={
            <Link href="/app/products/new">
              <Button>
                <Plus /> Add a product
              </Button>
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

      <Alert variant="info" icon={Info} title="This is not a purchase bill">
        It records a quantity and a reason, nothing more. Supplier invoices with input-credit
        fields come in a later release.
      </Alert>
    </PageBody>
  );
}

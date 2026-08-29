import { listCategories, listProducts } from '@bahikhata/db';
import {
  Badge,
  EmptyState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { ProductFilterBar } from './filter-bar';

export const metadata: Metadata = { title: 'Products' };

function stockState(p: {
  trackInventory: boolean;
  currentStock: string;
  lowStockAlert: string | null;
}): 'in_stock' | 'low_stock' | 'out_of_stock' | 'untracked' {
  if (!p.trackInventory) return 'untracked';
  const stock = Number(p.currentStock);
  if (stock <= 0) return 'out_of_stock';
  if (p.lowStockAlert !== null && stock <= Number(p.lowStockAlert)) return 'low_stock';
  return 'in_stock';
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; low?: string }>;
}) {
  const ctx = await requireBusiness();
  const { q, category, low } = await searchParams;

  const [products, categories] = await Promise.all([
    listProducts(ctx, {
      search: q,
      categoryId: category,
      lowStockOnly: low === '1',
    }),
    listCategories(ctx),
  ]);

  const isFiltered = Boolean(q || category || low);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'}
            {isFiltered && ' matching your filters'}
          </p>
        </div>
        <Link
          href="/app/products/new"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add product
        </Link>
      </header>

      <ProductFilterBar
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{ q: q ?? '', category: category ?? '', low: low === '1' }}
      />

      {products.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'Nothing matches those filters' : 'No products yet'}
          description={
            isFiltered
              ? 'Try a different search, or clear the filters.'
              : 'Add what you sell. You can bill without adding products first, but a catalogue makes billing much faster.'
          }
          action={
            !isFiltered && (
              <Link
                href="/app/products/new"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add your first product
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Category</TH>
              <TH>HSN</TH>
              <TH numeric>Sale price</TH>
              <TH numeric>Stock</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {products.map((p) => {
              const state = stockState(p);
              return (
                <TR key={p.id}>
                  <TD>
                    <Link
                      href={`/app/products/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.sku && (
                      <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>
                    )}
                  </TD>
                  <TD className="text-muted-foreground">{p.categoryName ?? '—'}</TD>
                  <TD className="tabular text-muted-foreground">{p.hsnCode ?? '—'}</TD>
                  <TD numeric>₹{p.salePrice}</TD>
                  <TD numeric>
                    {state === 'untracked' ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        {p.currentStock}
                        {p.unitShortName && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {p.unitShortName}
                          </span>
                        )}
                      </>
                    )}
                  </TD>
                  <TD>
                    {state === 'untracked' ? (
                      <Badge variant="outline">Service</Badge>
                    ) : state === 'out_of_stock' ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : state === 'low_stock' ? (
                      <Badge variant="warning">Low stock</Badge>
                    ) : (
                      <Badge variant="success">In stock</Badge>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      {products.length >= 200 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the first 200. Narrow the search to see more.
        </p>
      )}
    </div>
  );
}

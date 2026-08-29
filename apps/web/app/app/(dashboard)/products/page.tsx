import { listCategories, listProducts } from '@billwise/db';
import {
  Badge,
  Button,
  EmptyState,
  PageBody,
  PageHeader,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { Package, Plus, SearchX } from 'lucide-react';
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
    <PageBody>
      <PageHeader
        title="Products"
        description={
          isFiltered
            ? `${products.length} ${products.length === 1 ? 'product matches' : 'products match'} your filters.`
            : 'What you sell, with the price, tax rate and how much is left on the shelf.'
        }
        actions={
          <Link href="/app/products/new">
            <Button>
              <Plus /> Add product
            </Button>
          </Link>
        }
      />

      <ProductFilterBar
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{ q: q ?? '', category: category ?? '', low: low === '1' }}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={isFiltered ? SearchX : Package}
          title={isFiltered ? 'Nothing matches those filters' : 'No products yet'}
          description={
            isFiltered
              ? 'Try a different search, or clear the filters and start again.'
              : 'Add what you sell. You can bill without adding products first, but a catalogue makes billing much faster.'
          }
          action={
            !isFiltered && (
              <Link href="/app/products/new">
                <Button>
                  <Plus /> Add your first product
                </Button>
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
                      className="font-medium underline-offset-4 hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.sku && (
                      <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>
                    )}
                  </TD>
                  <TD className="text-muted-foreground">{p.categoryName ?? '-'}</TD>
                  <TD className="tabular text-muted-foreground">{p.hsnCode ?? '-'}</TD>
                  <TD numeric>₹{p.salePrice}</TD>
                  <TD numeric>
                    {state === 'untracked' ? (
                      <span className="text-muted-foreground">-</span>
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
                      <Badge variant="destructive" dot>
                        Out of stock
                      </Badge>
                    ) : state === 'low_stock' ? (
                      <Badge variant="warning" dot>
                        Low stock
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        In stock
                      </Badge>
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
    </PageBody>
  );
}

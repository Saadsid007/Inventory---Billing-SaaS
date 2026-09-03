import { listCategories, listProducts } from '@billwise/db';
import {
  Button,
  EmptyState,
  PageBody,
  PageHeader,
} from '@billwise/ui';
import {
  Package,
  Plus,
  SearchX,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { ProductExportButtons } from './export-buttons';
import { ProductFilterBar } from './filter-bar';
import { ProductsTable } from './products-table';

export const metadata: Metadata = { title: 'Products' };

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
      limit: 200,
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
          <div className="flex flex-wrap items-center gap-2">
            <ProductExportButtons
              currentFilters={{ q: q ?? '', category: category ?? '', low: low === '1' }}
            />
            <Link href="/app/products/new">
              <Button className="h-8.5 gap-1.5 px-3.5 text-xs font-bold shadow-xs">
                <Plus className="size-3.5" /> Add product
              </Button>
            </Link>
          </div>
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
        <ProductsTable products={products} />
      )}

      {products.length >= 200 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the first 200. Narrow the search to see more.
        </p>
      )}
    </PageBody>
  );
}

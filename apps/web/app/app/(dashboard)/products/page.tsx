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
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';
import { ProductExportButtons } from './export-buttons';
import { ProductFilterBar } from './filter-bar';
import { ProductsTable } from './products-table';

export const metadata: Metadata = { title: 'Products' };

/**
 * What this shop sells.
 *
 * Every noun on the screen comes from the business profile, so a chemist reads
 * "Medicines" and a kirana store reads "Products" off the same page against the
 * same table. `requireMembership()` is React-cached, so asking for the profile
 * here costs nothing on top of the guard the layout already ran.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; low?: string }>;
}) {
  const [ctx, { profile }] = await Promise.all([requireBusiness(), requireMembership()]);
  const { q, category, low } = await searchParams;
  const { item, itemPlural } = profile.terms;
  const one = item.toLowerCase();
  const many = itemPlural.toLowerCase();

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
        title={itemPlural}
        description={
          isFiltered
            ? `${products.length} ${products.length === 1 ? `${one} matches` : `${many} match`} your filters.`
            : 'What you sell, with the price, tax rate and how much is left on the shelf.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ProductExportButtons
              currentFilters={{ q: q ?? '', category: category ?? '', low: low === '1' }}
            />
            <Link href="/app/products/new">
              <Button className="h-8.5 gap-1.5 px-3.5 text-xs font-bold shadow-xs">
                <Plus className="size-3.5" /> Add {one}
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
          title={isFiltered ? 'Nothing matches those filters' : `No ${many} yet`}
          description={
            isFiltered
              ? 'Try a different search, or clear the filters and start again.'
              : `Add what you sell. You can bill without adding ${many} first, but a list makes billing much faster.`
          }
          action={
            !isFiltered && (
              <Link href="/app/products/new">
                <Button>
                  <Plus /> Add your first {one}
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

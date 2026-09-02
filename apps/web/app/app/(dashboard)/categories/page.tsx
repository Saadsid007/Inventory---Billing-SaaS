import { listCategoriesWithProductCount } from '@billwise/db';
import { PageBody, PageHeader, StatCard } from '@billwise/ui';
import { FolderTree, Package } from 'lucide-react';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { CategoryManager } from './category-manager';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const ctx = await requireBusiness();
  const categories = await listCategoriesWithProductCount(ctx);

  const totalCategorizedProducts = categories.reduce(
    (sum, c) => sum + (Number(c.productCount) || 0),
    0,
  );

  return (
    <PageBody className="space-y-8">
      <PageHeader
        title="Categories"
        description="Organize your products into categories for faster billing and catalog browsing."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total categories"
          value={categories.length}
          icon={FolderTree}
          hint="Departments & product groups"
        />
        <StatCard
          label="Categorized products"
          value={totalCategorizedProducts}
          icon={Package}
          tone="info"
          hint="Items mapped to a category"
        />
      </div>

      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: Number(c.productCount) || 0,
        }))}
      />
    </PageBody>
  );
}

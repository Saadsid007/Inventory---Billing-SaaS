import { listCategoriesWithProductCount } from '@billwise/db';
import { PageBody } from '@billwise/ui';
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
    <PageBody className="space-y-6">
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: Number(c.productCount) || 0,
        }))}
        totalCategorizedProducts={totalCategorizedProducts}
      />
    </PageBody>
  );
}

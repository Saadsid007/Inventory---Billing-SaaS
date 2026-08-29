import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadProductFormData } from '../_form-data';
import { EMPTY_PRODUCT, ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProductPage() {
  const ctx = await requireBusiness();
  const data = await loadProductFormData(ctx);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
      <ProductForm initial={EMPTY_PRODUCT} {...data} />
    </div>
  );
}

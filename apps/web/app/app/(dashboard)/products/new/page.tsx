import { PageBody, PageHeader } from '@billwise/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadProductFormData } from '../_form-data';
import { EMPTY_PRODUCT, ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProductPage() {
  const ctx = await requireBusiness();
  const data = await loadProductFormData(ctx);

  return (
    <PageBody className="mx-auto max-w-2xl">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/products"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All {data.itemLabel.toLowerCase()}s
          </Link>
        }
        title={`Add ${data.itemLabel.toLowerCase()}`}
        description="Only the name and sale price are required. Everything else can wait."
      />
      <ProductForm initial={EMPTY_PRODUCT} {...data} />
    </PageBody>
  );
}

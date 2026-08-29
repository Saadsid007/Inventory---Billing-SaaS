import { getProduct, listMovements } from '@billwise/db';
import { PageBody, PageHeader, Section, TBody, TD, TH, THead, TR, Table } from '@billwise/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadProductFormData } from '../_form-data';
import { ProductForm } from '../product-form';
import { ProductImages } from '../product-images';

export const metadata: Metadata = { title: 'Edit product' };

const REASON_LABELS: Record<string, string> = {
  opening: 'Opening stock',
  sale: 'Sold',
  stock_in: 'Stock in',
  stock_out: 'Stock out',
  adjustment: 'Adjustment',
  sale_cancelled: 'Sale cancelled',
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [product, data] = await Promise.all([getProduct(ctx, id), loadProductFormData(ctx)]);
  // getProduct is business-scoped, so a foreign id is indistinguishable from a
  // non-existent one — which is exactly what we want to tell the caller.
  if (!product) notFound();

  const movements = product.trackInventory ? await listMovements(ctx, id, 25) : [];

  return (
    <PageBody className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/products"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All products
          </Link>
        }
        title={product.name}
        description={
          product.trackInventory
            ? `${product.currentStock} in stock`
            : 'Inventory tracking is off for this item.'
        }
      />

      <ProductImages
        productId={product.id}
        initialUrls={Array.isArray(product.imageUrls) ? product.imageUrls : []}
      />

      <ProductForm
        productId={product.id}
        initial={{
          name: product.name,
          sku: product.sku ?? '',
          barcode: product.barcode ?? '',
          categoryId: product.categoryId ?? '',
          unitId: product.unitId ?? '',
          hsnCode: product.hsnCode ?? '',
          taxRateId: product.taxRateId ?? '',
          salePrice: product.salePrice,
          purchasePrice: product.purchasePrice ?? '',
          openingStock: product.openingStock,
          lowStockAlert: product.lowStockAlert ?? '',
          trackInventory: product.trackInventory,
          description: product.description ?? '',
          showInCatalog: product.showInCatalog,
          customFields: product.customFields,
        }}
        {...data}
      />

      {product.trackInventory && (
        <Section
          title="Stock history"
          description={`Current stock is ${product.currentStock}, the sum of every movement below.`}
          className="border-t pt-6"
        >
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Reason</TH>
                  <TH>Note</TH>
                  <TH numeric>Change</TH>
                </TR>
              </THead>
              <TBody>
                {movements.map((m) => (
                  <TR key={m.id}>
                    <TD className="text-muted-foreground">
                      {m.createdAt.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TD>
                    <TD>{REASON_LABELS[m.reason] ?? m.reason}</TD>
                    <TD className="text-muted-foreground">{m.note ?? '-'}</TD>
                    <TD numeric className={m.qtyChange.startsWith('-') ? 'text-destructive' : ''}>
                      {m.qtyChange.startsWith('-') ? '' : '+'}
                      {m.qtyChange}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Section>
      )}
    </PageBody>
  );
}

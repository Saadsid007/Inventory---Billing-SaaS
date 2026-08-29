'use server';

import {
  createProduct,
  deactivateProduct,
  getProduct,
  updateProduct,
} from '@bahikhata/db';
import { productSchema } from '@bahikhata/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

/**
 * Product mutations. Build spec Phase 1b.
 *
 * Every action calls `requireBusiness()` itself. The layout guard protects
 * navigation, not a POST — an action is a public endpoint, and forgetting this
 * line is how a suspended or expired account keeps writing data.
 */

export type ProductActionResult =
  | { ok: true; productId: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveProductAction(
  raw: unknown,
  productId?: string,
): Promise<ProductActionResult> {
  const ctx = await requireBusiness();

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const input = parsed.data;

  try {
    if (productId) {
      // Scoped read first: without it, updateProduct would silently no-op on a
      // foreign id and the user would see a success message for nothing.
      const existing = await getProduct(ctx, productId);
      if (!existing) return { ok: false, formError: 'That product no longer exists.' };

      await updateProduct(ctx, productId, {
        name: input.name,
        sku: input.sku ?? null,
        barcode: input.barcode ?? null,
        categoryId: input.categoryId ?? null,
        unitId: input.unitId ?? null,
        hsnCode: input.hsnCode ?? null,
        taxRateId: input.taxRateId ?? null,
        salePrice: input.salePrice,
        purchasePrice: input.purchasePrice ?? null,
        lowStockAlert: input.lowStockAlert ?? null,
        trackInventory: input.trackInventory,
        description: input.description ?? null,
        showInCatalog: input.showInCatalog,
        customFields: input.customFields,
      });

      revalidatePath('/app/products');
      revalidatePath(`/app/products/${productId}`);
      return { ok: true, productId };
    }

    const created = await createProduct(ctx, {
      name: input.name,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      categoryId: input.categoryId ?? null,
      unitId: input.unitId ?? null,
      hsnCode: input.hsnCode ?? null,
      taxRateId: input.taxRateId ?? null,
      salePrice: input.salePrice,
      purchasePrice: input.purchasePrice ?? null,
      openingStock: input.openingStock ?? '0',
      lowStockAlert: input.lowStockAlert ?? null,
      trackInventory: input.trackInventory,
      description: input.description ?? null,
      showInCatalog: input.showInCatalog,
      customFields: input.customFields,
    });

    revalidatePath('/app/products');
    return { ok: true, productId: created!.id };
  } catch (error) {
    // The only unique constraint a user can hit here.
    const message = error instanceof Error ? error.message : '';
    if (message.includes('products_business_sku_unq')) {
      return { ok: false, fieldErrors: { sku: 'Another product already uses this SKU.' } };
    }
    console.error('saveProduct failed', error);
    return { ok: false, formError: 'Could not save the product. Please try again.' };
  }
}

export async function deactivateProductAction(productId: string): Promise<void> {
  const ctx = await requireBusiness();
  await deactivateProduct(ctx, productId);
  revalidatePath('/app/products');
}

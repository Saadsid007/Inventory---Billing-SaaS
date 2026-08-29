'use server';

import { adjustStock, getProduct } from '@bahikhata/db';
import { stockAdjustmentSchema } from '@bahikhata/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

/**
 * Manual stock in / out. Build spec Phase 1g.
 *
 * NOT a purchase bill — quantity, reason and a note, nothing else. Proper
 * supplier invoices with ITC fields are Phase 2, and conflating the two now
 * would mean migrating half-formed purchase records later.
 */

export type StockActionResult =
  | { ok: true; productName: string; newStock: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

export async function adjustStockAction(raw: unknown): Promise<StockActionResult> {
  const ctx = await requireBusiness();

  const parsed = stockAdjustmentSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { productId, direction, qty, note } = parsed.data;

  const product = await getProduct(ctx, productId);
  if (!product) return { ok: false, formError: 'That product no longer exists.' };
  if (!product.trackInventory) {
    return { ok: false, formError: 'This product does not track inventory.' };
  }

  try {
    await adjustStock(ctx, {
      productId,
      // Negative for outward — the ledger stores signed changes so it can be
      // summed straight into current_stock.
      qtyChange: direction === 'in' ? qty : `-${qty}`,
      reason: direction === 'in' ? 'stock_in' : 'stock_out',
      ...(note !== undefined && { note }),
    });
  } catch (error) {
    console.error('stock adjustment failed', error);
    return { ok: false, formError: 'Could not record that. Please try again.' };
  }

  const updated = await getProduct(ctx, productId);

  revalidatePath('/app/stock');
  revalidatePath('/app/products');
  revalidatePath(`/app/products/${productId}`);
  revalidatePath('/app');

  return {
    ok: true,
    productName: product.name,
    newStock: updated?.currentStock ?? product.currentStock,
  };
}

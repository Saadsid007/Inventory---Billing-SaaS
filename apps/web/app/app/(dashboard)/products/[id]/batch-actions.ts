'use server';

import { adjustStock, createBatch, updateBatch, writeOffExpiredBatch } from '@billwise/db';
import { batchSchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness, requireMembership } from '@/lib/auth/require-business';

/**
 * Batches, from the counter.
 *
 * Every action re-checks the guard AND the feature flag. The flag matters as
 * much as the guard here: these endpoints exist on the same deployment a kirana
 * store uses, and a POST does not care which screens that shop can see. A
 * business that does not track batches has no business creating one, even by
 * guessing the URL.
 */

export type BatchResult = { ok: true; id?: string } | { ok: false; error: string };

/** Throws unless this business actually tracks batches. */
async function requireBatchTracking() {
  const [ctx, { profile }] = await Promise.all([requireBusiness(), requireMembership()]);
  if (!profile.features.batchTracking) {
    throw new Error('This business does not track batches.');
  }
  return ctx;
}

/**
 * Add a lot, with the stock that came in with it.
 *
 * The batch and its opening quantity are two steps on purpose: `createBatch`
 * never writes a quantity, and the stock arrives through `adjustStock` so the
 * ledger explains it. Skipping that would put a number on the shelf with
 * nothing recording where it came from.
 */
export async function addBatchAction(raw: unknown): Promise<BatchResult> {
  let ctx: Awaited<ReturnType<typeof requireBatchTracking>>;
  try {
    ctx = await requireBatchTracking();
  } catch {
    return { ok: false, error: 'Batches are not switched on for this business.' };
  }

  const parsed = batchSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }
  const input = parsed.data;

  try {
    const batch = await createBatch(ctx, {
      productId: input.productId,
      batchNo: input.batchNo,
      expiryDate: input.expiryDate ?? null,
      mfgDate: input.mfgDate ?? null,
      mrp: input.mrp ?? null,
      purchasePrice: input.purchasePrice ?? null,
      note: input.note ?? null,
    });

    const qty = Number(input.quantity ?? '0');
    if (qty > 0) {
      await adjustStock(ctx, {
        productId: input.productId,
        batchId: batch.id,
        qtyChange: input.quantity ?? '0',
        reason: 'stock_in',
        note: `Batch ${input.batchNo}`,
      });
    }

    revalidatePath(`/app/products/${input.productId}`);
    revalidatePath('/app/products');
    revalidatePath('/app/expiry');
    return { ok: true, id: batch.id };
  } catch (error) {
    console.error('addBatch failed', error);
    return { ok: false, error: 'Could not save that batch. Please try again.' };
  }
}

export async function updateBatchAction(
  batchId: string,
  productId: string,
  raw: { expiryDate?: string; mfgDate?: string; mrp?: string; purchasePrice?: string },
): Promise<BatchResult> {
  let ctx: Awaited<ReturnType<typeof requireBatchTracking>>;
  try {
    ctx = await requireBatchTracking();
  } catch {
    return { ok: false, error: 'Batches are not switched on for this business.' };
  }

  try {
    await updateBatch(ctx, batchId, {
      expiryDate: raw.expiryDate || null,
      mfgDate: raw.mfgDate || null,
      mrp: raw.mrp || null,
      purchasePrice: raw.purchasePrice || null,
    });
    revalidatePath(`/app/products/${productId}`);
    revalidatePath('/app/expiry');
    return { ok: true };
  } catch (error) {
    console.error('updateBatch failed', error);
    return { ok: false, error: 'Could not update that batch.' };
  }
}

/**
 * Take an expired lot off the shelf.
 *
 * Recorded as a movement with reason `expired`, which is what makes "what did
 * expiry cost me this year" answerable later.
 */
export async function writeOffBatchAction(batchId: string): Promise<BatchResult> {
  let ctx: Awaited<ReturnType<typeof requireBatchTracking>>;
  try {
    ctx = await requireBatchTracking();
  } catch {
    return { ok: false, error: 'Batches are not switched on for this business.' };
  }

  try {
    const { productId } = await writeOffExpiredBatch(ctx, batchId);
    revalidatePath(`/app/products/${productId}`);
    revalidatePath('/app/products');
    revalidatePath('/app/expiry');
    revalidatePath('/app');
    return { ok: true };
  } catch (error) {
    console.error('writeOffBatch failed', error);
    return { ok: false, error: 'Could not write that batch off.' };
  }
}

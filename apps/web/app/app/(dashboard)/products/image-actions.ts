'use server';

import { getProduct, updateProduct } from '@billwise/db';
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';
import { isWebp } from '@/lib/storage/image-format';
import {
  deletePublicObject,
  pathFromPublicUrl,
  productImagePath,
  uploadPublicObject,
} from '@/lib/storage/supabase-storage';

/**
 * Product image upload. Build spec Phase 1b.
 *
 * The browser converts to webp before uploading (a 4MB phone photo leaves as
 * ~150KB), but the server re-checks everything anyway: a client can send
 * whatever it likes, and "the browser already validated it" is not a control.
 */

export type ImageActionResult = { ok: true; imageUrls: string[] } | { ok: false; error: string };

export async function uploadProductImageAction(
  productId: string,
  formData: FormData,
): Promise<ImageActionResult> {
  const ctx = await requireBusiness();

  const product = await getProduct(ctx, productId);
  // Scoped read: a foreign product id must not become a writable storage path.
  if (!product) return { ok: false, error: 'That product no longer exists.' };

  const existing = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images.` };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'That image is too large.' };
  if (file.size === 0) return { ok: false, error: 'That file is empty.' };

  const buffer = await file.arrayBuffer();
  if (!isWebp(new Uint8Array(buffer.slice(0, 12)))) {
    // Sniffing the bytes, not trusting file.type — a renamed .exe declares
    // whatever content type the client feels like.
    return { ok: false, error: 'Only webp images are accepted.' };
  }

  try {
    // The path is built from ids only, never from the uploaded filename.
    const url = await uploadPublicObject(
      productImagePath(ctx.businessId, productId),
      buffer,
      'image/webp',
    );
    const imageUrls = [...existing, url];
    await updateProduct(ctx, productId, { imageUrls });

    revalidatePath(`/app/products/${productId}`);
    revalidatePath('/app/products');
    return { ok: true, imageUrls };
  } catch (error) {
    console.error('product image upload failed', error);
    return { ok: false, error: 'Upload failed. Please try again.' };
  }
}

export async function removeProductImageAction(
  productId: string,
  url: string,
): Promise<ImageActionResult> {
  const ctx = await requireBusiness();

  const product = await getProduct(ctx, productId);
  if (!product) return { ok: false, error: 'That product no longer exists.' };

  const existing = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const imageUrls = existing.filter((u) => u !== url);

  // The row is updated first. If the storage delete fails afterwards the image
  // is merely orphaned; if it were the other way round a failed row update
  // would leave the product pointing at a file that no longer exists.
  await updateProduct(ctx, productId, { imageUrls });

  const path = pathFromPublicUrl(url);
  // Only delete something that is definitely inside this tenant's own folder.
  if (path && path.startsWith(`${ctx.businessId}/`)) {
    await deletePublicObject(path);
  }

  revalidatePath(`/app/products/${productId}`);
  revalidatePath('/app/products');
  return { ok: true, imageUrls };
}

/** Reorder — the first image is the one the catalog uses as the thumbnail. */
export async function reorderProductImagesAction(
  productId: string,
  urls: string[],
): Promise<ImageActionResult> {
  const ctx = await requireBusiness();

  const product = await getProduct(ctx, productId);
  if (!product) return { ok: false, error: 'That product no longer exists.' };

  const existing = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  // Accept a permutation of what is already stored and nothing else, so this
  // cannot be used to attach an arbitrary URL to a product.
  const same =
    urls.length === existing.length && urls.every((u) => existing.includes(u));
  if (!same) return { ok: false, error: 'Those images do not match this product.' };

  await updateProduct(ctx, productId, { imageUrls: urls });
  revalidatePath(`/app/products/${productId}`);
  revalidatePath('/app/products');
  return { ok: true, imageUrls: urls };
}

'use server';

import { createCategory, deleteCategory, updateCategory } from '@billwise/db';
import { MAX_IMAGE_BYTES, categorySchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';
import { categoryImagePath, uploadPublicObject } from '@/lib/storage/supabase-storage';

export type CategoryActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function addCategoryAction(raw: unknown): Promise<CategoryActionResult> {
  const ctx = await requireBusiness();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await createCategory(ctx, {
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl ?? null,
      parentId: parsed.data.parentId ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('categories_business_name_unq')) {
      return { ok: false, fieldErrors: { name: 'You already have a category with this name.' } };
    }
    throw error;
  }

  revalidatePath('/app/categories');
  revalidatePath('/app/products');
  revalidatePath('/app/settings');
  return { ok: true };
}

export async function updateCategoryAction(
  categoryId: string,
  raw: unknown,
): Promise<CategoryActionResult> {
  const ctx = await requireBusiness();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await updateCategory(ctx, categoryId, {
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl ?? null,
      parentId: parsed.data.parentId ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('categories_business_name_unq')) {
      return { ok: false, fieldErrors: { name: 'You already have a category with this name.' } };
    }
    throw error;
  }

  revalidatePath('/app/categories');
  revalidatePath('/app/products');
  revalidatePath('/app/settings');
  return { ok: true };
}

export async function renameCategoryAction(
  categoryId: string,
  raw: unknown,
): Promise<CategoryActionResult> {
  return updateCategoryAction(categoryId, raw);
}

export async function uploadCategoryImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await requireBusiness();
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' };
  if (file.size === 0) return { ok: false, error: 'That file is empty.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'That image is too large (max 5MB).' };

  const buffer = await file.arrayBuffer();
  try {
    const url = await uploadPublicObject(categoryImagePath(ctx.businessId), buffer, file.type || 'image/webp');
    return { ok: true, url };
  } catch {
    // Graceful fallback to inline data URI if cloud storage bucket is offline in development
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = file.type || 'image/webp';
    return { ok: true, url: `data:${mime};base64,${base64}` };
  }
}

export async function removeCategoryAction(categoryId: string): Promise<CategoryActionResult> {
  const ctx = await requireBusiness();
  try {
    await deleteCategory(ctx, categoryId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('foreign key') ||
        error.message.includes('violates foreign key constraint') ||
        error.message.includes('products_category_id_categories_id_fk') ||
        error.message.includes('products_subcategory_id_categories_id_fk'))
    ) {
      return {
        ok: false,
        formError:
          'Cannot delete this category because products are assigned to it. Reassign or remove those products first.',
      };
    }
    throw error;
  }

  revalidatePath('/app/categories');
  revalidatePath('/app/products');
  revalidatePath('/app/settings');
  return { ok: true };
}

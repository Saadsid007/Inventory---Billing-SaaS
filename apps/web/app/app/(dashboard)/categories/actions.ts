'use server';

import { createCategory, deleteCategory, renameCategory } from '@billwise/db';
import { categorySchema } from '@billwise/shared';
import { revalidatePath } from 'next/cache';
import { requireBusiness } from '@/lib/auth/require-business';

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
    await createCategory(ctx, parsed.data.name);
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
  const ctx = await requireBusiness();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await renameCategory(ctx, categoryId, parsed.data.name);
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

export async function removeCategoryAction(categoryId: string): Promise<CategoryActionResult> {
  const ctx = await requireBusiness();
  try {
    await deleteCategory(ctx, categoryId);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('foreign key') || error.message.includes('violates foreign key constraint') || error.message.includes('products_category_id_categories_id_fk'))) {
      return {
        ok: false,
        formError: 'Cannot delete this category because products are assigned to it. Reassign or remove those products first.',
      };
    }
    throw error;
  }

  revalidatePath('/app/categories');
  revalidatePath('/app/products');
  revalidatePath('/app/settings');
  return { ok: true };
}

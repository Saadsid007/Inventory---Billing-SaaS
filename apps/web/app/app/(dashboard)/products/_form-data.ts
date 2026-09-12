import { listCategories, listCustomFieldDefs, listTaxRates, listUnits } from '@billwise/db';
import type { TenantCtx } from '@billwise/shared';
import { requireMembership } from '@/lib/auth/require-business';
import type { CategoryFormOption, CustomFieldDefView, FormOption } from './product-form';

/**
 * Everything the product form needs to render its pickers.
 *
 * Shared by the new and edit pages so the two can never drift into offering
 * different options for the same business.
 */
export async function loadProductFormData(ctx: TenantCtx): Promise<{
  categories: CategoryFormOption[];
  units: FormOption[];
  taxRates: FormOption[];
  customFieldDefs: CustomFieldDefView[];
  pharmacyFields: boolean;
  itemLabel: string;
}> {
  const [categories, units, taxRates, defs, { profile }] = await Promise.all([
    listCategories(ctx),
    listUnits(ctx),
    listTaxRates(ctx),
    listCustomFieldDefs(ctx, 'product'),
    // React-cached, so this is the same read the layout's guard already did.
    // Loaded here rather than in each page so the new and edit forms cannot
    // end up disagreeing about whether this business is a chemist.
    requireMembership(),
  ]);

  return {
    pharmacyFields: profile.features.pharmacyFields,
    itemLabel: profile.terms.item,
    categories: categories.map((c) => ({
      id: c.id,
      label: c.name,
      parentId: c.parentId,
      imageUrl: c.imageUrl,
    })),
    units: units.map((u) => ({ id: u.id, label: `${u.name} (${u.shortName})` })),
    taxRates: taxRates.map((t) => ({
      id: t.id,
      label: Number(t.cessRate) > 0 ? `${t.name} + ${t.cessRate}% cess` : t.name,
    })),
    customFieldDefs: defs.map((d) => ({
      id: d.id,
      key: d.key,
      label: d.label,
      type: d.type,
      options: d.options,
      required: d.required,
    })),
  };
}

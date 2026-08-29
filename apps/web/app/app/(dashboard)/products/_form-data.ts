import { listCategories, listCustomFieldDefs, listTaxRates, listUnits } from '@bahikhata/db';
import type { TenantCtx } from '@bahikhata/shared';
import type { CustomFieldDefView, FormOption } from './product-form';

/**
 * Everything the product form needs to render its pickers.
 *
 * Shared by the new and edit pages so the two can never drift into offering
 * different options for the same business.
 */
export async function loadProductFormData(ctx: TenantCtx): Promise<{
  categories: FormOption[];
  units: FormOption[];
  taxRates: FormOption[];
  customFieldDefs: CustomFieldDefView[];
}> {
  const [categories, units, taxRates, defs] = await Promise.all([
    listCategories(ctx),
    listUnits(ctx),
    listTaxRates(ctx),
    listCustomFieldDefs(ctx, 'product'),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, label: c.name })),
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

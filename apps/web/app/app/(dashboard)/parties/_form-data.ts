import { listCustomFieldDefs } from '@billwise/db';
import type { TenantCtx } from '@billwise/shared';
import type { CustomFieldDefView } from './party-form';

export async function loadPartyFormData(
  ctx: TenantCtx,
): Promise<{ customFieldDefs: CustomFieldDefView[] }> {
  const defs = await listCustomFieldDefs(ctx, 'party');
  return {
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

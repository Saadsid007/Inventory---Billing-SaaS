import { listCustomFieldDefs } from '@bahikhata/db';
import type { TenantCtx } from '@bahikhata/shared';
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

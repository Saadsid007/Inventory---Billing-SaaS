import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadPartyFormData } from '../_form-data';
import { EMPTY_PARTY, PartyForm } from '../party-form';

export const metadata: Metadata = { title: 'Add contact' };

export default async function NewPartyPage() {
  const ctx = await requireBusiness();
  const { customFieldDefs } = await loadPartyFormData(ctx);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add contact</h1>
      <PartyForm initial={EMPTY_PARTY} customFieldDefs={customFieldDefs} />
    </div>
  );
}

import { PageBody, PageHeader } from '@bahikhata/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadPartyFormData } from '../_form-data';
import { EMPTY_PARTY, PartyForm } from '../party-form';

export const metadata: Metadata = { title: 'Add contact' };

export default async function NewPartyPage() {
  const ctx = await requireBusiness();
  const { customFieldDefs } = await loadPartyFormData(ctx);

  return (
    <PageBody className="mx-auto max-w-2xl">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/parties"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All contacts
          </Link>
        }
        title="Add contact"
        description="A name is enough to start. GSTIN and address matter only for GST invoices."
      />
      <PartyForm initial={EMPTY_PARTY} customFieldDefs={customFieldDefs} />
    </PageBody>
  );
}

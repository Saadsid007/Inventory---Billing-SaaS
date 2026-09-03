import { getParty, getPartyBalance, listOpenInvoices, listPartyLedger } from '@billwise/db';
import { PageBody } from '@billwise/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadPartyFormData } from '../_form-data';
import { PartyDetailView, type LedgerRow } from './party-detail-view';

export const metadata: Metadata = { title: 'Contact Details & Khata' };

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [party, balance, ledger, openInvoices, formData] = await Promise.all([
    getParty(ctx, id),
    getPartyBalance(ctx, id),
    listPartyLedger(ctx, id),
    listOpenInvoices(ctx, id),
    loadPartyFormData(ctx),
  ]);

  if (!party) notFound();

  let running = Number(party.openingBalance);
  const rows: LedgerRow[] = ledger.map((entry) => {
    running += Number(entry.amount);
    return { ...entry, running };
  });

  const outstanding = Number(balance?.outstanding ?? party.openingBalance);

  return (
    <PageBody className="mx-auto max-w-5xl">
      <PartyDetailView
        party={party}
        outstanding={outstanding}
        rows={rows}
        openInvoices={openInvoices}
        customFieldDefs={formData.customFieldDefs}
      />
    </PageBody>
  );
}

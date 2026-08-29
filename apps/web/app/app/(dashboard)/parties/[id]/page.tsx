import { getParty, getPartyBalance, listPartyLedger } from '@bahikhata/db';
import { Badge, EmptyState, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadPartyFormData } from '../_form-data';
import { PartyForm } from '../party-form';

export const metadata: Metadata = { title: 'Contact' };

const inr = (n: number) => `₹${n.toFixed(2)}`;

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [party, balance, ledger, formData] = await Promise.all([
    getParty(ctx, id),
    getPartyBalance(ctx, id),
    listPartyLedger(ctx, id),
    loadPartyFormData(ctx),
  ]);

  // getParty is business-scoped, so a foreign id is indistinguishable from a
  // missing one — which is exactly what the caller should be told.
  if (!party) notFound();

  /**
   * Running balance, computed forward from the opening balance.
   *
   * Deliberately recomputed here rather than stored: a stored running balance
   * has to be rewritten every time an older entry is corrected, and the day
   * that rewrite is missed the ledger silently stops adding up.
   */
  let running = Number(party.openingBalance);
  const rows = ledger.map((entry) => {
    running += Number(entry.amount);
    return { ...entry, running };
  });

  const outstanding = Number(balance?.outstanding ?? party.openingBalance);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{party.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{party.type}</Badge>
            {party.phone && <span className="tabular">{party.phone}</span>}
            {party.gstin && <span className="tabular">{party.gstin}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
          <p className="tabular text-2xl font-semibold">{inr(outstanding)}</p>
          <p className="text-xs text-muted-foreground">
            {outstanding > 0
              ? 'They owe you'
              : outstanding < 0
                ? 'You owe them'
                : 'Settled up'}
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Ledger</h2>

        {rows.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description={
              Number(party.openingBalance) !== 0
                ? `Opening balance of ${inr(Number(party.openingBalance))} carried forward. Invoices and payments will appear here.`
                : 'Invoices and payments for this contact will appear here.'
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Entry</TH>
                <TH numeric>Amount</TH>
                <TH numeric>Balance</TH>
              </TR>
            </THead>
            <TBody>
              {/* Opening balance is the ledger's starting point, so it is shown
                  as its own row rather than folded silently into the first
                  running total. */}
              <TR>
                <TD className="text-muted-foreground">—</TD>
                <TD className="text-muted-foreground">Opening balance</TD>
                <TD numeric className="text-muted-foreground">
                  {inr(Number(party.openingBalance))}
                </TD>
                <TD numeric>{inr(Number(party.openingBalance))}</TD>
              </TR>
              {rows.map((entry) => (
                <TR key={`${entry.kind}-${entry.id}`}>
                  <TD className="tabular text-muted-foreground">{entry.date}</TD>
                  <TD>
                    <span className="capitalize">{entry.label}</span>
                  </TD>
                  <TD
                    numeric
                    className={Number(entry.amount) < 0 ? 'text-success' : undefined}
                  >
                    {Number(entry.amount) < 0 ? '' : '+'}
                    {inr(Number(entry.amount))}
                  </TD>
                  <TD numeric className="font-medium">
                    {inr(entry.running)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="space-y-4 border-t pt-8">
        <h2 className="text-sm font-medium">Details</h2>
        <PartyForm
          partyId={party.id}
          initial={{
            type: party.type,
            name: party.name,
            phone: party.phone ?? '',
            email: party.email ?? '',
            gstin: party.gstin ?? '',
            stateCode: party.stateCode ?? '',
            addressLine1: party.addressLine1 ?? '',
            city: party.city ?? '',
            pincode: party.pincode ?? '',
            openingBalance: party.openingBalance,
            customFields: party.customFields,
          }}
          customFieldDefs={formData.customFieldDefs}
        />
      </section>
    </div>
  );
}

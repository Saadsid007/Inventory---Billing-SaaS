import { getParty, getPartyBalance, listOpenInvoices, listPartyLedger } from '@billwise/db';
import {
  Badge,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Section,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { loadPartyFormData } from '../_form-data';
import { PartyForm } from '../party-form';
import { PaymentPanel } from './payment-panel';

export const metadata: Metadata = { title: 'Contact' };

const inr = (n: number) => `₹${n.toFixed(2)}`;

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
    <PageBody className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/parties"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All contacts
          </Link>
        }
        title={party.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {party.type}
            </Badge>
            {party.phone && <span className="tabular">{party.phone}</span>}
            {party.gstin && <span className="tabular">{party.gstin}</span>}
          </span>
        }
        actions={
          <Card className="px-5 py-3 text-right">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Outstanding
            </p>
            <p
              className={`tabular mt-0.5 text-2xl font-semibold ${
                outstanding > 0 ? 'text-warning' : ''
              }`}
            >
              {inr(outstanding)}
            </p>
            <p className="text-xs text-muted-foreground">
              {outstanding > 0 ? 'They owe you' : outstanding < 0 ? 'You owe them' : 'Settled up'}
            </p>
          </Card>
        }
      />

      {/* Above the ledger on purpose: taking money is the thing a shopkeeper
          opens this page to do, and reading the history is what they do to
          check it afterwards. */}
      <PaymentPanel
        partyId={party.id}
        partyName={party.name}
        openInvoices={openInvoices.map((i) => ({
          id: i.id,
          invoiceNo: i.invoiceNo,
          invoiceDate: i.invoiceDate,
          due: i.due,
        }))}
        outstanding={outstanding.toFixed(2)}
      />

      <Section title="Ledger" description="Every bill and payment, with a running balance.">
        {rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
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
                <TD className="text-muted-foreground">-</TD>
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
                    {/* Labels arrive as `tax_invoice 001` from the ledger query;
                        an underscore on screen looks like a leaked column name. */}
                    <span className="capitalize">{entry.label.replace(/_/g, ' ')}</span>
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
      </Section>

      <Section title="Details" className="border-t pt-8">
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
      </Section>
    </PageBody>
  );
}

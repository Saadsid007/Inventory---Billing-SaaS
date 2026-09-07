import { getParty, getPartyBalance, listApplications, listInvoices } from '@billwise/db';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@billwise/shared';
import {
  Badge,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import { ArrowLeft, ClipboardList, Receipt } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Customer' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const badgeFor = (status: ApplicationStatus) =>
  status === 'ready'
    ? 'success'
    : status === 'rejected'
      ? 'destructive'
      : status === 'delivered'
        ? 'secondary'
        : 'info';

/**
 * One customer: what they owe, their work, and their receipts.
 *
 * Not a running ledger. That view answers "how did this balance come about",
 * which is an accountant's question. The counter's question is "what is this
 * person's stuff and what do they owe me", and two lists answer it.
 */
export default async function SevaCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [party, balance] = await Promise.all([getParty(ctx, id), getPartyBalance(ctx, id)]);
  if (!party) notFound();

  const [receipts, work] = await Promise.all([
    listInvoices(ctx, { partyId: id, limit: 50 }),
    listApplications(ctx, { partyId: id, limit: 50 }),
  ]);

  const outstanding = Number(balance?.outstanding ?? 0);

  return (
    <PageBody className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/seva/customers"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All customers
          </Link>
        }
        title={party.name}
        description={party.phone ?? undefined}
        actions={
          <Card className="px-5 py-3 text-right">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Baaki
            </p>
            <p
              className={`tabular mt-0.5 text-2xl font-semibold ${
                outstanding > 0 ? 'text-warning' : ''
              }`}
            >
              {inr(outstanding)}
            </p>
          </Card>
        }
      />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="size-4" /> Kaam
        </h2>
        {work.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Koi kaam nahi"
            description="Is customer ka koi kaam register pe nahi hai."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Kaam</TH>
                <TH>Reference</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {work.map((w) => (
                <TR key={w.id}>
                  <TD>{w.serviceName}</TD>
                  <TD className="tabular text-xs">{w.referenceNo ?? '—'}</TD>
                  <TD>
                    <Badge variant={badgeFor(w.status)}>
                      {APPLICATION_STATUS_LABELS[w.status]}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Receipt className="size-4" /> Receipts
        </h2>
        {receipts.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Koi receipt nahi"
            description="Abhi tak koi bill nahi bana."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Date</TH>
                <TH numeric>Total</TH>
                <TH numeric>Baaki</TH>
              </TR>
            </THead>
            <TBody>
              {receipts.map((row) => {
                const due = Number(row.grandTotal) - Number(row.amountPaid);
                return (
                  <TR key={row.id}>
                    <TD>
                      <Link href={`/app/seva/receipts/${row.id}`} className={tableLinkClass}>
                        {row.invoiceNo ?? 'Draft'}
                      </Link>
                    </TD>
                    <TD className="tabular text-muted-foreground">{shortDate(row.invoiceDate)}</TD>
                    <TD numeric>{inr(row.grandTotal)}</TD>
                    <TD numeric className={due > 0 ? 'text-warning' : 'text-muted-foreground'}>
                      {due > 0 ? inr(due.toFixed(2)) : '—'}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>
    </PageBody>
  );
}

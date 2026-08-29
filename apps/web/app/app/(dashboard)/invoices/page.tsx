import { listInvoices } from '@bahikhata/db';
import { INVOICE_KIND_LABELS, type InvoiceKind } from '@bahikhata/shared';
import { Badge, EmptyState, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceFilterBar } from './filter-bar';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    kind?: string;
    status?: string;
    payment?: string;
  }>;
}) {
  const ctx = await requireBusiness();
  const sp = await searchParams;

  const invoices = await listInvoices(ctx, {
    search: sp.q,
    from: sp.from,
    to: sp.to,
    kind: sp.kind as InvoiceKind | undefined,
    status: sp.status as 'draft' | 'issued' | 'cancelled' | undefined,
    paymentStatus: sp.payment as 'unpaid' | 'partial' | 'paid' | undefined,
  });

  const isFiltered = Boolean(sp.q || sp.from || sp.to || sp.kind || sp.status || sp.payment);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {invoices.length} {invoices.length === 1 ? 'document' : 'documents'}
            {isFiltered && ' matching your filters'}
          </p>
        </div>
        <Link
          href="/app/invoices/new"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New invoice
        </Link>
      </header>

      <InvoiceFilterBar
        initial={{
          q: sp.q ?? '',
          from: sp.from ?? '',
          to: sp.to ?? '',
          kind: sp.kind ?? '',
          status: sp.status ?? '',
          payment: sp.payment ?? '',
        }}
      />

      {invoices.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'Nothing matches those filters' : 'No invoices yet'}
          description={
            isFiltered
              ? 'Try a wider date range, or clear the filters.'
              : 'Make your first bill. You do not need products first — items can be typed straight onto the invoice.'
          }
          action={
            !isFiltered && (
              <Link
                href="/app/invoices/new"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create your first invoice
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Date</TH>
              <TH>Customer</TH>
              <TH>Type</TH>
              <TH numeric>Total</TH>
              <TH>Payment</TH>
            </TR>
          </THead>
          <TBody>
            {invoices.map((inv) => (
              <TR key={inv.id}>
                <TD>
                  <Link href={`/app/invoices/${inv.id}`} className="font-medium hover:underline">
                    {inv.invoiceNo ?? 'Draft'}
                  </Link>
                  {/* A cancelled invoice KEEPS its number (spec §5.1) — the badge
                      is what tells the reader it is void, not a missing number. */}
                  {inv.status === 'cancelled' && (
                    <Badge variant="destructive" className="ml-2">
                      Cancelled
                    </Badge>
                  )}
                  {inv.status === 'draft' && (
                    <Badge variant="outline" className="ml-2">
                      Draft
                    </Badge>
                  )}
                </TD>
                <TD className="tabular text-muted-foreground">{inv.invoiceDate}</TD>
                <TD>{inv.partyName}</TD>
                <TD className="text-muted-foreground">{INVOICE_KIND_LABELS[inv.kind]}</TD>
                <TD numeric>₹{inv.grandTotal}</TD>
                <TD>
                  {inv.status !== 'issued' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : inv.paymentStatus === 'paid' ? (
                    <Badge variant="success">Paid</Badge>
                  ) : inv.paymentStatus === 'partial' ? (
                    <Badge variant="warning">
                      ₹{inv.amountPaid} of ₹{inv.grandTotal}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unpaid</Badge>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

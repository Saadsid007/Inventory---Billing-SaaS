import { listInvoices } from '@billwise/db';
import { INVOICE_KIND_LABELS, type InvoiceKind } from '@billwise/shared';
import {
  Badge,
  Button,
  EmptyState,
  PageBody,
  PageHeader,
  RowActions,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  tableLinkClass,
} from '@billwise/ui';
import {
  Calendar,
  CreditCard,
  Eye,
  FileText,
  Hash,
  Pencil,
  Plus,
  Printer,
  SearchX,
  User,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceFilterBar } from './filter-bar';

export const metadata: Metadata = { title: 'Invoices' };

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

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
    <PageBody>
      <PageHeader
        title="Invoices"
        description={
          isFiltered
            ? `${invoices.length} ${invoices.length === 1 ? 'document matches' : 'documents match'} your filters.`
            : 'Every bill, estimate and challan you have made, newest first.'
        }
        actions={
          <Link href="/app/invoices/new">
            <Button>
              <Plus /> New invoice
            </Button>
          </Link>
        }
      />

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
          icon={isFiltered ? SearchX : FileText}
          title={isFiltered ? 'Nothing matches those filters' : 'No invoices yet'}
          description={
            isFiltered
              ? 'Try a wider date range, or clear the filters and start again.'
              : 'Make your first bill. You do not need to add products first, since items can be typed straight onto the invoice.'
          }
          action={
            !isFiltered && (
              <Link href="/app/invoices/new">
                <Button>
                  <Plus /> Create your first invoice
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH icon={Hash}>Number</TH>
              <TH icon={Calendar}>Date</TH>
              <TH icon={User}>Customer</TH>
              <TH icon={FileText}>Type</TH>
              <TH icon={CreditCard} numeric>
                Total
              </TH>
              <TH icon={CreditCard}>Payment</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {invoices.map((inv) => (
              <TR key={inv.id}>
                <TD>
                  <Link href={`/app/invoices/${inv.id}`} className={tableLinkClass}>
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
                <TD className="tabular whitespace-nowrap text-muted-foreground">
                  {shortDate(inv.invoiceDate)}
                </TD>
                <TD className="max-w-[14rem] truncate">{inv.partyName}</TD>
                <TD className="text-muted-foreground">{INVOICE_KIND_LABELS[inv.kind]}</TD>
                <TD numeric className="font-medium">
                  ₹{inv.grandTotal}
                </TD>
                <TD>
                  {inv.status !== 'issued' ? (
                    <span className="text-muted-foreground">-</span>
                  ) : inv.paymentStatus === 'paid' ? (
                    <Badge variant="success" dot>
                      Paid
                    </Badge>
                  ) : inv.paymentStatus === 'partial' ? (
                    <Badge variant="warning" dot>
                      ₹{inv.amountPaid} of ₹{inv.grandTotal}
                    </Badge>
                  ) : (
                    <Badge variant="outline" dot>
                      Unpaid
                    </Badge>
                  )}
                </TD>
                <TD>
                  <RowActions>
                    <Link href={`/app/invoices/${inv.id}`}>
                      <Button variant="success" size="table">
                        <Eye className="size-3" />
                        View
                      </Button>
                    </Link>
                    {inv.status === 'draft' && (
                      <Link href={`/app/invoices/${inv.id}`}>
                        <Button variant="outline" size="table" title="Edit draft">
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                      </Link>
                    )}
                    {inv.status === 'issued' && (
                      <Link href={`/app/invoices/${inv.id}/print`} target="_blank">
                        <Button variant="outline" size="table" title="Print invoice">
                          <Printer className="size-3" />
                          Print
                        </Button>
                      </Link>
                    )}
                  </RowActions>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </PageBody>
  );
}

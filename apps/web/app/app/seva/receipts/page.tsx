import { listInvoices } from '@billwise/db';
import {
  Badge,
  Button,
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
import { Plus, Receipt } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { ReceiptFilters } from './receipt-filters';

export const metadata: Metadata = { title: 'Receipts' };

const inr = (v: string) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * Receipts.
 *
 * Six columns against the shop invoice list's nine. No document type, because
 * there is only one here; no returns column, because a CSC does not take work
 * back. What is added is the balance, in its own column — half-paid is the
 * normal state of a receipt at this counter, not an exception.
 */
export default async function SevaReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; payment?: string }>;
}) {
  const ctx = await requireBusiness();
  const { q, payment } = await searchParams;

  const rows = await listInvoices(ctx, {
    search: q,
    paymentStatus: payment === 'unpaid' || payment === 'partial' || payment === 'paid'
      ? payment
      : undefined,
    limit: 200,
  });

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Receipts"
        description="Jo bhi bill aapne banaye hain, aur kis pe kitna baaki hai."
        actions={
          <Link href="/app/seva/receipts/new">
            <Button>
              <Plus /> New receipt
            </Button>
          </Link>
        }
      />

      <ReceiptFilters initialQuery={q ?? ''} initialPayment={payment ?? ''} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Koi receipt nahi mili"
          description="Naya receipt banaiye — do tap me ho jaata hai."
          action={
            <Link href="/app/seva/receipts/new">
              <Button>
                <Plus /> New receipt
              </Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Date</TH>
              <TH>Customer</TH>
              <TH numeric>Total</TH>
              <TH numeric>Baaki</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => {
              const balance = Number(row.grandTotal) - Number(row.amountPaid);
              return (
                <TR key={row.id}>
                  <TD>
                    <Link href={`/app/seva/receipts/${row.id}`} className={tableLinkClass}>
                      {row.invoiceNo ?? 'Draft'}
                    </Link>
                  </TD>
                  <TD className="tabular text-muted-foreground">{shortDate(row.invoiceDate)}</TD>
                  <TD className="truncate">{row.partyName}</TD>
                  <TD numeric>{inr(row.grandTotal)}</TD>
                  <TD numeric className={balance > 0 ? 'font-medium text-warning' : 'text-muted-foreground'}>
                    {balance > 0 ? inr(balance.toFixed(2)) : '—'}
                  </TD>
                  <TD>
                    <Badge
                      variant={
                        row.status === 'cancelled'
                          ? 'destructive'
                          : row.paymentStatus === 'paid'
                            ? 'success'
                            : row.paymentStatus === 'partial'
                              ? 'warning'
                              : 'secondary'
                      }
                    >
                      {row.status === 'cancelled'
                        ? 'Cancelled'
                        : row.paymentStatus === 'paid'
                          ? 'Paid'
                          : row.paymentStatus === 'partial'
                            ? 'Part paid'
                            : 'Unpaid'}
                    </Badge>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </PageBody>
  );
}

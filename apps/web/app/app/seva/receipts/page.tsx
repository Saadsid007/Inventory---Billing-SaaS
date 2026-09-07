import { listInvoices } from '@billwise/db';
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
import { Eye, Plus, Printer, Receipt } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { CollectDialog } from './collect-dialog';
import { ReceiptFilters } from './receipt-filters';

export const metadata: Metadata = { title: 'Receipts' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const iconButtonClass =
  'rounded-lg border border-border/80 bg-card p-1.5 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary-subtle hover:text-primary';

/**
 * Receipts.
 *
 * Six columns against the shop invoice list's nine. No document type, because
 * there is only one here; no returns column, because a CSC does not take work
 * back. What is added is the balance, in its own column — half-paid is the
 * normal state of a receipt at this counter, not an exception.
 *
 * ## Why the actions are on the row
 *
 * The three things anyone does with a receipt are look at it, print it again,
 * and take the money that is still owed. All three used to require opening the
 * receipt first, which is a page load in the middle of a conversation with
 * somebody standing at the counter. Now the row does all three, and the detail
 * page is for when you actually want the detail.
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
    paymentStatus:
      payment === 'unpaid' || payment === 'partial' || payment === 'paid' ? payment : undefined,
    limit: 200,
  });

  const owed = rows.reduce(
    (sum, r) =>
      r.status === 'cancelled'
        ? sum
        : sum + Math.max(0, Number(r.grandTotal) - Number(r.amountPaid)),
    0,
  );

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Receipts"
        description="Every receipt you have made, and who still owes you money."
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
          title="No receipts here"
          description="Make one — it takes two taps."
          action={
            <Link href="/app/seva/receipts/new">
              <Button>
                <Plus /> New receipt
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {owed > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="tabular font-semibold text-warning">{inr(owed)}</span> still to
              collect across {rows.length} receipt{rows.length === 1 ? '' : 's'} shown.
            </p>
          )}

          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Date</TH>
                <TH>Customer</TH>
                <TH numeric>Total</TH>
                <TH numeric>Outstanding</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => {
                const balance = Number(row.grandTotal) - Number(row.amountPaid);
                const cancelled = row.status === 'cancelled';
                const receiptNo = row.invoiceNo ?? 'Draft';

                return (
                  <TR key={row.id}>
                    <TD>
                      <Link href={`/app/seva/receipts/${row.id}`} className={tableLinkClass}>
                        {receiptNo}
                      </Link>
                    </TD>
                    <TD className="tabular text-muted-foreground">{shortDate(row.invoiceDate)}</TD>
                    <TD className="truncate">{row.partyName}</TD>
                    <TD numeric>{inr(row.grandTotal)}</TD>
                    <TD
                      numeric
                      className={
                        balance > 0 && !cancelled
                          ? 'font-medium text-warning'
                          : 'text-muted-foreground'
                      }
                    >
                      {balance > 0 && !cancelled ? inr(balance) : '—'}
                    </TD>
                    <TD>
                      <Badge
                        variant={
                          cancelled
                            ? 'destructive'
                            : row.paymentStatus === 'paid'
                              ? 'success'
                              : row.paymentStatus === 'partial'
                                ? 'warning'
                                : 'secondary'
                        }
                      >
                        {cancelled
                          ? 'Cancelled'
                          : row.paymentStatus === 'paid'
                            ? 'Paid'
                            : row.paymentStatus === 'partial'
                              ? 'Part paid'
                              : 'Unpaid'}
                      </Badge>
                    </TD>
                    <TD>
                      <RowActions>
                        {/* Only when there is something to take. A "take
                            payment" button on a settled receipt is a button
                            whose only outcome is an error message. */}
                        {!cancelled && balance > 0 && (
                          <CollectDialog
                            invoiceId={row.id}
                            balance={balance.toFixed(2)}
                            receiptNo={receiptNo}
                            partyName={row.partyName}
                            trigger="icon"
                          />
                        )}
                        <Link
                          href={`/app/seva/receipts/${row.id}`}
                          title="Open"
                          aria-label={`Open ${receiptNo}`}
                          className={iconButtonClass}
                        >
                          <Eye className="size-4" />
                        </Link>
                        <Link
                          href={`/app/receipts/${row.id}/print`}
                          title="Print"
                          aria-label={`Print ${receiptNo}`}
                          className={iconButtonClass}
                        >
                          <Printer className="size-4" />
                        </Link>
                      </RowActions>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </>
      )}
    </PageBody>
  );
}

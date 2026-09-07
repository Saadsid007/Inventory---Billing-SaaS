import {
  getBusiness,
  getInvoice,
  listApplicationsForInvoice,
  listInvoicePayments,
} from '@billwise/db';
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@billwise/shared';
import { Badge, Button, PageBody } from '@billwise/ui';
import {
  ArrowLeft,
  ClipboardList,
  Phone,
  Printer,
  Receipt as ReceiptIcon,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShareButton } from '@/app/app/(dashboard)/invoices/[id]/share-button';
import { requireBusiness } from '@/lib/auth/require-business';
import { CollectDialog } from '../collect-dialog';

export const metadata: Metadata = { title: 'Receipt' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const indianDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
};

const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * One receipt.
 *
 * The shop's invoice page carries four stat cards, a GST breakdown, billed-by
 * and billed-to panels and a returns section. None of that belongs at this
 * counter. What is here is what somebody standing at the counter asks for:
 * what was done, what it cost, what has been paid and when, what is still
 * owed, and the buttons that matter — take the rest of the money, send it on
 * WhatsApp, print it.
 *
 * ## Why the payment history is on the page
 *
 * Because "I paid you ₹100 on Tuesday" is a claim the owner has to settle
 * while the customer is still standing there. A single "received" total cannot
 * answer it, and a shopkeeper who cannot answer it either pays for the doubt or
 * argues. The rows are cheap; the argument is not.
 */
export default async function SevaReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [invoice, business] = await Promise.all([getInvoice(ctx, id), getBusiness(ctx)]);
  if (!invoice) notFound();

  const [work, paymentRows] = await Promise.all([
    listApplicationsForInvoice(ctx, invoice.id),
    listInvoicePayments(ctx, invoice.id),
  ]);

  const total = Number(invoice.grandTotal);
  const received = Number(invoice.amountPaid);
  const balance = Math.max(0, total - received);
  const cancelled = invoice.status === 'cancelled';
  const receiptNo = invoice.invoiceNo ?? 'Draft';
  const paidPct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;

  return (
    <PageBody className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/app/seva/receipts"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All receipts
      </Link>

      <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* The tinted head. This is a document, and a document should not open
            like another table on another admin page. */}
        <header className="brand-wash px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-white/75 uppercase">
                <ReceiptIcon className="size-3.5" /> {business?.name ?? 'Receipt'}
              </p>
              <h1 className="tabular mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                {receiptNo}
              </h1>
              <p className="mt-1 text-sm text-white/80">{longDate(invoice.invoiceDate)}</p>
            </div>

            <div className="text-right">
              {cancelled ? (
                <Badge variant="destructive">Cancelled</Badge>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/25">
                  <span
                    className={`size-1.5 rounded-full ${
                      invoice.paymentStatus === 'paid' ? 'bg-emerald-300' : 'bg-amber-300'
                    }`}
                    aria-hidden
                  />
                  {invoice.paymentStatus === 'paid'
                    ? 'Fully paid'
                    : invoice.paymentStatus === 'partial'
                      ? 'Part paid'
                      : 'Unpaid'}
                </span>
              )}
              <p className="mt-2.5 truncate text-sm font-semibold">{invoice.partyName}</p>
              {invoice.partyPhone && (
                <a
                  href={`tel:${invoice.partyPhone}`}
                  className="tabular mt-0.5 inline-flex items-center gap-1 text-xs text-white/80 underline-offset-4 hover:underline"
                >
                  <Phone className="size-3" /> {invoice.partyPhone}
                </a>
              )}
            </div>
          </div>
        </header>

        {/* What was done. */}
        <ul className="divide-y">
          {invoice.lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-7">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{line.name}</span>
                {Number(line.qty) !== 1 && (
                  <span className="tabular text-xs text-muted-foreground">
                    {Number(line.qty)} × {inr(line.rate)}
                  </span>
                )}
              </span>
              <span className="tabular shrink-0 text-sm font-semibold">{inr(line.lineTotal)}</span>
            </li>
          ))}
        </ul>

        {/* Total, received, outstanding — the three numbers, side by side, so
            nobody has to subtract in their head at a counter. */}
        <div className="grid grid-cols-3 divide-x border-y bg-muted/30 text-center">
          <div className="px-3 py-4">
            <p className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Total
            </p>
            <p className="tabular mt-1 text-lg font-bold">{inr(total)}</p>
          </div>
          <div className="px-3 py-4">
            <p className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Received
            </p>
            <p className="tabular mt-1 text-lg font-bold text-success">{inr(received)}</p>
          </div>
          <div className="px-3 py-4">
            <p className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Outstanding
            </p>
            <p
              className={`tabular mt-1 text-lg font-bold ${
                balance > 0 && !cancelled ? 'text-warning' : 'text-muted-foreground'
              }`}
            >
              {cancelled ? '—' : inr(balance)}
            </p>
          </div>
        </div>

        {!cancelled && total > 0 && (
          <div className="px-5 pt-4 sm:px-7">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${paidPct} per cent paid`}
            >
              <div
                className={`h-full rounded-full ${balance > 0 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>
        )}

        {/* When the money actually came in. */}
        {paymentRows.length > 0 && (
          <section className="px-5 py-4 sm:px-7">
            <h2 className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Payments received
            </h2>
            <ul className="mt-2 divide-y rounded-xl border">
              {paymentRows.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 text-sm">
                    <span className="tabular font-medium">{indianDate(p.paidOn)}</span>
                    <span className="ml-2 text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                    </span>
                    {p.reference && (
                      <span className="tabular ml-2 text-xs text-muted-foreground">
                        {p.reference}
                      </span>
                    )}
                  </span>
                  <span
                    className={`tabular shrink-0 text-sm font-semibold ${
                      p.direction === 'in' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {p.direction === 'in' ? '+' : '−'}
                    {inr(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {invoice.notes && (
          <p className="border-t px-5 py-3.5 text-sm text-muted-foreground sm:px-7">
            {invoice.notes}
          </p>
        )}
      </article>

      <div className="flex flex-wrap gap-2">
        {!cancelled && balance > 0 && (
          <CollectDialog
            invoiceId={invoice.id}
            balance={balance.toFixed(2)}
            receiptNo={receiptNo}
            partyName={invoice.partyName}
          />
        )}
        {!cancelled && <ShareButton invoiceId={invoice.id} />}
        <Link href={`/app/receipts/${invoice.id}/print`}>
          <Button variant="outline">
            <Printer /> Print
          </Button>
        </Link>
        {!cancelled && balance === 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <Wallet className="size-4" /> Nothing left to collect
          </span>
        )}
      </div>

      {work.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4" /> Work on this receipt
          </h2>

          {/* Cards rather than a table. There are rarely more than three, and a
              four-column table for two rows is a table for the sake of one. */}
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {work.map((w) => (
              <li key={w.id} className="rounded-xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium">{w.serviceName}</span>
                  <Badge
                    variant={
                      w.status === 'ready'
                        ? 'success'
                        : w.status === 'rejected'
                          ? 'destructive'
                          : w.status === 'delivered'
                            ? 'secondary'
                            : 'info'
                    }
                  >
                    {APPLICATION_STATUS_LABELS[w.status as ApplicationStatus]}
                  </Badge>
                </div>
                <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  <div className="flex gap-1.5">
                    <dt>Reference</dt>
                    <dd className="tabular text-foreground">{w.referenceNo ?? '—'}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Expected by</dt>
                    <dd className="tabular text-foreground">
                      {w.expectedOn ? indianDate(w.expectedOn) : 'Not promised'}
                    </dd>
                  </div>
                  {w.documentsHeld && (
                    <div className="flex gap-1.5">
                      <dt>Documents held</dt>
                      <dd className="text-foreground">{w.documentsHeld}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>

          <Link
            href="/app/seva/work"
            className="inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open the full work register →
          </Link>
        </section>
      )}

      {!business?.phone && (
        <p className="rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-sm text-warning">
          Your mobile number is not in Settings — without it, your number will not be printed on
          receipts.{' '}
          <Link href="/app/seva/settings" className="font-medium underline underline-offset-4">
            Add it now
          </Link>
        </p>
      )}
    </PageBody>
  );
}

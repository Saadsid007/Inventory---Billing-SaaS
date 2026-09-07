import { getBusiness, getInvoice, listApplicationsForInvoice } from '@billwise/db';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@billwise/shared';
import {
  Badge,
  Button,
  PageBody,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { ArrowLeft, ClipboardList, Printer } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShareButton } from '@/app/app/(dashboard)/invoices/[id]/share-button';
import { requireBusiness } from '@/lib/auth/require-business';
import { CollectPanel } from './collect-panel';

export const metadata: Metadata = { title: 'Receipt' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const indianDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
};

/**
 * One receipt.
 *
 * The shop's invoice page carries four stat cards, a GST breakdown, billed-by
 * and billed-to panels and a returns section. None of that belongs at this
 * counter. What is here is what somebody standing at the counter asks for:
 * what was done, what it cost, what is still owed, and the two buttons that
 * matter — take the rest of the money, and send it on WhatsApp.
 *
 * The jobs booked on this receipt are listed underneath, because "kya hua mere
 * kaam ka" is the same conversation as "kitna baaki hai".
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

  const work = await listApplicationsForInvoice(ctx, invoice.id);
  const balance = Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));
  const cancelled = invoice.status === 'cancelled';

  return (
    <PageBody className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/app/seva/receipts"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All receipts
      </Link>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">
              {invoice.invoiceNo ?? 'Draft'}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {indianDate(invoice.invoiceDate)} · {invoice.partyName}
              {invoice.partyPhone ? ` · ${invoice.partyPhone}` : ''}
            </p>
          </div>
          {cancelled ? (
            <Badge variant="destructive">Cancelled</Badge>
          ) : (
            <Badge
              variant={
                invoice.paymentStatus === 'paid'
                  ? 'success'
                  : invoice.paymentStatus === 'partial'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {invoice.paymentStatus === 'paid'
                ? 'Poora mil gaya'
                : invoice.paymentStatus === 'partial'
                  ? 'Aadha mila'
                  : 'Paisa baaki'}
            </Badge>
          )}
        </header>

        <ul className="divide-y border-b">
          {invoice.lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="block text-sm">{line.name}</span>
                {Number(line.qty) !== 1 && (
                  <span className="tabular text-xs text-muted-foreground">
                    {Number(line.qty)} × {inr(line.rate)}
                  </span>
                )}
              </span>
              <span className="tabular shrink-0 text-sm">{inr(line.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 px-5 py-4 text-sm">
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{inr(invoice.grandTotal)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Mila</dt>
            <dd className="tabular">{inr(invoice.amountPaid)}</dd>
          </div>
        </dl>

        {!cancelled && (
          <div
            className={`px-5 py-4 text-center ${
              balance > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            }`}
          >
            {balance > 0 ? (
              <>
                <p className="text-xs font-semibold tracking-widest uppercase">Baaki</p>
                <p className="tabular mt-0.5 text-2xl font-bold">{inr(balance)}</p>
              </>
            ) : (
              <p className="font-semibold">Poora paisa mil gaya</p>
            )}
          </div>
        )}

        {invoice.notes && (
          <p className="border-t px-5 py-3 text-sm text-muted-foreground">{invoice.notes}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!cancelled && balance > 0 && (
          <CollectPanel invoiceId={invoice.id} balance={balance.toFixed(2)} />
        )}
        {!cancelled && <ShareButton invoiceId={invoice.id} />}
        <Link href={`/app/receipts/${invoice.id}/print`}>
          <Button variant="outline">
            <Printer /> Print
          </Button>
        </Link>
      </div>

      {work.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4" /> Is receipt ka kaam
          </h2>
          <Table>
            <THead>
              <TR>
                <TH>Kaam</TH>
                <TH>Reference</TH>
                <TH>Kab tak</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {work.map((w) => (
                <TR key={w.id}>
                  <TD>{w.serviceName}</TD>
                  <TD className="tabular text-xs">{w.referenceNo ?? '—'}</TD>
                  <TD className="tabular text-xs text-muted-foreground">
                    {w.expectedOn ? indianDate(w.expectedOn) : '—'}
                  </TD>
                  <TD>
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
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Link
            href="/app/seva/work"
            className="inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            Poora register dekhein →
          </Link>
        </section>
      )}

      {!business?.phone && (
        <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          Aapka mobile number Settings me nahi hai — bina uske receipt pe aapka number nahi
          chhapega.{' '}
          <Link href="/app/seva/settings" className="font-medium underline underline-offset-4">
            Abhi daaliye
          </Link>
        </p>
      )}
    </PageBody>
  );
}

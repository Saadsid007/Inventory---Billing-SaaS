import { findReceiptByToken } from '@billwise/db';
import { INVOICE_KIND_LABELS, type InvoiceKind, businessProfile } from '@billwise/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * A bill, opened by a customer from a WhatsApp link.
 *
 * ## Why a web page and not a PDF
 *
 * The reader is on a phone, on mobile data, with whatever storage they have
 * left. A page opens instantly in the WhatsApp browser; a PDF is a download, a
 * viewer, and a file they did not ask for.
 *
 * ## What is deliberately absent
 *
 * No navigation, no login prompt, no link into the app, and nothing about the
 * customer beyond the name already printed on their copy — no phone number, no
 * address, and none of the shop's other bills. A link sent over WhatsApp gets
 * forwarded, and everything on this page should be safe in a stranger's hands.
 *
 * Not indexed, for the same reason.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

const inr = (v: string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const indianDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
};

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await findReceiptByToken(token);

  // A wrong, revoked or expired token is indistinguishable from a bill that
  // never existed — which is exactly what someone guessing should be told.
  if (!receipt) notFound();

  const profile = businessProfile(receipt.business.type);
  const label = INVOICE_KIND_LABELS[receipt.kind as InvoiceKind] ?? profile.terms.document;
  const balance = Number(receipt.balance);
  const cancelled = receipt.status === 'cancelled';
  const tax =
    Number(receipt.cgstTotal) + Number(receipt.sgstTotal) + Number(receipt.igstTotal);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="border-b bg-muted/30 px-5 py-4">
          <h1 className="text-lg font-semibold">{receipt.business.name}</h1>
          {(receipt.business.addressLine1 || receipt.business.city) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[receipt.business.addressLine1, receipt.business.city]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {receipt.business.phone && (
            <p className="text-sm text-muted-foreground">Ph: {receipt.business.phone}</p>
          )}
          {receipt.business.gstin && (
            <p className="tabular text-xs text-muted-foreground">
              GSTIN: {receipt.business.gstin}
            </p>
          )}
        </header>

        {cancelled && (
          <p className="border-b border-destructive/30 bg-destructive/10 px-5 py-2.5 text-sm font-medium text-destructive">
            This bill was cancelled.
          </p>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 text-sm">
          <span className="font-medium">
            {label} {receipt.invoiceNo ?? ''}
          </span>
          <span className="tabular text-muted-foreground">
            {indianDate(receipt.invoiceDate)}
          </span>
        </div>
        <p className="px-5 pb-3 text-sm text-muted-foreground">To: {receipt.partyName}</p>

        <ul className="divide-y border-y">
          {receipt.lines.map((line, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block">{line.name}</span>
                <span className="text-xs text-muted-foreground tabular">
                  {Number(line.qty)} × {inr(line.rate)}
                </span>
              </span>
              <span className="tabular shrink-0">{inr(line.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 px-5 py-4 text-sm">
          {tax > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <dt>Taxable value</dt>
                <dd className="tabular">{inr(receipt.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>GST</dt>
                <dd className="tabular">{inr(tax.toFixed(2))}</dd>
              </div>
            </>
          )}
          {Number(receipt.otherCharges) !== 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>Other charges</dt>
              <dd className="tabular">{inr(receipt.otherCharges)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{inr(receipt.grandTotal)}</dd>
          </div>
          {Number(receipt.amountPaid) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>Paid</dt>
              <dd className="tabular">{inr(receipt.amountPaid)}</dd>
            </div>
          )}
        </dl>

        {/* The number the customer opened this for. Loud on purpose. */}
        {!cancelled && (
          <div
            className={`px-5 py-4 text-center ${
              balance > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            }`}
          >
            {balance > 0 ? (
              <>
                <p className="text-xs font-semibold tracking-widest uppercase">Baaki / Balance due</p>
                <p className="tabular mt-0.5 text-2xl font-bold">{inr(receipt.balance)}</p>
              </>
            ) : (
              <p className="text-base font-semibold">Fully paid — thank you</p>
            )}
          </div>
        )}

        {receipt.notes && (
          <p className="border-t px-5 py-3 text-sm text-muted-foreground">{receipt.notes}</p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        This is a copy of your bill from {receipt.business.name}.
      </p>
    </main>
  );
}

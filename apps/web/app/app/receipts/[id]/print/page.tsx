import {
  getBusiness,
  getInvoice,
  getSettings,
  listApplicationsForInvoice,
} from '@billwise/db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { PrintToolbar } from './print-toolbar';
import './print.css';

export const metadata: Metadata = { title: 'Print receipt' };

/**
 * A Jan Seva receipt, printed.
 *
 * ## Why not the shop's template
 *
 * That one is a GST tax invoice: HSN column, taxable value, CGST and SGST
 * columns, place of supply, an interstate flag and a signature block. A CSC
 * that is not registered has none of it, and printing empty tax columns on a
 * ₹150 slip makes the shop look like it is pretending to be something it is
 * not.
 *
 * ## What is on here that the shop's version has no reason to print
 *
 * The work. Every job on this receipt with its government acknowledgement
 * number and the date it was promised for.
 *
 * That is the whole point of the piece of paper. The customer is not keeping it
 * for their accounts — they are keeping it so they know what number to quote
 * and when to come back, and so there is proof of what they paid on account. A
 * receipt without those is a slip they throw away at the door.
 *
 * Reads only the invoice's own snapshot columns, like every other print
 * template here: a rate change must not alter a document already handed over.
 */
export default async function PrintSevaReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;
  const { format } = await searchParams;

  const [invoice, business, settings] = await Promise.all([
    getInvoice(ctx, id),
    getBusiness(ctx),
    getSettings(ctx),
  ]);
  if (!invoice) notFound();

  const work = await listApplicationsForInvoice(ctx, invoice.id);
  const thermal = format === 'thermal';
  const balance = Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));

  /**
   * The furthest-out promised date on this receipt.
   *
   * One line at the bottom saying when everything should be done, rather than
   * asking the customer to read three dates out of a table and pick the last
   * one. The latest is the honest one to quote — "come back on Tuesday" when
   * one of three jobs runs to Friday means one wasted trip.
   */
  const latestExpected =
    work
      .map((w) => w.expectedOn)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

  const money = (v: string | number) => `₹${Number(v).toFixed(2)}`;
  const date = (value: string | null) => {
    if (!value) return '';
    const [y, m, d] = value.slice(0, 10).split('-');
    return y && m && d ? `${d}-${m}-${y}` : value;
  };

  return (
    <>
      <PrintToolbar invoiceId={invoice.id} format={thermal ? 'thermal' : 'a4'} />

      <div className={thermal ? 'slip thermal' : 'slip'}>
        <header className="head">
          <div>
            <div className="shop-name">{business?.name}</div>
            {business?.addressLine1 && <div className="muted">{business.addressLine1}</div>}
            {(business?.city || business?.pincode) && (
              <div className="muted">
                {[business?.city, business?.pincode].filter(Boolean).join(' ')}
              </div>
            )}
            {business?.phone && <div className="muted">Phone: {business.phone}</div>}
            {/* Printed only when there is one. Most CSCs are not registered, and
                an empty GSTIN line invites the question. */}
            {business?.gstin && <div className="muted">GSTIN: {business.gstin}</div>}
          </div>

          <div className="head-right">
            <div className="doc-label">Receipt</div>
            <div className="doc-no">{invoice.invoiceNo ?? 'Draft'}</div>
            <div className="muted">{date(invoice.invoiceDate)}</div>
          </div>
        </header>

        {/* Who paid, and what state the money is in. Two facts, one strip —
            the pair somebody checks first when they pull this out of a drawer
            six months later. */}
        <section className="meta">
          <div>
            <div className="meta-label">Received from</div>
            <div className="meta-value">{invoice.partyName}</div>
            {invoice.partyPhone && <div className="muted">{invoice.partyPhone}</div>}
          </div>
          <div style={{ textAlign: thermal ? 'left' : 'right' }}>
            <div className="meta-label">Status</div>
            <div className="meta-value">
              {invoice.status === 'cancelled'
                ? 'Cancelled'
                : balance > 0
                  ? 'Part paid'
                  : 'Paid in full'}
            </div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Work done</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.name}</td>
                <td className="num">{Number(line.qty)}</td>
                <td className="num">{Number(line.rate).toFixed(2)}</td>
                <td className="num">{Number(line.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row grand">
              <td colSpan={3}>Total</td>
              <td className="num">{money(invoice.grandTotal)}</td>
            </tr>
            {Number(invoice.amountPaid) > 0 && (
              <tr className="total-row">
                <td colSpan={3} style={{ fontWeight: 400 }}>
                  Paid
                </td>
                <td className="num" style={{ fontWeight: 400 }}>
                  {money(invoice.amountPaid)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={balance > 0 ? 'balance' : 'balance settled'}>
          {balance > 0 ? (
            <>
              <div className="label">Balance to pay</div>
              <div className="amount">{money(balance)}</div>
              <div className="muted" style={{ marginTop: '1mm' }}>
                Payable when you collect your work.
              </div>
            </>
          ) : (
            <div className="amount" style={{ fontSize: '13pt' }}>
              Paid in full — nothing outstanding
            </div>
          )}
        </div>

        {/* The reason the customer keeps this slip. */}
        {work.length > 0 && (
          <div className="work">
            <h2>Your work</h2>
            <table>
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Reference no.</th>
                  <th className="num">Expected by</th>
                </tr>
              </thead>
              <tbody>
                {work.map((w) => (
                  <tr key={w.id}>
                    <td>{w.serviceName}</td>
                    <td className="ref">{w.referenceNo ?? '—'}</td>
                    <td className="num">{w.expectedOn ? date(w.expectedOn) : 'Not fixed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Said plainly, because it is the promise that stops the customer
                walking back in every second day to ask. */}
            <div className="promise">
              We will send you a message
              {invoice.partyPhone ? ` on ${invoice.partyPhone}` : ''} as soon as your work is
              ready. Please bring this slip with you when you come to collect it.
              {latestExpected && ` Expected by ${date(latestExpected)}.`}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="muted" style={{ marginTop: '3mm' }}>
            {invoice.notes}
          </div>
        )}

        <div className="signature">
          <div>Customer signature</div>
          <div>For {business?.name}</div>
        </div>

        <div className="foot">{settings?.invoiceFooter ?? 'Thank you.'}</div>
      </div>
    </>
  );
}

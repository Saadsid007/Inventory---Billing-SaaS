import { getBusiness, getInvoice } from '@bahikhata/db';
import { INVOICE_KIND_LABELS, getGstStateName } from '@bahikhata/shared';
import { Badge, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceActions } from './invoice-actions';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBusiness();
  const { id } = await params;

  const [invoice, business] = await Promise.all([getInvoice(ctx, id), getBusiness(ctx)]);
  // Business-scoped, so a foreign id is indistinguishable from a missing one.
  if (!invoice) notFound();

  const showGst = invoice.kind === 'tax_invoice';
  const due = (Number(invoice.grandTotal) - Number(invoice.amountPaid)).toFixed(2);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoice.invoiceNo ?? 'Draft'}
            </h1>
            {invoice.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
            {invoice.status === 'draft' && <Badge variant="outline">Draft</Badge>}
            {invoice.status === 'issued' && <Badge variant="success">Issued</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {INVOICE_KIND_LABELS[invoice.kind]} · {invoice.invoiceDate} · FY {invoice.fy}
          </p>
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          grandTotal={invoice.grandTotal}
          amountPaid={invoice.amountPaid}
        />
      </header>

      {invoice.status === 'cancelled' && invoice.cancelReason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span className="font-medium">Cancelled:</span> {invoice.cancelReason}
          {/* The number is retained deliberately — a gap in a GST series looks
              exactly like a hidden sale (spec §5.1). */}
          <p className="mt-1 text-xs text-muted-foreground">
            The invoice number is kept on purpose. It is never reused.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-xs font-medium text-muted-foreground">From</h2>
          <p className="mt-1 font-medium">{business?.name}</p>
          {business?.gstin && <p className="tabular text-sm">{business.gstin}</p>}
          <p className="text-sm text-muted-foreground">
            State {invoice.supplierStateCode} — {getGstStateName(invoice.supplierStateCode)}
          </p>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-xs font-medium text-muted-foreground">To</h2>
          {/* Read from the invoice's own snapshot columns, never joined back to
              the party — their address may have changed since (spec §4). */}
          <p className="mt-1 font-medium">{invoice.partyName}</p>
          {invoice.partyGstin && <p className="tabular text-sm">{invoice.partyGstin}</p>}
          {invoice.partyPhone && (
            <p className="tabular text-sm text-muted-foreground">{invoice.partyPhone}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Place of supply {invoice.placeOfSupply} — {getGstStateName(invoice.placeOfSupply)}
            {showGst && (invoice.isInterstate ? ' · IGST' : ' · CGST + SGST')}
          </p>
        </section>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>#</TH>
            <TH>Item</TH>
            {showGst && <TH>HSN</TH>}
            <TH numeric>Qty</TH>
            <TH numeric>Rate</TH>
            <TH numeric>Taxable</TH>
            {showGst && <TH numeric>Tax</TH>}
            <TH numeric>Total</TH>
          </TR>
        </THead>
        <TBody>
          {invoice.lines.map((line) => (
            <TR key={line.id}>
              <TD className="text-muted-foreground">{line.lineNo}</TD>
              <TD>
                {line.name}
                {line.unit && (
                  <span className="ml-1 text-xs text-muted-foreground">({line.unit})</span>
                )}
              </TD>
              {showGst && <TD className="tabular text-muted-foreground">{line.hsnCode ?? '—'}</TD>}
              <TD numeric>{line.qty}</TD>
              <TD numeric>₹{line.rate}</TD>
              <TD numeric>₹{line.taxableValue}</TD>
              {showGst && (
                <TD numeric className="text-muted-foreground">
                  {line.taxRate}%
                  <br />
                  <span className="text-xs">
                    ₹
                    {invoice.isInterstate
                      ? line.igstAmount
                      : (Number(line.cgstAmount) + Number(line.sgstAmount)).toFixed(2)}
                  </span>
                </TD>
              )}
              <TD numeric className="font-medium">
                ₹{line.lineTotal}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <dl className="ml-auto w-full max-w-xs space-y-1.5 rounded-lg border p-4 text-sm">
        <Row label="Taxable value" value={invoice.subtotal} />
        {Number(invoice.discountTotal) > 0 && (
          <Row label="Discount" value={invoice.discountTotal} />
        )}
        {showGst && invoice.isInterstate && <Row label="IGST" value={invoice.igstTotal} />}
        {showGst && !invoice.isInterstate && (
          <>
            <Row label="CGST" value={invoice.cgstTotal} />
            <Row label="SGST" value={invoice.sgstTotal} />
          </>
        )}
        {Number(invoice.cessTotal) > 0 && <Row label="Cess" value={invoice.cessTotal} />}
        {Number(invoice.otherCharges) > 0 && (
          <Row label="Other charges" value={invoice.otherCharges} />
        )}
        {Number(invoice.roundOff) !== 0 && <Row label="Round off" value={invoice.roundOff} />}
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular">₹{invoice.grandTotal}</dd>
        </div>
        {invoice.status === 'issued' && (
          <>
            <Row label="Paid" value={invoice.amountPaid} />
            <div className="flex justify-between font-medium">
              <dt>Due</dt>
              <dd className="tabular">₹{due}</dd>
            </div>
          </>
        )}
      </dl>

      {(invoice.notes || invoice.terms) && (
        <section className="space-y-3 border-t pt-5 text-sm">
          {invoice.notes && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">Terms</h3>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{invoice.terms}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular">₹{value}</dd>
    </div>
  );
}

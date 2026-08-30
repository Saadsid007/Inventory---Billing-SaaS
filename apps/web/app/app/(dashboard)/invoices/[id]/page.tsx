import { getBusiness, getInvoice, listReturnsForInvoice } from '@billwise/db';
import { todayInIndia } from '@billwise/core';
import { INVOICE_KIND_LABELS, getGstStateName } from '@billwise/shared';
import { Alert, Badge, Card, PageBody, PageHeader, TBody, TD, TH, THead, TR, Table } from '@billwise/ui';
import { ArrowLeft, Ban } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceActions } from './invoice-actions';
import { ReturnForm } from './return-form';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;
  const { return: openReturn } = await searchParams;

  const [invoice, business] = await Promise.all([getInvoice(ctx, id), getBusiness(ctx)]);
  // Business-scoped, so a foreign id is indistinguishable from a missing one.
  if (!invoice) notFound();

  const returns = invoice.status === 'issued' ? await listReturnsForInvoice(ctx, invoice.id) : [];
  const returnedTotal = returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);

  /** Per line name, how much of it has already come back. */
  const returnedQty = new Map<string, number>();
  for (const ret of returns) {
    for (const line of ret.lines) {
      returnedQty.set(line.name, (returnedQty.get(line.name) ?? 0) + Number(line.qty));
    }
  }

  const showGst = invoice.kind === 'tax_invoice';
  const due = (Number(invoice.grandTotal) - Number(invoice.amountPaid)).toFixed(2);

  return (
    <PageBody className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All invoices
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {invoice.invoiceNo ?? 'Draft'}
            {invoice.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
            {invoice.status === 'draft' && <Badge variant="outline">Draft</Badge>}
            {invoice.status === 'issued' && (
              <Badge variant="success" dot>
                Issued
              </Badge>
            )}
          </span>
        }
        description={`${INVOICE_KIND_LABELS[invoice.kind]} · ${invoice.invoiceDate} · FY ${invoice.fy}`}
        actions={
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            grandTotal={invoice.grandTotal}
            amountPaid={invoice.amountPaid}
          />
        }
      />

      {invoice.status === 'cancelled' && invoice.cancelReason && (
        /* The number is retained deliberately — a gap in a GST series looks
           exactly like a hidden sale (spec §5.1). */
        <Alert variant="destructive" icon={Ban} title={`Cancelled: ${invoice.cancelReason}`}>
          The invoice number is kept on purpose, and is never reused.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            From
          </h2>
          <p className="mt-1 font-medium">{business?.name}</p>
          {business?.gstin && <p className="tabular text-sm">{business.gstin}</p>}
          <p className="text-sm text-muted-foreground">
            State {invoice.supplierStateCode}, {getGstStateName(invoice.supplierStateCode)}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            To
          </h2>
          {/* Read from the invoice's own snapshot columns, never joined back to
              the party — their address may have changed since (spec §4). */}
          <p className="mt-1 font-medium">{invoice.partyName}</p>
          {invoice.partyGstin && <p className="tabular text-sm">{invoice.partyGstin}</p>}
          {invoice.partyPhone && (
            <p className="tabular text-sm text-muted-foreground">{invoice.partyPhone}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Place of supply {invoice.placeOfSupply}, {getGstStateName(invoice.placeOfSupply)}
            {showGst && (invoice.isInterstate ? ' · IGST' : ' · CGST + SGST')}
          </p>
        </Card>
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
              {showGst && <TD className="tabular text-muted-foreground">{line.hsnCode ?? '-'}</TD>}
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

      <dl className="ml-auto w-full max-w-xs space-y-1.5 rounded-xl border bg-card p-4 text-sm shadow-xs">
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

      {returns.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Returned
            </h2>
            <p className="tabular text-sm">
              Credit of <span className="font-semibold">₹{returnedTotal.toFixed(2)}</span>
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {returns.map((ret) => (
              <li key={ret.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="tabular text-xs text-muted-foreground">
                    {ret.returnDate}
                    {ret.reason ? ` · ${ret.reason}` : ''}
                  </span>
                  <span className="tabular font-medium">₹{ret.totalAmount}</span>
                </div>
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {ret.lines.map((line) => (
                    <li key={line.id}>
                      {line.qty} × {line.name}
                      {line.restock === 'no' && ' (not restocked)'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {invoice.status === 'issued' && (
        <ReturnForm
          invoiceId={invoice.id}
          today={todayInIndia()}
          defaultOpen={openReturn === '1'}
          lines={invoice.lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            rate: line.rate,
            soldQty: line.qty,
            alreadyReturned: String(returnedQty.get(line.name) ?? 0),
            unit: line.unit,
          }))}
        />
      )}

      {(invoice.notes || invoice.terms) && (
        <Card className="space-y-4 p-4 text-sm">
          {invoice.notes && (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Notes
              </h3>
              <p className="mt-1.5 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Terms
              </h3>
              <p className="mt-1.5 whitespace-pre-wrap text-muted-foreground">{invoice.terms}</p>
            </div>
          )}
        </Card>
      )}
    </PageBody>
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

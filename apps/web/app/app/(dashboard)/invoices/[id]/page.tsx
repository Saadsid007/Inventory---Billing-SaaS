import { getBusiness, getInvoice, listReturnsForInvoice } from '@billwise/db';
import { todayInIndia } from '@billwise/core';
import { INVOICE_KIND_LABELS, getGstStateName } from '@billwise/shared';
import {
  Alert,
  Badge,
  Card,
  PageBody,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import {
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  IndianRupee,
  MapPin,
  Package,
  Phone,
  Receipt,
  Undo2,
  User,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { InvoiceActions } from './invoice-actions';
import { ReturnForm } from './return-form';

export const metadata: Metadata = { title: 'Invoice Details' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

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
  if (!invoice) notFound();

  const returns = invoice.status === 'issued' ? await listReturnsForInvoice(ctx, invoice.id) : [];
  const returnedTotal = returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);

  /** Per line name, how much of it has already come back. */
  const returnedQty = new Map<string, number>();
  for (const ret of returns) {
    for (const line of ret.lines) {
      if (!line.invoiceLineId) continue;
      returnedQty.set(
        line.invoiceLineId,
        (returnedQty.get(line.invoiceLineId) ?? 0) + Number(line.qty),
      );
    }
  }

  const showGst = invoice.kind === 'tax_invoice';
  const rawDue = Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));
  const due = rawDue.toFixed(2);
  const paidPercent =
    Number(invoice.grandTotal) > 0
      ? Math.min(100, Math.round((Number(invoice.amountPaid) / Number(invoice.grandTotal)) * 100))
      : 100;

  return (
    <PageBody className="mx-auto max-w-5xl space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to all invoices
        </Link>
        <span className="tabular">Document ID: {invoice.id.slice(0, 8)}…</span>
      </div>

      {/* Executive Hero Document Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-xs ring-1 ring-border/50 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {invoice.invoiceNo ?? 'Draft Invoice'}
              </h1>

              {invoice.status === 'issued' && (
                <Badge variant="success" dot className="px-2.5 py-1 text-xs">
                  Issued
                </Badge>
              )}
              {invoice.status === 'draft' && (
                <Badge variant="warning" className="px-2.5 py-1 text-xs">
                  Draft
                </Badge>
              )}
              {invoice.status === 'cancelled' && (
                <Badge variant="destructive" className="px-2.5 py-1 text-xs">
                  Cancelled
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                <FileText className="size-3 text-primary" />
                {INVOICE_KIND_LABELS[invoice.kind]}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Calendar className="size-3" />
                {invoice.invoiceDate}
              </span>
              <span>·</span>
              <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px]">
                FY {invoice.fy}
              </span>
              {invoice.dueDate && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <Clock className="size-3" /> Due: {invoice.dueDate}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <InvoiceActions
              invoiceId={invoice.id}
              status={invoice.status}
              grandTotal={invoice.grandTotal}
              amountPaid={invoice.amountPaid}
            />
          </div>
        </div>
      </div>

      {invoice.status === 'cancelled' && invoice.cancelReason && (
        <Alert variant="destructive" icon={Ban} title={`Cancelled: ${invoice.cancelReason}`}>
          This invoice was cancelled and stock has been put back. The sequential invoice number remains recorded for GST audit compliance.
        </Alert>
      )}

      {/* 4-Stat Financial Status Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Invoice Grand Total"
          value={inr(invoice.grandTotal)}
          hint={showGst ? `Includes GST (${invoice.isInterstate ? 'IGST' : 'CGST+SGST'})` : 'Total bill amount'}
          icon={IndianRupee}
          tone="default"
        />

        <StatCard
          label="Amount Paid"
          value={inr(invoice.amountPaid)}
          hint={`${paidPercent}% settled`}
          icon={Wallet}
          tone="success"
        />

        <StatCard
          label="Balance Due"
          value={inr(due)}
          hint={Number(due) > 0 ? 'Payment pending from customer' : 'Fully settled'}
          icon={Receipt}
          tone={Number(due) > 0 ? 'warning' : 'success'}
        />

        <StatCard
          label="Credits / Returns"
          value={inr(returnedTotal.toFixed(2))}
          hint={returns.length > 0 ? `${returns.length} return recorded` : 'No goods returned'}
          icon={Undo2}
          tone={returnedTotal > 0 ? 'destructive' : 'info'}
        />
      </div>

      {/* Billed By & Billed To Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Billed By (Supplier) */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-indigo-50/20 p-4 shadow-xs dark:to-indigo-950/20">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Billed By (Seller)
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Supplier
            </Badge>
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-base font-bold text-foreground">{business?.name}</p>

            {business?.gstin ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-primary">
                  GSTIN: {business.gstin}
                </span>
                <span className="rounded bg-success/12 px-1.5 py-0.2 text-[10px] font-medium text-success">
                  Active
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Unregistered GST Vendor</p>
            )}

            {(business?.addressLine1 || business?.city) && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {[
                  business.addressLine1,
                  business.addressLine2,
                  business.city,
                  business.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                State Code {invoice.supplierStateCode} ({getGstStateName(invoice.supplierStateCode)})
              </span>
              {business?.phone && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3 text-muted-foreground" />
                    {business.phone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Billed To (Customer) */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-sky-50/20 p-4 shadow-xs dark:to-sky-950/20">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <User className="size-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Billed To (Customer)
              </span>
            </div>
            {invoice.partyId ? (
              <Link
                href={`/app/parties/${invoice.partyId}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                View Khata <ExternalLink className="size-3" />
              </Link>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Walk-in Customer
              </Badge>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-base font-bold text-foreground">{invoice.partyName}</p>

            {invoice.partyGstin ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-300">
                  GSTIN: {invoice.partyGstin}
                </span>
                <span className="rounded bg-sky-500/12 px-1.5 py-0.2 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                  Registered
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Consumer / Unregistered Party</p>
            )}

            {invoice.partyAddress && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {invoice.partyAddress}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                POS: State {invoice.placeOfSupply} ({getGstStateName(invoice.placeOfSupply)})
              </span>
              {invoice.partyPhone && (
                <>
                  <span>·</span>
                  <a
                    href={`tel:${invoice.partyPhone}`}
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <Phone className="size-3 text-muted-foreground" />
                    {invoice.partyPhone}
                  </a>
                </>
              )}
              {showGst && (
                <>
                  <span>·</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {invoice.isInterstate ? 'IGST Invoice' : 'CGST + SGST'}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table Card */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="border-b border-border/80 bg-muted/30 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Line Items & Billed Products</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {invoice.lines.length} {invoice.lines.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH className="w-12 text-center">#</TH>
              <TH icon={Package}>Product / Description</TH>
              {showGst && <TH icon={Hash}>HSN/SAC</TH>}
              <TH numeric>Qty</TH>
              <TH numeric>Rate</TH>
              <TH numeric>Taxable</TH>
              {showGst && <TH numeric>Tax</TH>}
              <TH numeric icon={IndianRupee}>
                Total
              </TH>
            </TR>
          </THead>
          <TBody>
            {invoice.lines.map((line) => {
              const qtyReturned = returnedQty.get(line.id) ?? 0;
              return (
                <TR key={line.id}>
                  <TD className="text-center font-mono text-muted-foreground">{line.lineNo}</TD>
                  <TD>
                    <div className="font-semibold text-foreground">{line.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {line.unit && <span>Unit: {line.unit}</span>}
                      {qtyReturned > 0 && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.2 font-medium text-destructive">
                          {qtyReturned} returned
                        </span>
                      )}
                    </div>
                  </TD>
                  {showGst && (
                    <TD className="tabular text-muted-foreground font-mono">
                      {line.hsnCode ?? '-'}
                    </TD>
                  )}
                  <TD numeric className="font-medium">
                    {line.qty} {line.unit ? line.unit : ''}
                  </TD>
                  <TD numeric className="tabular text-muted-foreground">
                    ₹{line.rate}
                  </TD>
                  <TD numeric className="tabular font-medium">
                    ₹{line.taxableValue}
                  </TD>
                  {showGst && (
                    <TD numeric className="tabular text-muted-foreground">
                      <span className="font-medium text-foreground">{line.taxRate}%</span>
                      <div className="text-[10px] text-muted-foreground">
                        ₹
                        {invoice.isInterstate
                          ? line.igstAmount
                          : (Number(line.cgstAmount) + Number(line.sgstAmount)).toFixed(2)}
                      </div>
                    </TD>
                  )}
                  <TD numeric className="tabular font-bold text-foreground">
                    ₹{line.lineTotal}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>

      {/* Bottom Summary: Calculations & Receipts */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Notes, Terms & Returns summary */}
        <div className="space-y-4 lg:col-span-7">
          {returns.length > 0 && (
            <Card className="space-y-3 p-4 border-rose-200/60 bg-rose-50/15 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <Undo2 className="size-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Returns & Sales Credits
                  </h3>
                </div>
                <p className="tabular text-xs font-medium">
                  Total credited: <span className="font-bold text-destructive">₹{returnedTotal.toFixed(2)}</span>
                </p>
              </div>

              <ul className="space-y-2 text-sm">
                {returns.map((ret) => (
                  <li key={ret.id} className="rounded-lg border border-border/60 bg-card p-3 shadow-2xs">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="tabular text-xs text-muted-foreground font-medium">
                        {ret.returnDate}
                        {ret.reason ? ` · ${ret.reason}` : ''}
                      </span>
                      <span className="tabular font-bold text-destructive">
                        ₹{ret.totalAmount}
                      </span>
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

          {(invoice.notes || invoice.terms) && (
            <div className="rounded-xl border border-border/80 bg-card p-4 text-xs space-y-3 shadow-xs">
              {invoice.notes && (
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Customer Notes
                  </h3>
                  <p className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div className={invoice.notes ? 'border-t border-border/60 pt-2.5' : ''}>
                  <h3 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Terms & Conditions
                  </h3>
                  <p className="mt-1 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Settlement & Totals Card */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-border/90 bg-card p-5 shadow-sm space-y-3.5 ring-1 ring-border/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
              Payment Settlement & Totals
            </h3>

            <dl className="space-y-2 text-xs">
              <Row label="Taxable subtotal" value={invoice.subtotal} />

              {Number(invoice.discountTotal) > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <dt>Discount applied</dt>
                  <dd className="tabular font-medium">-₹{invoice.discountTotal}</dd>
                </div>
              )}

              {showGst && invoice.isInterstate && (
                <Row label="Integrated GST (IGST)" value={invoice.igstTotal} />
              )}

              {showGst && !invoice.isInterstate && (
                <>
                  <Row label="Central GST (CGST)" value={invoice.cgstTotal} />
                  <Row label="State GST (SGST)" value={invoice.sgstTotal} />
                </>
              )}

              {Number(invoice.cessTotal) > 0 && (
                <Row label="Cess" value={invoice.cessTotal} />
              )}

              {Number(invoice.otherCharges) > 0 && (
                <Row label="Other charges / shipping" value={invoice.otherCharges} />
              )}

              {Number(invoice.roundOff) !== 0 && (
                <Row label="Round off adjustment" value={invoice.roundOff} />
              )}
            </dl>

            {/* Grand Total Highlight Box */}
            <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    Grand Total
                  </p>
                  <p className="text-2xl font-black text-foreground tabular">
                    ₹{invoice.grandTotal}
                  </p>
                </div>
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <IndianRupee className="size-5" />
                </span>
              </div>
            </div>

            {/* Payment Settlement Status Bar */}
            {invoice.status === 'issued' && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Settlement Progress</span>
                  <span className="font-mono text-[11px] font-bold text-foreground">
                    {paidPercent}% Paid
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      paidPercent === 100
                        ? 'h-full bg-emerald-500 transition-all duration-500'
                        : 'h-full bg-amber-500 transition-all duration-500'
                    }
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 font-medium">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Paid: ₹{invoice.amountPaid}
                  </span>
                  <span
                    className={
                      Number(due) > 0
                        ? 'font-bold text-amber-700 dark:text-amber-400'
                        : 'text-muted-foreground'
                    }
                  >
                    Due: ₹{due}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Return Form Drawer */}
      {invoice.status === 'issued' && (
        <div id="return">
          <ReturnForm
            invoiceId={invoice.id}
            today={todayInIndia()}
            defaultOpen={openReturn === '1'}
            lines={invoice.lines.map((line) => ({
              lineId: line.id,
              productId: line.productId,
              name: line.name,
              rate: line.rate,
              soldQty: line.qty,
              alreadyReturned: String(returnedQty.get(line.id) ?? 0),
              unit: line.unit,
            }))}
          />
        </div>
      )}
    </PageBody>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular font-medium text-foreground">₹{value}</dd>
    </div>
  );
}

'use client';

import { buildInvoice, todayInIndia } from '@billwise/core';
import type { BusinessProfile } from '@billwise/db';
import {
  GST_STATES,
  INVOICE_KIND_LABELS,
  INVOICE_KINDS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  invoiceWarnings,
  type InvoiceKind,
  type PaymentMethod,
} from '@billwise/shared';
import {
  Alert,
  Button,
  FormError,
  Input,
  Select,
  Textarea,
  WarningList,
} from '@billwise/ui';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  IndianRupee,
  Info,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  issueInvoiceAction,
  recordPaymentAction,
  saveInvoiceDraftAction,
} from '@/app/app/(dashboard)/invoices/actions';

export type PartyOption = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  stateCode: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  hsnCode: string | null;
  unitShortName: string | null;
  salePrice: string;
  taxRate: string | null;
  cessRate: string | null;
};

type LineRow = {
  key: string;
  productId: string;
  name: string;
  hsnCode: string;
  unit: string;
  qty: string;
  rate: string;
  discountPct: string;
  taxRate: string;
  cessRate: string;
};

const newLine = (): LineRow => ({
  key: Math.random().toString(36).slice(2),
  productId: '',
  name: '',
  hsnCode: '',
  unit: 'PCS',
  qty: '1',
  rate: '',
  discountPct: '',
  taxRate: '0',
  cessRate: '0',
});

const COMMON_GST_RATES = ['0', '5', '12', '18', '28'];

export function InvoiceForm({
  business,
  supplierStateCode,
  supplierHasGstin,
  defaultTaxMode,
  defaultTerms,
  parties,
  products,
}: {
  business?: BusinessProfile | null | undefined;
  supplierStateCode: string;
  supplierHasGstin: boolean;
  defaultTaxMode: 'inclusive' | 'exclusive';
  defaultTerms: string;
  parties: readonly PartyOption[];
  products: readonly ProductOption[];
}) {
  const router = useRouter();

  // An unregistered business cannot legally issue a tax invoice
  const availableKinds = supplierHasGstin
    ? INVOICE_KINDS
    : INVOICE_KINDS.filter((k) => k !== 'tax_invoice' && k !== 'bill_of_supply');

  const [kind, setKind] = React.useState<InvoiceKind>(
    supplierHasGstin ? 'tax_invoice' : 'cash_memo',
  );
  const [invoiceDate, setInvoiceDate] = React.useState(todayInIndia());
  const [dueDate, setDueDate] = React.useState('');
  const [partyId, setPartyId] = React.useState('');
  const [partyName, setPartyName] = React.useState('');
  const [partyPhone, setPartyPhone] = React.useState('');
  const [posOverride, setPosOverride] = React.useState('');
  const [taxMode, setTaxMode] = React.useState(defaultTaxMode);
  const [otherCharges, setOtherCharges] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [terms, setTerms] = React.useState(defaultTerms);
  const [lines, setLines] = React.useState<LineRow[]>([newLine()]);

  // Payment Received settlement state
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = React.useState(todayInIndia());
  const [paymentRef, setPaymentRef] = React.useState('');

  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const [pending, startTransition] = React.useTransition();

  const party = parties.find((p) => p.id === partyId);
  const showGst = kind === 'tax_invoice';

  function setLine(key: string, patch: Partial<LineRow>) {
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  /** Picking a product fills the line from its master data */
  function pickProduct(key: string, p: ProductOption) {
    setLine(key, {
      productId: p.id,
      name: p.name,
      hsnCode: p.hsnCode ?? '',
      unit: p.unitShortName ?? 'PCS',
      rate: p.salePrice,
      taxRate: p.taxRate ?? '0',
      cessRate: p.cessRate ?? '0',
    });
  }

  /** Quick due date preset helpers */
  function setDuePreset(days: number) {
    const base = new Date(invoiceDate || todayInIndia());
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().slice(0, 10));
  }

  /**
   * Live totals computed by the SAME pure function the server uses.
   */
  const preview = React.useMemo(() => {
    const usable = lines.filter((l) => l.name.trim() && l.rate.trim() && l.qty.trim());
    if (usable.length === 0) return null;
    try {
      return buildInvoice({
        kind,
        invoiceDate,
        taxMode,
        supplierStateCode,
        partyStateCode: party?.stateCode,
        partyGstin: party?.gstin,
        placeOfSupplyOverride: posOverride || undefined,
        otherCharges: otherCharges || '0',
        lines: usable.map((l) => ({
          productId: l.productId || null,
          name: l.name,
          hsnCode: l.hsnCode || null,
          unit: l.unit || null,
          qty: l.qty,
          rate: l.rate,
          discountPct: l.discountPct || '0',
          taxRate: showGst ? l.taxRate : '0',
          cessRate: showGst ? l.cessRate : '0',
        })),
      });
    } catch {
      return null;
    }
  }, [
    lines,
    kind,
    invoiceDate,
    taxMode,
    supplierStateCode,
    party,
    posOverride,
    otherCharges,
    showGst,
  ]);

  const warnings = preview
    ? invoiceWarnings({
        kind,
        partyGstin: party?.gstin ?? undefined,
        isInterstate: preview.isInterstate,
        lines: lines
          .filter((l) => l.name.trim())
          .map((l) => ({ name: l.name, hsnCode: l.hsnCode || undefined, taxRate: l.taxRate })),
      })
    : [];

  function payload() {
    return {
      kind,
      invoiceDate,
      dueDate,
      partyId,
      partyName: party?.name ?? partyName,
      partyGstin: party?.gstin ?? '',
      partyPhone: party?.phone ?? partyPhone,
      partyAddress: '',
      placeOfSupply: posOverride,
      taxMode,
      otherCharges,
      notes,
      terms,
      lines: lines
        .filter((l) => l.name.trim())
        .map((l) => ({
          productId: l.productId,
          name: l.name,
          hsnCode: l.hsnCode,
          unit: l.unit,
          qty: l.qty,
          rate: l.rate,
          discountPct: l.discountPct,
          discountAmount: '',
          taxRate: showGst ? l.taxRate : '0',
          cessRate: showGst ? l.cessRate : '0',
        })),
    };
  }

  function saveDraft() {
    setState({});
    startTransition(async () => {
      const result = await saveInvoiceDraftAction(payload());
      if (result.ok) {
        router.push(`/app/invoices/${result.invoiceId}`);
        router.refresh();
      } else {
        setState({
          ...(result.formError !== undefined && { formError: result.formError }),
          ...(result.fieldErrors !== undefined && { fieldErrors: result.fieldErrors }),
        });
      }
    });
  }

  function saveAndIssue() {
    setState({});
    startTransition(async () => {
      const saved = await saveInvoiceDraftAction(payload());
      if (!saved.ok) {
        setState({
          ...(saved.formError !== undefined && { formError: saved.formError }),
          ...(saved.fieldErrors !== undefined && { fieldErrors: saved.fieldErrors }),
        });
        return;
      }
      const issued = await issueInvoiceAction(saved.invoiceId);
      if (!issued.ok) {
        router.push(`/app/invoices/${saved.invoiceId}`);
        return;
      }

      // If payment was entered, record the payment against the issued invoice
      if (isPaymentOpen && paymentAmount && Number(paymentAmount) > 0) {
        try {
          await recordPaymentAction(issued.invoiceId, {
            amount: paymentAmount,
            method: paymentMethod,
            paidOn: paymentDate || todayInIndia(),
            reference: paymentRef.trim() || undefined,
          });
        } catch (payErr) {
          console.error('Failed to record payment on invoice issue', payErr);
        }
      }

      router.push(`/app/invoices/${issued.invoiceId}`);
      router.refresh();
    });
  }

  const err = (k: string) => state.fieldErrors?.[k];

  const formattedAddress = [
    business?.addressLine1,
    business?.addressLine2,
    business?.city,
    business?.stateCode ? `State: ${business.stateCode}` : null,
    business?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-4 sm:space-y-6">
      <FormError>{state.formError}</FormError>

      {/* =========================================================================
          STICKY TOP CONTROL TOOLBAR (Template Actions & Tax Mode Switcher)
          ========================================================================= */}
      <div className="sticky top-2 sm:top-3 z-30 flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-border/80 bg-card/95 p-2.5 sm:px-4 sm:py-3 shadow-md backdrop-blur-md transition-all">
        {/* Left: Back Link & Template status & Tax Mode Pill Switcher */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/60 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/90 hover:text-primary transition-all shadow-2xs shrink-0"
          >
            <ArrowLeft className="size-3.5 sm:size-4 text-primary" />
            <span>Back to Invoices</span>
          </Link>

          <div className="h-4 w-px bg-border/80 hidden md:block" />

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-bold text-primary">Fullscreen Billing Canvas</span>
          </div>

          <div className="h-4 w-px bg-border/80 hidden md:block" />

          {/* Tax Mode Switcher */}
          {showGst && (
            <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setTaxMode('exclusive')}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all ${
                  taxMode === 'exclusive'
                    ? 'bg-card text-primary shadow-xs font-extrabold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="GST will be added on top of your item prices"
              >
                Tax Extra
              </button>
              <button
                type="button"
                onClick={() => setTaxMode('inclusive')}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all ${
                  taxMode === 'inclusive'
                    ? 'bg-card text-primary shadow-xs font-extrabold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Rates already include GST"
              >
                Tax Incl.
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Grand Total Badge & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {preview && (
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/10 px-2 sm:px-3 py-1 text-xs">
              <span className="text-muted-foreground font-medium hidden sm:inline">Grand Total:</span>
              <span className="font-mono font-black text-primary text-xs sm:text-sm">
                ₹{preview.grandTotal}
              </span>
            </div>
          )}

          {/* Quick Payment Trigger in Toolbar */}
          {!isPaymentOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPaymentOpen(true);
                if (preview?.grandTotal) setPaymentAmount(preview.grandTotal);
              }}
              className="h-8 sm:h-8.5 px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 transition-all shadow-2xs"
            >
              <IndianRupee className="size-3 sm:size-3.5 mr-0.5 sm:mr-1" />
              <span>Add Payment</span>
            </Button>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              <span>Paid: ₹{paymentAmount || '0.00'}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveDraft}
            disabled={pending || !preview}
            className="h-8 sm:h-8.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3.5 shadow-2xs hidden sm:inline-flex"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={saveAndIssue}
            disabled={pending || !preview}
            className="h-8 sm:h-8.5 gap-1 sm:gap-1.5 px-3 sm:px-4 text-[11px] sm:text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Zap className="size-3 sm:size-3.5" />
            <span>{pending ? 'Issuing…' : 'Save & Issue'}</span>
          </Button>
        </div>
      </div>

      {!supplierHasGstin && (
        <Alert variant="info" icon={Info} title="No GSTIN on File">
          <p className="text-xs">
            Billing with Cash Memo. To issue formal GST Tax Invoices with CGST/SGST/IGST breakdown,
            add your GSTIN in{' '}
            <a href="/app/settings" className="underline font-bold">
              Settings
            </a>
            .
          </p>
        </Alert>
      )}

      {/* =========================================================================
          INVOICE PAPER SHEET CANVAS (Faithful to Final PDF Document)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-border/90 bg-card p-4 sm:p-7 shadow-xl ring-1 ring-border/50 transition-all">
        {/* Subtle Decorative Top Strip */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" />

        {/* -----------------------------------------------------------------------
            1. STORE LETTERHEAD & INVOICE METADATA (Header)
            ----------------------------------------------------------------------- */}
        <div className="border-b border-border/80 pb-5 pt-1">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            {/* Left: Store Information */}
            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-black text-base shadow-xs">
                  {(business?.name ?? 'BW').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    {business?.name || 'Your Business Name'}
                  </h1>
                  {business?.legalName && business.legalName !== business.name && (
                    <p className="text-xs text-muted-foreground font-medium">
                      ({business.legalName})
                    </p>
                  )}
                </div>
              </div>

              {business?.gstin && (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  <span>GSTIN: {business.gstin}</span>
                </div>
              )}

              {formattedAddress && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {formattedAddress}
                </p>
              )}

              {(business?.phone || business?.email) && (
                <p className="text-xs text-muted-foreground/90 font-medium">
                  {[
                    business.phone ? `Phone: ${business.phone}` : null,
                    business.email ? `Email: ${business.email}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}
            </div>

            {/* Right: Invoice Document Controls & Dates */}
            <div className="flex flex-col items-start md:items-end space-y-2.5 w-full md:w-auto">
              {/* Document Kind Selector */}
              <div className="relative w-full sm:w-56">
                <Select
                  id="invoice-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as InvoiceKind)}
                  className="h-10 text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/40 rounded-xl"
                  aria-label="Document Type"
                >
                  {availableKinds.map((k) => (
                    <option key={k} value={k}>
                      {INVOICE_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Invoice Number Status */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-semibold">Invoice No:</span>
                <span className="font-mono font-bold bg-muted/60 px-2 py-0.5 rounded border border-border/80 text-foreground">
                  INV-AUTO (Next on Save)
                </span>
              </div>

              {/* Invoice Date */}
              <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between md:justify-end">
                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Invoice Date:</span>
                </span>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-8 w-36 text-xs font-semibold rounded-lg"
                  aria-label="Invoice Date"
                />
              </div>

              {/* Due Date & Presets */}
              <div className="flex flex-col items-start md:items-end gap-1.5 w-full sm:w-auto">
                <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between md:justify-end">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span>Due Date:</span>
                  </span>
                  <Input
                    id="invoice-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8 w-36 text-xs font-semibold rounded-lg"
                    aria-label="Due Date"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-muted-foreground">Quick:</span>
                  {[
                    { label: 'Today', days: 0 },
                    { label: '+7d', days: 7 },
                    { label: '+15d', days: 15 },
                    { label: '+30d', days: 30 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDuePreset(p.days)}
                      className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-medium hover:border-primary hover:text-primary transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            2. BILL TO (CUSTOMER) & SUPPLY DETAILS (2-Column Box)
            ----------------------------------------------------------------------- */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: BILL TO (Customer Details) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3 text-primary" />
                  <span>Bill To (Customer)</span>
                  <span className="text-destructive">*</span>
                </span>
                {party && (
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    Saved Contact
                  </span>
                )}
              </div>

              {/* Customer Selector Dropdown */}
              <Select
                id="invoice-party-select"
                value={partyId}
                onChange={(e) => {
                  setPartyId(e.target.value);
                  if (e.target.value) {
                    setPartyName('');
                    setPartyPhone('');
                  }
                }}
                className="h-9.5 text-xs font-semibold"
                aria-label="Select Customer"
              >
                <option value="">Walk-in Customer (Manual Name / Phone)</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''} {p.gstin ? `[GSTIN: ${p.gstin}]` : ''}
                  </option>
                ))}
              </Select>

              {/* Manual Customer Name & Phone Input for Walk-in Customers */}
              {!party ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <Input
                      id="invoice-party-name"
                      placeholder="Customer Name *"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      className="h-8.5 text-xs font-semibold"
                      aria-invalid={Boolean(err('partyName'))}
                    />
                    {err('partyName') && (
                      <p className="text-[10px] text-destructive mt-0.5">{err('partyName')}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      id="invoice-party-phone"
                      placeholder="Customer Phone (Optional)"
                      value={partyPhone}
                      onChange={(e) => setPartyPhone(e.target.value)}
                      className="h-8.5 text-xs"
                    />
                  </div>
                </div>
              ) : (
                /* Selected Contact Snapshot Card */
                <div className="rounded-lg border border-border/70 bg-card p-2.5 text-xs space-y-1">
                  <div className="font-bold text-foreground">{party.name}</div>
                  {party.phone && <div className="text-muted-foreground">Phone: {party.phone}</div>}
                  {party.gstin && (
                    <div className="font-mono text-[11px] text-primary font-semibold">
                      GSTIN: {party.gstin}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: PLACE OF SUPPLY & TAX CLASSIFICATION */}
            <div className="space-y-2.5 border-t md:border-t-0 md:border-l border-border/80 pt-4 md:pt-0 md:pl-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="size-3 text-primary" />
                <span>Place of Supply & GST Rule</span>
              </span>

              {/* Place of Supply State Picker */}
              <div className="space-y-1">
                <Select
                  id="invoice-pos-override"
                  value={posOverride}
                  onChange={(e) => setPosOverride(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                  aria-label="Place of Supply State"
                >
                  <option value="">Auto-detect from Customer Location</option>
                  {GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Live Tax Classification Badge */}
              {showGst && (
                <div className="rounded-lg border border-border/70 bg-card p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Tax Applied:</span>
                    {preview?.isInterstate ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                        <Globe className="size-3" /> Interstate (IGST)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" /> Intrastate (CGST + SGST)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Place of supply: {preview?.placeOfSupply ?? supplierStateCode}{' '}
                    {preview?.isInterstate
                      ? '· Different state (IGST calculated)'
                      : '· Same state (Central + State tax split)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            3. LIVE LINE ITEMS TABLE (Interactive Document Grid)
            ----------------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="size-3.5 text-primary" />
              <span>Invoice Line Items</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {lines.length} {lines.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Table on md+; stacked cards on phone so billing stays usable one-handed. */}
          <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/60 text-[11px] font-bold text-muted-foreground">
                  <th className="w-8 px-2 py-2.5 text-center">#</th>
                  <th className="min-w-[220px] px-3 py-2.5">Item Description / Catalogue</th>
                  <th className="w-20 px-2 py-2.5">HSN</th>
                  <th className="w-20 px-2 py-2.5 text-right">Qty</th>
                  <th className="w-16 px-2 py-2.5">Unit</th>
                  <th className="w-24 px-2 py-2.5 text-right">Rate (₹)</th>
                  <th className="w-16 px-2 py-2.5 text-right">Disc %</th>
                  {showGst && <th className="w-20 px-2 py-2.5 text-right">GST %</th>}
                  <th className="w-24 px-2.5 py-2.5 text-right">Taxable (₹)</th>
                  <th className="w-28 px-3 py-2.5 text-right">Total (₹)</th>
                  <th className="w-10 px-2 py-2.5 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {lines.map((line, i) => {
                  const computed = preview?.lines[i];
                  return (
                    <tr
                      key={line.key}
                      className="group transition-colors hover:bg-muted/15"
                    >
                      <td className="px-2 py-2 text-center font-mono text-[11px] text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <ProductSearchInput
                          value={line.name}
                          onChange={(name) => setLine(line.key, { name })}
                          onPickProduct={(p) => pickProduct(line.key, p)}
                          products={products}
                          error={Boolean(err(`lines.${i}.name`))}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          placeholder="HSN"
                          value={line.hsnCode}
                          onChange={(e) => setLine(line.key, { hsnCode: e.target.value })}
                          className="h-7.5 font-mono text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="1"
                          value={line.qty}
                          onChange={(e) => setLine(line.key, { qty: e.target.value })}
                          className="h-7.5 text-right text-xs font-bold"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          placeholder="PCS"
                          value={line.unit}
                          onChange={(e) => setLine(line.key, { unit: e.target.value })}
                          className="h-7.5 text-xs uppercase"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={line.rate}
                          onChange={(e) => setLine(line.key, { rate: e.target.value })}
                          className="h-7.5 font-mono text-right text-xs font-extrabold"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Input
                          type="number"
                          step="any"
                          placeholder="0"
                          value={line.discountPct}
                          onChange={(e) => setLine(line.key, { discountPct: e.target.value })}
                          className="h-7.5 font-mono text-right text-xs"
                        />
                      </td>
                      {showGst && (
                        <td className="px-2 py-2 text-right">
                          <Select
                            value={line.taxRate}
                            onChange={(e) => setLine(line.key, { taxRate: e.target.value })}
                            className="h-7.5 text-xs"
                          >
                            {COMMON_GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </Select>
                        </td>
                      )}
                      <td className="px-2.5 py-2 text-right font-mono text-xs text-muted-foreground">
                        {computed ? `₹${computed.taxableValue}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-bold text-foreground">
                        {computed ? `₹${computed.lineTotal}` : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={lines.length === 1}
                          onClick={() => setLines((rows) => rows.filter((r) => r.key !== line.key))}
                          className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-20"
                          aria-label={`Delete row ${i + 1}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {lines.map((line, i) => {
              const computed = preview?.lines[i];
              return (
                <div
                  key={line.key}
                  className="space-y-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      Item {i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {computed && (
                        <span className="font-mono text-sm font-bold text-foreground">
                          ₹{computed.lineTotal}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() => setLines((rows) => rows.filter((r) => r.key !== line.key))}
                        className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-20"
                        aria-label={`Delete row ${i + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Product / description
                    </label>
                    <ProductSearchInput
                      value={line.name}
                      onChange={(name) => setLine(line.key, { name })}
                      onPickProduct={(p) => pickProduct(line.key, p)}
                      products={products}
                      error={Boolean(err(`lines.${i}.name`))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Qty</label>
                      <Input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="1"
                        value={line.qty}
                        onChange={(e) => setLine(line.key, { qty: e.target.value })}
                        className="h-9 text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Unit</label>
                      <Input
                        placeholder="PCS"
                        value={line.unit}
                        onChange={(e) => setLine(line.key, { unit: e.target.value })}
                        className="h-9 text-sm uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Rate (₹)
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={line.rate}
                        onChange={(e) => setLine(line.key, { rate: e.target.value })}
                        className="h-9 font-mono text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Disc %
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={line.discountPct}
                        onChange={(e) => setLine(line.key, { discountPct: e.target.value })}
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">HSN</label>
                      <Input
                        placeholder="HSN"
                        value={line.hsnCode}
                        onChange={(e) => setLine(line.key, { hsnCode: e.target.value })}
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                    {showGst && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          GST %
                        </label>
                        <Select
                          value={line.taxRate}
                          onChange={(e) => setLine(line.key, { taxRate: e.target.value })}
                          className="h-9 text-sm"
                        >
                          {COMMON_GST_RATES.map((rate) => (
                            <option key={rate} value={rate}>
                              {rate}%
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>

                  {computed && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Taxable ₹{computed.taxableValue}
                      </span>
                      <span className="font-mono font-bold">Total ₹{computed.lineTotal}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Item Row Button */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((r) => [...r, newLine()])}
              className="h-8.5 gap-1.5 px-3 text-xs font-bold border-dashed border-border/90 hover:border-primary hover:text-primary"
            >
              <Plus className="size-3.5" />
              <span>Add Another Item Row</span>
            </Button>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            4. DOCUMENT FOOTER & TOTALS LEDGER (Two-Column Layout)
            ----------------------------------------------------------------------- */}
        <div className="border-t border-border/80 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Payment Entry, Notes, Terms & Signatory */}
            <div className="space-y-4">
              {/* Payment Settlement Box */}
              {!isPaymentOpen ? (
                <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3.5 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <IndianRupee className="size-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-foreground">Record Payment Received</div>
                        <div className="text-[10px] text-muted-foreground">Add settlement (Cash, UPI, Card) right with this bill</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsPaymentOpen(true);
                        if (preview?.grandTotal) setPaymentAmount(preview.grandTotal);
                      }}
                      className="h-8 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs shrink-0"
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add Payment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3.5 transition-all shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <IndianRupee className="size-3.5" />
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Payment Received (Settlement)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {preview?.grandTotal && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(preview.grandTotal)}
                          className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/30 transition-colors"
                        >
                          Pay Full ₹{preview.grandTotal}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPaymentOpen(false);
                          setPaymentAmount('');
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Cancel payment"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>

                  {/* Amount & Method Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="pay-amount" className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <span>Amount Received (₹)</span>
                        <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="pay-amount"
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="h-8.5 pl-8 font-bold text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="pay-method" className="text-[11px] font-semibold text-muted-foreground">
                        Payment Method
                      </label>
                      <Select
                        id="pay-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="h-8.5 text-xs font-semibold"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Payment Date & Reference */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="pay-date" className="text-[11px] font-semibold text-muted-foreground">
                        Payment Date
                      </label>
                      <Input
                        id="pay-date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="pay-ref" className="text-[11px] font-semibold text-muted-foreground">
                        Reference / UTR / Cheque No
                      </label>
                      <Input
                        id="pay-ref"
                        placeholder="e.g. UPI Ref, Cheque # (optional)"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notes / Remarks
                </span>
                <Textarea
                  id="invoice-notes"
                  placeholder="e.g. Thank you for your business! Goods once sold will not be taken back."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[64px] text-xs resize-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Terms & Conditions
                </span>
                <Textarea
                  id="invoice-terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="min-h-[64px] text-xs resize-none"
                />
              </div>

              {/* Authorized Signatory Line */}
              <div className="pt-2">
                <div className="h-10 border-b border-dashed border-border/80 w-44" />
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1 block">
                  Authorized Signatory
                </span>
              </div>
            </div>

            {/* Right: Calculations & Grand Total Ledger */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Taxable Value (Subtotal):</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{preview?.subtotal ?? '0.00'}
                </span>
              </div>

              {preview && Number(preview.discountTotal) > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Discount Applied:</span>
                  <span className="font-mono font-semibold">-₹{preview.discountTotal}</span>
                </div>
              )}

              {showGst && preview?.isInterstate && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₹{preview.igstTotal}
                  </span>
                </div>
              )}

              {showGst && !preview?.isInterstate && (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono font-semibold text-foreground">
                      ₹{preview?.cgstTotal ?? '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>State GST (SGST):</span>
                    <span className="font-mono font-semibold text-foreground">
                      ₹{preview?.sgstTotal ?? '0.00'}
                    </span>
                  </div>
                </>
              )}

              {preview && Number(preview.cessTotal) > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cess:</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₹{preview.cessTotal}
                  </span>
                </div>
              )}

              {/* Other charges (shipping/freight) editable row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                <span>Other Charges (Freight / P&F):</span>
                <div className="w-24">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="h-7 text-xs font-mono text-right"
                  />
                </div>
              </div>

              {preview && Number(preview.roundOff) !== 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Round Off:</span>
                  <span className="font-mono text-xs">₹{preview.roundOff}</span>
                </div>
              )}

              {/* Grand Total Box */}
              <div className="border-t-2 border-border/90 pt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-sm font-black tracking-tight text-foreground uppercase">
                    Grand Total
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {showGst ? 'Includes applicable taxes' : 'Total payable'}
                  </div>
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black text-primary tracking-tight">
                  ₹{preview?.grandTotal ?? '0.00'}
                </div>
              </div>

              {/* Dynamic Payment & Balance Breakdown */}
              {isPaymentOpen && paymentAmount && Number(paymentAmount) > 0 && (
                <div className="space-y-1.5 pt-2.5 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Payment Received ({PAYMENT_METHOD_LABELS[paymentMethod]}):</span>
                    <span className="font-mono font-bold">-₹{Number(paymentAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-black text-foreground">
                    <span>Balance Due:</span>
                    <span className="font-mono text-sm">
                      ₹{Math.max(0, Number(preview?.grandTotal ?? 0) - Number(paymentAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WarningList warnings={warnings} />

      {/* =========================================================================
          STICKY BOTTOM ACTION BAR (Mobile & Quick-Save Confirmation)
          ========================================================================= */}
      <div className="sticky bottom-0 -mx-4 border-t border-border/80 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md sm:-mx-6 sm:px-6 rounded-t-xl z-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="lg"
              onClick={saveAndIssue}
              disabled={pending || !preview}
              className="h-10 gap-1.5 px-5 text-sm font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Zap className="size-4" />
              <span>{pending ? 'Issuing Bill…' : 'Save & Issue Bill'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={saveDraft}
              disabled={pending || !preview}
              className="h-10 px-4 text-sm font-semibold"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={pending}
              className="h-10 text-xs"
            >
              Cancel
            </Button>
          </div>

          {preview && (
            <div className="flex items-center gap-3 ml-auto text-right">
              <div>
                <span className="text-[10px] text-muted-foreground block">Total:</span>
                <span className="font-mono text-xl font-black text-foreground">
                  ₹{preview.grandTotal}
                </span>
              </div>
              {isPaymentOpen && paymentAmount && Number(paymentAmount) > 0 && (
                <div className="border-l border-border/80 pl-3 text-left">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                    Paid ({PAYMENT_METHOD_LABELS[paymentMethod]}):
                  </span>
                  <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                    ₹{Number(paymentAmount).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Saving & issuing assigns an official invoice number and updates inventory immediately.
        </p>
      </div>
    </div>
  );
}

function ProductSearchInput({
  value,
  onChange,
  onPickProduct,
  products,
  error,
}: {
  value: string;
  onChange: (name: string) => void;
  onPickProduct: (p: ProductOption) => void;
  products: readonly ProductOption[];
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = React.useMemo(() => {
    const q = value.toLowerCase().trim();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.hsnCode && p.hsnCode.includes(q)),
      )
      .slice(0, 10);
  }, [value, products]);

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  const updatePosition = React.useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 250;
    const width = Math.max(rect.width, 360);

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const top = showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 12);

    setCoords({ top, left, width });
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      if (filtered[highlightIndex]) {
        e.preventDefault();
        onPickProduct(filtered[highlightIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          placeholder="Type or search product…"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-7.5 text-xs font-semibold pr-7"
          aria-invalid={error}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-1 text-muted-foreground/60 hover:text-foreground p-1 transition-colors"
          title="Search product catalogue"
        >
          <Search className="size-3.5" />
        </button>
      </div>

      {isOpen &&
        mounted &&
        coords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="rounded-xl border border-border/90 bg-card p-1 shadow-2xl backdrop-blur-xl ring-1 ring-black/10 dark:ring-white/10 max-h-60 overflow-y-auto"
          >
            {filtered.length > 0 ? (
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  Products from Catalog ({filtered.length})
                </div>
                {filtered.map((p, idx) => {
                  const isHighlighted = idx === highlightIndex;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPickProduct(p);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isHighlighted
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{p.name}</div>
                        <div
                          className={`flex items-center gap-1.5 text-[10px] ${
                            isHighlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.hsnCode && <span>• HSN: {p.hsnCode}</span>}
                          {p.unitShortName && <span>• {p.unitShortName}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-xs">₹{p.salePrice}</div>
                        {p.taxRate && Number(p.taxRate) > 0 && (
                          <span
                            className={`text-[10px] font-mono ${
                              isHighlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}
                          >
                            {p.taxRate}% GST
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Custom Item: &quot;{value}&quot;</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  No catalog match. Press Tab to fill HSN & rate manually.
                </p>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

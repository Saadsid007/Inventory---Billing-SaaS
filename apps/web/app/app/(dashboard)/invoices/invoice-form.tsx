'use client';

import { buildInvoice, todayInIndia } from '@bahikhata/core';
import {
  GST_STATES,
  INVOICE_KIND_LABELS,
  INVOICE_KINDS,
  invoiceWarnings,
  type InvoiceKind,
} from '@bahikhata/shared';
import {
  Button,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
  WarningList,
} from '@bahikhata/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { issueInvoiceAction, saveInvoiceDraftAction } from './actions';

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
  unit: '',
  qty: '1',
  rate: '',
  discountPct: '',
  taxRate: '0',
  cessRate: '0',
});

export function InvoiceForm({
  supplierStateCode,
  supplierHasGstin,
  defaultTaxMode,
  defaultTerms,
  parties,
  products,
}: {
  supplierStateCode: string;
  supplierHasGstin: boolean;
  defaultTaxMode: 'inclusive' | 'exclusive';
  defaultTerms: string;
  parties: readonly PartyOption[];
  products: readonly ProductOption[];
}) {
  const router = useRouter();

  // An unregistered business cannot legally issue a tax invoice, so the option
  // is not offered at all rather than shown and rejected later.
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
  const [posOverride, setPosOverride] = React.useState('');
  const [taxMode, setTaxMode] = React.useState(defaultTaxMode);
  const [otherCharges, setOtherCharges] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [terms, setTerms] = React.useState(defaultTerms);
  const [lines, setLines] = React.useState<LineRow[]>([newLine()]);

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

  /** Picking a product fills the line from its master data — all snapshotted. */
  function pickProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      setLine(key, { productId: '' });
      return;
    }
    setLine(key, {
      productId: p.id,
      name: p.name,
      hsnCode: p.hsnCode ?? '',
      unit: p.unitShortName ?? '',
      rate: p.salePrice,
      taxRate: p.taxRate ?? '0',
      cessRate: p.cessRate ?? '0',
    });
  }

  /**
   * Live totals, computed by the SAME pure function the server uses.
   *
   * That is the whole point of `packages/core` being framework-free: the
   * preview a shopkeeper sees while typing cannot disagree with what gets
   * stored, because it is not a second implementation.
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
      // Half-typed numbers throw. Showing nothing is better than showing NaN.
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
      partyPhone: party?.phone ?? '',
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

  // Spec rule 6: explicit handlers, not a <form> submit.
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
        // The draft exists; only issuing failed. Send them to it rather than
        // losing what they typed.
        router.push(`/app/invoices/${saved.invoiceId}`);
        return;
      }
      router.push(`/app/invoices/${issued.invoiceId}`);
      router.refresh();
    });
  }

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <div className="space-y-6">
      <FormError>{state.formError}</FormError>

      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="Document type" htmlFor="kind" error={err('kind')}>
          <Select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as InvoiceKind)}
          >
            {availableKinds.map((k) => (
              <option key={k} value={k}>
                {INVOICE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="invoiceDate" error={err('invoiceDate')} required>
          <Input
            id="invoiceDate"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </Field>
        <Field label="Due date" htmlFor="dueDate" error={err('dueDate')}>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </section>

      {!supplierHasGstin && (
        <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          Your business has no GSTIN, so tax invoices are not available and GST fields are
          hidden. Add a GSTIN in Settings to enable them.
        </p>
      )}

      <section className="space-y-4 border-t pt-5">
        <h2 className="text-sm font-medium text-muted-foreground">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Existing contact" htmlFor="partyId">
            <Select
              id="partyId"
              value={partyId}
              onChange={(e) => {
                setPartyId(e.target.value);
                setPartyName('');
              }}
            >
              <option value="">Walk-in customer</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.phone ? ` · ${p.phone}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          {!partyId && (
            <Field
              label="Customer name"
              htmlFor="partyName"
              error={err('partyName')}
              required
              hint="Printed on the bill. Nothing is saved to your contacts."
            >
              <Input
                id="partyName"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                aria-invalid={Boolean(err('partyName'))}
              />
            </Field>
          )}
        </div>

        {showGst && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Place of supply"
              htmlFor="posOverride"
              error={err('placeOfSupply')}
              hint={
                preview
                  ? `Currently ${preview.placeOfSupply} (${preview.placeOfSupplySource.replace('_', ' ')}) — ${preview.isInterstate ? 'IGST' : 'CGST + SGST'}`
                  : 'Worked out from the customer unless you override it.'
              }
            >
              <Select
                id="posOverride"
                value={posOverride}
                onChange={(e) => setPosOverride(e.target.value)}
              >
                <option value="">Work it out automatically</option>
                {GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Price entry"
              htmlFor="taxMode"
              hint="Whether the rates below already include GST."
            >
              <Select
                id="taxMode"
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value as typeof taxMode)}
              >
                <option value="exclusive">Tax added on top</option>
                <option value="inclusive">Tax already included</option>
              </Select>
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-3 border-t pt-5">
        <h2 className="text-sm font-medium text-muted-foreground">Items</h2>

        <div className="space-y-3">
          {lines.map((line, i) => {
            const computed = preview?.lines[i];
            return (
              <div key={line.key} className="rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select
                        aria-label={`Product for line ${i + 1}`}
                        value={line.productId}
                        onChange={(e) => pickProduct(line.key, e.target.value)}
                      >
                        <option value="">Pick a product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.sku ? ` · ${p.sku}` : ''}
                          </option>
                        ))}
                      </Select>
                      <Input
                        aria-label={`Item name for line ${i + 1}`}
                        placeholder="Item name"
                        value={line.name}
                        onChange={(e) => setLine(line.key, { name: e.target.value })}
                        aria-invalid={Boolean(err(`lines.${i}.name`))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Input
                        aria-label={`Quantity for line ${i + 1}`}
                        placeholder="Qty"
                        inputMode="decimal"
                        value={line.qty}
                        onChange={(e) => setLine(line.key, { qty: e.target.value })}
                      />
                      <Input
                        aria-label={`Rate for line ${i + 1}`}
                        placeholder="Rate"
                        inputMode="decimal"
                        value={line.rate}
                        onChange={(e) => setLine(line.key, { rate: e.target.value })}
                      />
                      <Input
                        aria-label={`Discount percent for line ${i + 1}`}
                        placeholder="Disc %"
                        inputMode="decimal"
                        value={line.discountPct}
                        onChange={(e) => setLine(line.key, { discountPct: e.target.value })}
                      />
                      {showGst ? (
                        <Input
                          aria-label={`GST rate for line ${i + 1}`}
                          placeholder="GST %"
                          inputMode="decimal"
                          value={line.taxRate}
                          onChange={(e) => setLine(line.key, { taxRate: e.target.value })}
                        />
                      ) : (
                        <Input
                          aria-label={`HSN for line ${i + 1}`}
                          placeholder="HSN"
                          value={line.hsnCode}
                          onChange={(e) => setLine(line.key, { hsnCode: e.target.value })}
                        />
                      )}
                    </div>

                    {computed && (
                      <p className="tabular text-xs text-muted-foreground">
                        Taxable ₹{computed.taxableValue}
                        {showGst && preview!.isInterstate && ` · IGST ₹${computed.igstAmount}`}
                        {showGst &&
                          !preview!.isInterstate &&
                          ` · CGST ₹${computed.cgstAmount} · SGST ₹${computed.sgstAmount}`}
                        {' · '}
                        <span className="font-medium text-foreground">
                          Line total ₹{computed.lineTotal}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((rows) => rows.filter((r) => r.key !== line.key))
                    }
                    className="mt-1 rounded p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="outline" size="sm" onClick={() => setLines((r) => [...r, newLine()])}>
          <Plus className="size-4" />
          Add item
        </Button>
        {err('lines') && <p className="text-xs text-destructive">{err('lines')}</p>}
      </section>

      <section className="space-y-4 border-t pt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Other charges"
            htmlFor="otherCharges"
            hint="Freight, packing. Added after tax."
          >
            <Input
              id="otherCharges"
              inputMode="decimal"
              value={otherCharges}
              onChange={(e) => setOtherCharges(e.target.value)}
            />
          </Field>
        </div>

        {preview && (
          <dl className="ml-auto w-full max-w-xs space-y-1.5 rounded-lg border p-4 text-sm sm:w-80">
            <Row label="Taxable value" value={preview.subtotal} />
            {Number(preview.discountTotal) > 0 && (
              <Row label="Discount" value={`-${preview.discountTotal}`} />
            )}
            {showGst && preview.isInterstate && <Row label="IGST" value={preview.igstTotal} />}
            {showGst && !preview.isInterstate && (
              <>
                <Row label="CGST" value={preview.cgstTotal} />
                <Row label="SGST" value={preview.sgstTotal} />
              </>
            )}
            {Number(preview.cessTotal) > 0 && <Row label="Cess" value={preview.cessTotal} />}
            {Number(preview.otherCharges) > 0 && (
              <Row label="Other charges" value={preview.otherCharges} />
            )}
            {Number(preview.roundOff) !== 0 && (
              <Row label="Round off" value={preview.roundOff} />
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular">₹{preview.grandTotal}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="space-y-4 border-t pt-5">
        <Field label="Notes" htmlFor="notes" hint="Shown on the invoice.">
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Terms" htmlFor="terms">
          <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
      </section>

      <WarningList warnings={warnings} />

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button onClick={saveAndIssue} disabled={pending || !preview}>
          {pending ? 'Working…' : 'Save and issue'}
        </Button>
        <Button variant="outline" onClick={saveDraft} disabled={pending || !preview}>
          Save as draft
        </Button>
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Issuing assigns a permanent invoice number and reduces stock. A draft does neither.
      </p>
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

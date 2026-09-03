'use client';

import { allocatePayment, type OpenInvoice, type Tender } from '@billwise/core';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@billwise/shared';
import { Button, Dropdown, type DropdownOption, Field, FormError, Input } from '@billwise/ui';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { recordPartyPaymentAction } from '../actions';

type TenderRow = {
  id: number;
  method: PaymentMethod;
  amount: string;
  reference: string;
};

let tenderSeq = 1;
const createRow = (
  method: PaymentMethod = 'cash',
  amount = '',
  reference = '',
): TenderRow => ({
  id: tenderSeq++,
  method,
  amount,
  reference,
});

const isAmount = (v: string) => /^\d+(\.\d{0,2})?$/.test(v.trim());
const inr = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const PAYMENT_METHOD_OPTIONS: readonly DropdownOption<PaymentMethod>[] =
  PAYMENT_METHODS.map((m) => ({
    value: m,
    label: PAYMENT_METHOD_LABELS[m],
  }));

export function PaymentModal({
  open,
  onClose,
  partyId,
  partyName,
  openInvoices,
  outstanding,
}: {
  open: boolean;
  onClose: () => void;
  partyId: string;
  partyName: string;
  openInvoices: OpenInvoice[];
  outstanding: string;
}) {
  const router = useRouter();
  const rawDue = Math.max(0, Number(outstanding));

  // Start with empty amount - DO NOT auto-fill!
  const [rows, setRows] = React.useState<TenderRow[]>(() => [createRow('cash', '')]);
  const [paidOn, setPaidOn] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [showDetails, setShowDetails] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  // Reset when opened - DO NOT auto-fill amount!
  React.useEffect(() => {
    if (open) {
      setError(undefined);
      setShowDetails(false);
      setRows([createRow('cash', '')]);
      setPaidOn(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  // Handle escape key
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !pending) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pending, onClose]);

  const validTenders: Tender[] = React.useMemo(() => {
    return rows
      .filter((r) => isAmount(r.amount) && Number(r.amount) > 0)
      .map((r) => ({
        method: r.method,
        amount: r.amount.trim(),
        reference: r.reference.trim() || null,
      }));
  }, [rows]);

  const total = rows.reduce(
    (sum, r) => sum + (isAmount(r.amount) ? Number(r.amount) : 0),
    0,
  );

  // Compute live auto-allocation
  const plan = React.useMemo(() => {
    if (validTenders.length === 0) return null;
    try {
      return allocatePayment({ tenders: validTenders, invoices: openInvoices });
    } catch {
      return null;
    }
  }, [validTenders, openInvoices]);

  function patchRow(id: number, change: Partial<TenderRow>) {
    setRows((all) => all.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  function prefillFullDue() {
    if (rawDue > 0 && rows.length > 0) {
      patchRow(rows[0]!.id, { amount: rawDue.toFixed(2) });
    }
  }

  function addSplitRow() {
    if (rows.length >= 5) return;
    const hasUpi = rows.some((r) => r.method === 'upi');
    const nextMethod: PaymentMethod = hasUpi ? 'cheque' : 'upi';
    setRows((all) => [...all, createRow(nextMethod)]);
  }

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(undefined);

    if (validTenders.length === 0) {
      setError('Please enter at least one payment amount greater than ₹0.');
      return;
    }

    startTransition(async () => {
      const result = await recordPartyPaymentAction(partyId, {
        paidOn,
        tenders: validTenders.map((t) => ({
          method: t.method,
          amount: t.amount,
          reference: t.reference || undefined,
        })),
      });

      if (!result.ok) {
        setError(
          result.formError ??
            Object.values(result.fieldErrors ?? {})[0] ??
            'Could not record payment.',
        );
        return;
      }

      onClose();
      router.refresh();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/90 bg-card shadow-2xl ring-1 ring-border/50 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Wallet className="size-4" />
            </span>
            <div className="leading-tight">
              <h2 id="payment-modal-title" className="text-sm font-bold text-foreground">
                Record Payment
              </h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[15rem] sm:max-w-[20rem]">
                {partyName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="record-payment-form"
          onSubmit={submit}
          className="flex-1 overflow-y-auto p-4 space-y-3.5"
        >
          <FormError>{error}</FormError>

          {/* Slim Balance Bar with Optional One-Click Prefill */}
          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="font-bold tabular text-amber-950 dark:text-amber-100">
                {inr(outstanding)}
              </span>
            </div>
            {rawDue > 0 && total !== rawDue && (
              <button
                type="button"
                onClick={prefillFullDue}
                className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-500/30 transition-colors"
              >
                Pay Full ({inr(rawDue)})
              </button>
            )}
          </div>

          {/* Payment Methods Section (Supports Multiple at Once e.g. 2000 cash + 4000 upi) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">
                Payment Amount & Methods {rows.length > 1 && `(${rows.length})`}
              </span>
              <button
                type="button"
                disabled={rows.length >= 5}
                onClick={addSplitRow}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="size-3" /> + Add Another Method
              </button>
            </div>

            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/20 p-2"
                >
                  <div className="w-32 shrink-0">
                    <Dropdown
                      size="sm"
                      value={row.method}
                      onChange={(method) => patchRow(row.id, { method })}
                      options={PAYMENT_METHOD_OPTIONS}
                    />
                  </div>

                  <div className="relative flex-1 min-w-[7.5rem]">
                    <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      inputMode="decimal"
                      autoFocus={idx === 0}
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => patchRow(row.id, { amount: e.target.value })}
                      className="h-8.5 pl-7 text-xs font-bold"
                    />
                  </div>

                  <Input
                    placeholder={row.method === 'cheque' ? 'Cheque #' : 'Ref / Note (opt)'}
                    value={row.reference}
                    onChange={(e) => patchRow(row.id, { reference: e.target.value })}
                    className="h-8.5 flex-1 min-w-[7.5rem] text-xs"
                  />

                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((all) => all.filter((r) => r.id !== row.id))
                      }
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors shrink-0"
                      title="Remove method"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Live Total Pill */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs">
              <span className="font-semibold text-muted-foreground">Total Received:</span>
              <span className="font-black text-sm tabular text-foreground">
                {inr(total)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <Field label="Payment Date" htmlFor="pay-date">
            <Input
              id="pay-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="h-8.5 text-xs sm:max-w-44"
            />
          </Field>

          {/* Compact Auto-Settlement Summary */}
          {plan && plan.allocations.length > 0 && (
            <div className="rounded-lg border border-border/80 bg-muted/25 p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-foreground font-medium text-[11px]">
                  <Receipt className="size-3.5 text-primary" />
                  <span>
                    Clears {plan.allocations.filter((a) => Number(a.dueAfter) <= 0).length}{' '}
                    of {openInvoices.length} open bills
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails((prev) => !prev)}
                  className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline font-semibold"
                >
                  {showDetails ? (
                    <>
                      Hide <ChevronUp className="size-3" />
                    </>
                  ) : (
                    <>
                      Details <ChevronDown className="size-3" />
                    </>
                  )}
                </button>
              </div>

              {Number(plan.unallocated) > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                  + {inr(plan.unallocated)} kept as customer advance on khata
                </p>
              )}

              {/* Collapsible detail list */}
              {showDetails && (
                <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 border-t border-border/60 pt-2 text-[11px]">
                  {plan.allocations.map((a) => (
                    <li
                      key={a.invoiceId}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span>
                        Bill #{a.invoiceNo ?? 'N/A'}{' '}
                        {Number(a.dueAfter) <= 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            (cleared)
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            (₹{a.dueAfter} remains)
                          </span>
                        )}
                      </span>
                      <span className="font-bold tabular text-foreground">
                        -₹{a.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>

        {/* Fixed Pinned Footer - NEVER Cut Off */}
        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/20 px-4 py-2.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onClose}
            className="h-8 text-xs px-3"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="record-payment-form"
            size="sm"
            disabled={pending || total <= 0}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs font-semibold px-3 gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            {pending ? 'Saving…' : `Save ${total > 0 ? inr(total) : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

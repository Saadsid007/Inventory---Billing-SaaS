'use client';

import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@billwise/shared';
import { Button, Field, FormError, Input, Select } from '@billwise/ui';
import {
  AlertTriangle,
  ArrowLeft,
  FileCheck,
  IndianRupee,
  Printer,
  ReceiptText,
  Undo2,
  Wallet,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { cancelInvoiceAction, issueInvoiceAction, recordPaymentAction } from '../actions';

/**
 * Issue, cancel and record-payment controls for invoice detail view.
 */
export function InvoiceActions({
  invoiceId,
  status,
  grandTotal,
  amountPaid,
}: {
  invoiceId: string;
  status: 'draft' | 'issued' | 'cancelled';
  grandTotal: string;
  amountPaid: string;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<'none' | 'issue' | 'cancel' | 'pay' | 'print'>('none');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const due = Math.max(0, Number(grandTotal) - Number(amountPaid)).toFixed(2);

  const [amount, setAmount] = React.useState(due);
  const [method, setMethod] = React.useState<(typeof PAYMENT_METHODS)[number]>('cash');
  const [paidOn, setPaidOn] = React.useState(new Date().toISOString().slice(0, 10));

  function openPrint(format: 'a4' | 'thermal') {
    if (typeof window !== 'undefined') {
      localStorage.setItem('billwise-print-format', format);
    }
    setMode('none');
    window.open(`/app/invoices/${invoiceId}/print?format=${format}`, '_blank');
  }

  function run(fn: () => Promise<{ ok: boolean; formError?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setMode('none');
        router.refresh();
      } else {
        setError(result.formError ?? 'Something went wrong.');
      }
    });
  }

  if (status === 'cancelled') return null;

  return (
    <div className="relative">
      {mode === 'none' && (
        <div className="flex flex-wrap items-center gap-2">
          {status === 'draft' && (
            <>
              <Button
                className="bg-primary shadow-sm hover:brightness-105"
                onClick={() => setMode('issue')}
              >
                <FileCheck className="size-4" /> Issue invoice
              </Button>
              <Button variant="outline" onClick={() => router.push('/app/invoices')}>
                <ArrowLeft className="size-3.5" /> All invoices
              </Button>
            </>
          )}

          {status === 'issued' && (
            <>
              {Number(due) > 0 && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30"
                  onClick={() => {
                    setAmount(due);
                    setMode('pay');
                  }}
                >
                  <Wallet className="size-4" /> Record payment
                </Button>
              )}

              <Button
                variant="outline"
                className="hover:border-primary/40 hover:bg-primary-subtle/30"
                onClick={() => setMode('print')}
              >
                <Printer className="size-4" /> Print / Receipt
              </Button>

              <Button
                variant="outline"
                className="hover:border-primary/40 hover:bg-primary-subtle/30"
                onClick={() => router.replace(`/app/invoices/${invoiceId}?return=1#return`)}
              >
                <Undo2 className="size-4" /> Record return
              </Button>

              <Button
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs"
                onClick={() => setMode('cancel')}
              >
                Cancel invoice
              </Button>
            </>
          )}
        </div>
      )}

      {/* Floating Action Modal Dialog */}
      {mode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border/90 bg-card p-5 shadow-2xl ring-1 ring-border/50 sm:p-6 animate-in zoom-in-95 duration-150">
            <FormError>{error}</FormError>

            {/* PRINT FORMAT SELECTION */}
            {mode === 'print' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Printer className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold">Choose Print Format</h3>
                      <p className="text-xs text-muted-foreground">Select how you want to print or save this bill</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMode('none')}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => openPrint('a4')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/80 bg-gradient-to-br from-card to-muted/30 p-4 text-center hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <ReceiptText className="size-8 text-primary transition-transform group-hover:scale-110" />
                    <span className="font-semibold text-sm">Full A4 Invoice</span>
                    <span className="text-[11px] text-muted-foreground">Standard GST tax invoice for accounting</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openPrint('thermal')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/80 bg-gradient-to-br from-card to-muted/30 p-4 text-center hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <Printer className="size-8 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110" />
                    <span className="font-semibold text-sm">Thermal POS (80mm)</span>
                    <span className="text-[11px] text-muted-foreground">Compact counter receipt for customers</span>
                  </button>
                </div>
              </div>
            )}

            {/* ISSUE INVOICE CONFIRMATION */}
            {mode === 'issue' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileCheck className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">Issue This Invoice?</h3>
                    <p className="text-xs text-muted-foreground">Assigns permanent number & deductions</p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs leading-relaxed space-y-1">
                  <p className="font-medium text-foreground">
                    Issuing locks this document, assigns a permanent sequential GST invoice number, and deducts items from shelf stock.
                  </p>
                  <p className="text-muted-foreground">
                    This action is permanent and cannot be deleted.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" disabled={pending} onClick={() => setMode('none')}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-primary text-primary-foreground shadow-sm"
                    disabled={pending}
                    onClick={() => run(() => issueInvoiceAction(invoiceId))}
                  >
                    {pending ? 'Issuing…' : 'Yes, Issue Invoice'}
                  </Button>
                </div>
              </div>
            )}

            {/* RECORD PAYMENT */}
            {mode === 'pay' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                      <Wallet className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold">Record Payment</h3>
                      <p className="text-xs text-muted-foreground">Credit customer khata & settle bill</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMode('none')}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Outstanding balance banner */}
                <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                  <div>
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      Outstanding Balance
                    </p>
                    <p className="text-lg font-black text-amber-950 dark:text-amber-100 tabular">
                      ₹{due}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(due)}
                    className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-colors"
                  >
                    Pay Full ₹{due}
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  <Field label="Amount Received (₹)" htmlFor="pay-amount" required>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pay-amount"
                        inputMode="decimal"
                        className="h-10 pl-9 font-semibold text-foreground text-sm"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Payment Method" htmlFor="pay-method">
                      <Select
                        id="pay-method"
                        className="h-10 text-xs"
                        value={method}
                        onChange={(e) => setMethod(e.target.value as typeof method)}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Payment Date" htmlFor="pay-date">
                      <Input
                        id="pay-date"
                        type="date"
                        className="h-10 text-xs"
                        value={paidOn}
                        onChange={(e) => setPaidOn(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" disabled={pending} onClick={() => setMode('none')}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30"
                    disabled={pending || !amount || Number(amount) <= 0}
                    onClick={() =>
                      run(() => recordPaymentAction(invoiceId, { amount, method, paidOn }))
                    }
                  >
                    {pending ? 'Saving…' : 'Confirm & Save Payment'}
                  </Button>
                </div>
              </div>
            )}

            {/* CANCEL INVOICE */}
            {mode === 'cancel' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-destructive">Cancel Invoice</h3>
                    <p className="text-xs text-muted-foreground">Restore stock and void bill</p>
                  </div>
                </div>

                <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-xs leading-relaxed">
                  <p className="text-foreground font-medium">
                    Cancelling puts all sold items back into shelf stock and zeros out the customer receivable.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    The invoice number remains logged to maintain strict sequential GST compliance.
                  </p>
                </div>

                <Field label="Reason for Cancellation" htmlFor="cancel-reason" required>
                  <Input
                    id="cancel-reason"
                    className="h-10 text-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Customer changed mind, wrong bill generated…"
                    autoFocus
                  />
                </Field>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" disabled={pending} onClick={() => setMode('none')}>
                    Keep Invoice
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={pending || reason.trim().length < 3}
                    onClick={() => run(() => cancelInvoiceAction(invoiceId, { reason }))}
                  >
                    {pending ? 'Cancelling…' : 'Confirm Cancellation'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@bahikhata/shared';
import { Button, Field, FormError, Input, Select } from '@bahikhata/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { cancelInvoiceAction, issueInvoiceAction, recordPaymentAction } from '../actions';

/**
 * Issue, cancel and record-payment controls.
 *
 * Issue and cancel both need a confirmation step: issuing burns a permanent
 * invoice number and moves stock, and cancelling cannot be undone. Neither is
 * something to do by mis-clicking.
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
  const [mode, setMode] = React.useState<'none' | 'issue' | 'cancel' | 'pay'>('none');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const due = (Number(grandTotal) - Number(amountPaid)).toFixed(2);
  const [amount, setAmount] = React.useState(due);
  const [method, setMethod] = React.useState<(typeof PAYMENT_METHODS)[number]>('cash');
  const [paidOn, setPaidOn] = React.useState(new Date().toISOString().slice(0, 10));

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
    <div className="w-full space-y-3 sm:w-auto">
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          {status === 'draft' && (
            <>
              <Button onClick={() => setMode('issue')}>Issue invoice</Button>
              <Button variant="outline" onClick={() => router.push('/app/invoices')}>
                Back to list
              </Button>
            </>
          )}
          {status === 'issued' && (
            <>
              {Number(due) > 0 && <Button onClick={() => setMode('pay')}>Record payment</Button>}
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="ghost" onClick={() => setMode('cancel')}>
                Cancel invoice
              </Button>
            </>
          )}
        </div>
      )}

      <FormError>{error}</FormError>

      {mode === 'issue' && (
        <div className="space-y-3 rounded-lg border p-4 sm:w-80">
          <p className="text-sm">
            Issuing assigns a permanent invoice number and reduces stock for every item.
          </p>
          <p className="text-xs text-muted-foreground">
            The number can never be reused, even if you cancel afterwards.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() => run(() => issueInvoiceAction(invoiceId))}
            >
              {pending ? 'Issuing…' : 'Yes, issue it'}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setMode('none')}>
              Not yet
            </Button>
          </div>
        </div>
      )}

      {mode === 'cancel' && (
        <div className="space-y-3 rounded-lg border p-4 sm:w-80">
          <p className="text-sm">Cancelling puts the stock back and voids the invoice.</p>
          <p className="text-xs text-muted-foreground">
            The invoice keeps its number and stays in your records — a missing number in a GST
            series looks like a hidden sale.
          </p>
          <Field label="Reason" htmlFor="cancel-reason" required>
            <Input
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Customer returned the goods"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending || reason.trim().length < 3}
              onClick={() => run(() => cancelInvoiceAction(invoiceId, { reason }))}
            >
              {pending ? 'Cancelling…' : 'Cancel invoice'}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setMode('none')}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      {mode === 'pay' && (
        <div className="space-y-3 rounded-lg border p-4 sm:w-80">
          <Field label="Amount" htmlFor="pay-amount" hint={`₹${due} outstanding`} required>
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Method" htmlFor="pay-method">
            <Select
              id="pay-method"
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
          <Field label="Date" htmlFor="pay-date">
            <Input
              id="pay-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              disabled={pending || !amount}
              onClick={() =>
                run(() => recordPaymentAction(invoiceId, { amount, method, paidOn }))
              }
            >
              {pending ? 'Saving…' : 'Record payment'}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setMode('none')}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

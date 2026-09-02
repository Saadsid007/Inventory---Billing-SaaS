'use client';

import { allocatePayment, type OpenInvoice, type Tender } from '@billwise/core';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@billwise/shared';
import { Alert, Button, Field, FormError, Input, Select } from '@billwise/ui';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { recordPartyPaymentAction } from '../actions';

/**
 * "Payment received" — one settlement, spread across a customer's open bills
 * and across however many ways the money actually arrived.
 *
 * ## Why the split is shown before it is saved
 *
 * A credit customer hands over one lot of money against several bills, and the
 * shopkeeper's first question is always "so which bill is cleared now?". An app
 * that decides that silently and shows the answer afterwards is asking to be
 * distrusted. So the split is drawn live as the amount is typed: which bills
 * close, which is left part-paid, and how much is still owed on it.
 *
 * The preview calls `allocatePayment` from @billwise/core — the very same
 * function the server uses for the write. Two implementations of "oldest first"
 * would eventually disagree, and the one time they did, the screen would have
 * lied.
 *
 * The server still recomputes rather than trusting what is posted: this page
 * may have been open for ten minutes while another till took money.
 *
 * ## Why several methods
 *
 * ₹5,000 settled as ₹2,000 cash and a ₹3,000 cheque is ordinary. Forcing one
 * method makes the shopkeeper pick whichever is bigger, and from then on the
 * cash drawer never reconciles.
 */

type Row = { id: number; method: PaymentMethod; amount: string; reference: string };

let nextRowId = 1;
const emptyRow = (method: PaymentMethod = 'cash'): Row => ({
  id: nextRowId++,
  method,
  amount: '',
  reference: '',
});

/** The field is free text, and mid-typing it is "", "12." or "-". */
const isAmount = (v: string) => /^\d+(\.\d{0,2})?$/.test(v.trim());

export function PaymentPanel({
  partyId,
  partyName,
  openInvoices,
  outstanding,
}: {
  partyId: string;
  partyName: string;
  openInvoices: OpenInvoice[];
  outstanding: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>(() => [emptyRow()]);
  const [paidOn, setPaidOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | undefined>();
  const [done, setDone] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const totalDue = openInvoices.reduce((sum, i) => sum + Number(i.due), 0);
  const total = rows.reduce((sum, r) => sum + (isAmount(r.amount) ? Number(r.amount) : 0), 0);

  const plan = React.useMemo(() => {
    const tenders: Tender[] = rows
      .filter((r) => isAmount(r.amount) && Number(r.amount) > 0)
      .map((r) => ({
        method: r.method,
        amount: r.amount.trim(),
        reference: r.reference.trim() || null,
      }));
    if (tenders.length === 0) return null;
    try {
      return allocatePayment({ tenders, invoices: openInvoices });
    } catch {
      return null;
    }
  }, [rows, openInvoices]);

  function patch(id: number, change: Partial<Row>) {
    setRows((all) => all.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  function reset() {
    setRows([emptyRow()]);
    setOpen(false);
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await recordPartyPaymentAction(partyId, {
        paidOn,
        tenders: rows
          .filter((r) => isAmount(r.amount) && Number(r.amount) > 0)
          .map((r) => ({
            method: r.method,
            amount: r.amount.trim(),
            reference: r.reference.trim() || undefined,
          })),
      });

      if (!result.ok) {
        setError(
          result.formError ?? Object.values(result.fieldErrors ?? {})[0] ?? 'Could not save.',
        );
        return;
      }

      const parts: string[] = [`₹${result.total} recorded`];
      if (result.settled > 0) {
        parts.push(`${result.settled} bill${result.settled === 1 ? '' : 's'} cleared`);
      }
      if (result.partPaid > 0) parts.push('1 bill part-paid');
      if (Number(result.onAccount) > 0) parts.push(`₹${result.onAccount} kept as advance`);

      setDone(parts.join(' · '));
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="space-y-3">
        {done && <Alert variant="success">{done}</Alert>}
        <Button
          onClick={() => {
            setOpen(true);
            setDone(undefined);
          }}
        >
          <Wallet /> Payment received
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Payment from {partyName}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {openInvoices.length === 0
            ? 'No bills are outstanding. Anything you enter is kept as advance credit.'
            : `${openInvoices.length} bill${openInvoices.length === 1 ? '' : 's'} open, ₹${totalDue.toFixed(2)} due. The oldest is paid off first.`}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end">
            <Field label="Method" labelHidden={index > 0} htmlFor={`pp-method-${row.id}`}>
              <Select
                id={`pp-method-${row.id}`}
                value={row.method}
                onChange={(e) => patch(row.id, { method: e.target.value as PaymentMethod })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Amount" labelHidden={index > 0} htmlFor={`pp-amount-${row.id}`}>
              <Input
                id={`pp-amount-${row.id}`}
                inputMode="decimal"
                autoFocus={index === 0}
                placeholder="0.00"
                value={row.amount}
                onChange={(e) => patch(row.id, { amount: e.target.value })}
              />
            </Field>

            <Field label="Reference" labelHidden={index > 0} htmlFor={`pp-ref-${row.id}`}>
              <Input
                id={`pp-ref-${row.id}`}
                value={row.reference}
                onChange={(e) => patch(row.id, { reference: e.target.value })}
                placeholder={row.method === 'cheque' ? 'Cheque no.' : 'Optional'}
              />
            </Field>

            {rows.length > 1 ? (
              <Button
                variant="ghost"
                aria-label="Remove this method"
                onClick={() => setRows((all) => all.filter((r) => r.id !== row.id))}
              >
                <Trash2 />
              </Button>
            ) : (
              <span className="hidden sm:block sm:w-9" />
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={rows.length >= 6}
            onClick={() => setRows((all) => [...all, emptyRow('upi')])}
          >
            <Plus /> Add another method
          </Button>
          <p className="text-sm text-muted-foreground">
            Total received <span className="tabular font-medium text-foreground">₹{total.toFixed(2)}</span>
            <span className="ml-2">of ₹{outstanding} outstanding</span>
          </p>
        </div>
      </div>

      <Field label="Date" htmlFor="pp-date" className="sm:max-w-48">
        <Input
          id="pp-date"
          type="date"
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
        />
      </Field>

      {plan && plan.allocations.length > 0 && (
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            This payment will be split like this
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {plan.allocations.map((a) => (
              <li key={a.invoiceId}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="tabular">
                    {a.invoiceNo ?? '—'}
                    <span className="ml-2 text-muted-foreground">{a.invoiceDate}</span>
                  </span>
                  <span className="tabular">
                    ₹{a.amount}{' '}
                    {Number(a.dueAfter) === 0 ? (
                      <span className="text-success">· cleared</span>
                    ) : (
                      <span className="text-warning">· ₹{a.dueAfter} still due</span>
                    )}
                  </span>
                </div>
                {/* Only worth showing when a bill was settled more than one
                    way — otherwise it repeats what the method dropdown says. */}
                {a.parts.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {a.parts.map((p) => `₹${p.amount} ${PAYMENT_METHOD_LABELS[p.method]}`).join(' + ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {Number(plan.unallocated) > 0 && (
            <p className="mt-2 border-t pt-2 text-sm">
              ₹{plan.unallocated} left over (
              {plan.unallocatedParts
                .map((p) => `₹${p.amount} ${PAYMENT_METHOD_LABELS[p.method]}`)
                .join(', ')}
              ). Every bill is settled, so this is kept as advance and comes off their next one.
            </p>
          )}
        </div>
      )}

      {plan && plan.allocations.length === 0 && Number(plan.unallocated) > 0 && (
        <Alert variant="info">
          Nothing is outstanding, so the whole ₹{plan.unallocated} is kept as advance credit.
        </Alert>
      )}

      <FormError>{error}</FormError>

      <div className="flex gap-2">
        <Button disabled={pending || !plan} onClick={submit}>
          {pending ? 'Saving…' : 'Record payment'}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

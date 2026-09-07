'use client';

import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@billwise/shared';
import { Button, Field, FormError, Input, Select, cn } from '@billwise/ui';
import { Wallet, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { collectBalanceAction } from './actions';

/**
 * Taking the rest of the money, from wherever you happen to be.
 *
 * ## Why a dialog and not a panel on the detail page
 *
 * It was a panel, which meant collecting ₹50 from a customer standing at the
 * counter was: find the row, open the receipt, wait for the page, click, type,
 * save, go back. Six steps for a two-second transaction that happens forty
 * times a day. The same component now opens over the receipts list, so the
 * whole thing is two clicks from the row.
 *
 * ## Why the amount is pre-filled with the whole balance
 *
 * Because that is what happens nine times in ten — the customer has come to
 * collect their work and is settling up. Paying part of a part payment is an
 * edit, not the default.
 */
export function CollectDialog({
  invoiceId,
  balance,
  receiptNo,
  partyName,
  trigger = 'button',
  className,
}: {
  invoiceId: string;
  /** Outstanding, as a money string. */
  balance: string;
  receiptNo?: string | undefined;
  partyName?: string | undefined;
  /** `icon` for the compact one inside a table row. */
  trigger?: 'button' | 'icon';
  className?: string | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(balance);
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [paidOn, setPaidOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  // Reopening after a part payment should offer what is left now, not what was
  // left when this row was first rendered.
  React.useEffect(() => {
    if (open) {
      setAmount(balance);
      setError(undefined);
    }
  }, [open, balance]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await collectBalanceAction(invoiceId, { amount, method, paidOn });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {trigger === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Take payment"
          aria-label={`Take payment for ${receiptNo ?? 'this receipt'}`}
          className={cn(
            'rounded-lg border border-warning/30 bg-warning/10 p-1.5 text-warning transition-colors hover:bg-warning/20',
            className,
          )}
        >
          <Wallet className="size-4" />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} className={className}>
          <Wallet /> Take payment
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Take payment"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <form
            onSubmit={submit}
            className="relative w-full max-w-md space-y-4 rounded-t-2xl border bg-card p-5 shadow-lg sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Take payment</h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {[receiptNo, partyName].filter(Boolean).join(' · ') || 'Receipt'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-xl bg-warning/10 px-4 py-3 text-center text-warning">
              <p className="text-xs font-semibold tracking-widest uppercase">Outstanding</p>
              <p className="tabular mt-0.5 text-2xl font-bold">
                ₹{Number(balance).toFixed(2)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount" htmlFor="collect-amount" required>
                <Input
                  id="collect-amount"
                  inputMode="decimal"
                  // biome-ignore lint/a11y/noAutofocus: a dialog opened to type
                  // one number should not need a second click to type it.
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="tabular"
                />
              </Field>
              <Field label="Paid by" htmlFor="collect-method">
                <Select
                  id="collect-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date" htmlFor="collect-date">
                <Input
                  id="collect-date"
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              </Field>
            </div>

            <FormError>{error}</FormError>

            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? 'Saving…' : 'Payment received'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

'use client';

import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@billwise/shared';
import { Button, Field, FormError, Input, Select } from '@billwise/ui';
import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { collectBalanceAction } from '../actions';

/**
 * Taking the rest of the money.
 *
 * Opens with the full balance already filled in, because that is what happens
 * nine times in ten — the customer has come to collect their work and is
 * settling up. Anything else is an edit, not a form to fill.
 */
export function CollectPanel({
  invoiceId,
  balance,
}: {
  invoiceId: string;
  balance: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(balance);
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [paidOn, setPaidOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  function submit() {
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

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Wallet /> Baaki paisa lein
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Baaki ₹{Number(balance).toFixed(2)} le rahe hain?</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kitna" htmlFor="c-amt" required>
          <Input
            id="c-amt"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Kaise" htmlFor="c-method">
          <Select
            id="c-method"
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
        <Field label="Date" htmlFor="c-date">
          <Input
            id="c-date"
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </Field>
      </div>

      <FormError>{error}</FormError>

      <div className="flex gap-2">
        <Button disabled={pending} onClick={submit}>
          {pending ? 'Saving…' : 'Paisa mil gaya'}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

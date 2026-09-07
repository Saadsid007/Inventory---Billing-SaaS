'use client';

import type { SevaService } from '@billwise/db';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@billwise/shared';
import { Button, Field, FormError, Input, Select, Switch } from '@billwise/ui';
import { Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { createReceiptAction } from '../actions';

type Party = { id: string; name: string; phone: string | null };

type Line = {
  key: number;
  serviceId: string;
  name: string;
  rate: string;
  qty: string;
  tracked: boolean;
  expectedOn: string;
  referenceNo: string;
  documentsHeld: string;
};

let nextKey = 1;
const blankLine = (): Line => ({
  key: nextKey++,
  serviceId: '',
  name: '',
  rate: '',
  qty: '1',
  tracked: false,
  expectedOn: '',
  referenceNo: '',
  documentsHeld: '',
});

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const inr = (v: number) => `₹${v.toFixed(2)}`;

/**
 * Making a receipt.
 *
 * ## Why this is small
 *
 * The shop's invoice form is fifteen hundred lines because a shop needs tax
 * modes, place of supply, HSN codes, five document kinds and per-line
 * discounts. A Jan Seva counter needs none of it. Someone comes in for an
 * Aadhaar update: pick the work, take ₹100 of ₹150, print. Anything more on
 * screen is something to skip past with a queue waiting.
 *
 * ## The tracking switch, per line
 *
 * Not every job is a job. A photocopy is finished before the customer turns
 * around; a PAN card is two weeks away. The rate list already knows which is
 * which, so choosing a service sets the switch and fills a promised date — but
 * it stays a switch, because the same service can go either way. Somebody
 * collecting a certificate that is already printed does not need a register
 * entry, and forcing one would fill the work list with jobs that were never
 * open.
 */
export function ReceiptForm({
  services,
  parties,
}: {
  services: SevaService[];
  parties: Party[];
}) {
  const router = useRouter();
  const [lines, setLines] = React.useState<Line[]>(() => [blankLine()]);
  const [partyId, setPartyId] = React.useState('');
  const [partyName, setPartyName] = React.useState('');
  const [partyPhone, setPartyPhone] = React.useState('');
  const [receiptDate, setReceiptDate] = React.useState(today);
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = React.useState('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const total = lines.reduce((sum, l) => {
    const rate = Number(l.rate || 0);
    const qty = Number(l.qty || 0);
    return sum + (Number.isFinite(rate * qty) ? rate * qty : 0);
  }, 0);

  const received = Number(amountReceived || 0);
  const balance = Math.max(0, total - (Number.isFinite(received) ? received : 0));

  function patch(key: number, change: Partial<Line>) {
    setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));
  }

  /** Choosing from the rate list fills the price and the tracking defaults. */
  function chooseService(key: number, serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      patch(key, { serviceId: '', tracked: false, expectedOn: '' });
      return;
    }
    patch(key, {
      serviceId,
      name: service.name,
      rate: service.price,
      tracked: service.tracked,
      expectedOn: service.tracked ? addDays(service.days) : '',
    });
  }

  function submit(andNew: boolean) {
    setError(undefined);

    const usable = lines.filter((l) => (l.serviceId || l.name.trim()) && Number(l.rate || 0) >= 0);
    if (usable.length === 0) {
      setError('Add at least one line.');
      return;
    }

    startTransition(async () => {
      const result = await createReceiptAction({
        receiptDate,
        partyId: partyId || undefined,
        partyName: partyId ? undefined : partyName || undefined,
        partyPhone: partyId ? undefined : partyPhone || undefined,
        amountReceived: amountReceived || '0',
        method,
        note: note || undefined,
        lines: usable.map((l) => ({
          serviceId: l.serviceId || undefined,
          name: l.name,
          qty: l.qty || '1',
          rate: l.rate || '0',
          tracked: l.tracked,
          expectedOn: l.tracked ? l.expectedOn || undefined : undefined,
          referenceNo: l.tracked ? l.referenceNo || undefined : undefined,
          documentsHeld: l.tracked ? l.documentsHeld || undefined : undefined,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (andNew) {
        // The counter case: one customer after another. Keep the date and the
        // method, clear everything that belongs to the person who just left.
        setLines([blankLine()]);
        setPartyId('');
        setPartyName('');
        setPartyPhone('');
        setAmountReceived('');
        setNote('');
        router.refresh();
        return;
      }
      router.push(`/app/seva/receipts/${result.invoiceId}`);
    });
  }

  return (
    <div className="space-y-4">
      {/* Customer. One row, and skippable — most counter work is a walk-in. */}
      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
        <Field label="Customer" htmlFor="r-party" hint="Leave blank for a walk-in.">
          <Select
            id="r-party"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
          >
            <option value="">Walk-in / new</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.phone ? ` · ${p.phone}` : ''}
              </option>
            ))}
          </Select>
        </Field>

        {!partyId && (
          <>
            <Field label="Name" htmlFor="r-name">
              <Input
                id="r-name"
                placeholder="Ramesh Kumar"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
              />
            </Field>
            <Field
              label="Mobile"
              htmlFor="r-phone"
              hint="Needed to send the bill and the ready message."
            >
              <Input
                id="r-phone"
                inputMode="tel"
                placeholder="98765 43210"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      {/* Work. */}
      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={line.key} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_5rem_7rem_auto] sm:items-end">
              <Field label="Work" htmlFor={`l-svc-${line.key}`} labelHidden={index > 0}>
                <Select
                  id={`l-svc-${line.key}`}
                  value={line.serviceId}
                  onChange={(e) => chooseService(line.key, e.target.value)}
                >
                  <option value="">Choose work…</option>
                  {services
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ₹{s.price}
                      </option>
                    ))}
                  <option value="">— something else —</option>
                </Select>
              </Field>

              <Field label="Qty" htmlFor={`l-qty-${line.key}`} labelHidden={index > 0}>
                <Input
                  id={`l-qty-${line.key}`}
                  inputMode="decimal"
                  value={line.qty}
                  onChange={(e) => patch(line.key, { qty: e.target.value })}
                />
              </Field>

              <Field label="Amount" htmlFor={`l-rate-${line.key}`} labelHidden={index > 0}>
                <Input
                  id={`l-rate-${line.key}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={line.rate}
                  onChange={(e) => patch(line.key, { rate: e.target.value })}
                />
              </Field>

              {lines.length > 1 ? (
                <Button
                  variant="ghost"
                  aria-label="Remove this line"
                  onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                >
                  <Trash2 />
                </Button>
              ) : (
                <span className="hidden sm:block sm:w-9" />
              )}
            </div>

            {/* Free-text name, only when nothing was picked from the list. */}
            {!line.serviceId && (
              <Field
                label="What is the work?"
                htmlFor={`l-name-${line.key}`}
                hint="For one-off work that is not on your rate list."
              >
                <Input
                  id={`l-name-${line.key}`}
                  placeholder="Affidavit typing"
                  value={line.name}
                  onChange={(e) => patch(line.key, { name: e.target.value })}
                />
              </Field>
            )}

            <div className="flex items-start gap-3 border-t pt-3">
              <Switch
                id={`l-trk-${line.key}`}
                className="mt-0.5"
                checked={line.tracked}
                onCheckedChange={(v) =>
                  patch(line.key, {
                    tracked: v,
                    expectedOn: v && !line.expectedOn ? addDays(7) : line.expectedOn,
                  })
                }
              />
              <label htmlFor={`l-trk-${line.key}`} className="min-w-0 cursor-pointer">
                <span className="block text-sm font-medium">This work will be ready later</span>
                <span className="text-xs text-muted-foreground">
                  It goes onto the work register so you can track it. Leave this off for
                  anything finished the same day.
                </span>
              </label>
            </div>

            {line.tracked && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Promised by" htmlFor={`l-exp-${line.key}`}>
                  <Input
                    id={`l-exp-${line.key}`}
                    type="date"
                    value={line.expectedOn}
                    onChange={(e) => patch(line.key, { expectedOn: e.target.value })}
                  />
                </Field>
                <Field
                  label="Reference no."
                  htmlFor={`l-ref-${line.key}`}
                  hint="Government acknowledgement number. Never the Aadhaar number."
                >
                  <Input
                    id={`l-ref-${line.key}`}
                    value={line.referenceNo}
                    onChange={(e) => patch(line.key, { referenceNo: e.target.value })}
                  />
                </Field>
                <Field label="Documents taken" htmlFor={`l-doc-${line.key}`}>
                  <Input
                    id={`l-doc-${line.key}`}
                    placeholder="Aadhaar copy, 2 photos"
                    value={line.documentsHeld}
                    onChange={(e) => patch(line.key, { documentsHeld: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        ))}

        <Button variant="outline" onClick={() => setLines((all) => [...all, blankLine()])}>
          <Plus /> Add another
        </Button>
      </div>

      {/* Money. */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="tabular text-2xl font-bold">{inr(total)}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Received now" htmlFor="r-recv" hint="All of it or part of it — either is fine.">
            <Input
              id="r-recv"
              inputMode="decimal"
              placeholder="0.00"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
            />
          </Field>
          <Field label="Paid by" htmlFor="r-method">
            <Select
              id="r-method"
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
          <Field label="Date" htmlFor="r-date">
            <Input
              id="r-date"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setAmountReceived(total.toFixed(2))}
          >
            Full ₹{total.toFixed(0)}
          </Button>
          <Button
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setAmountReceived((total / 2).toFixed(2))}
          >
            Half
          </Button>
          {amountReceived !== '' && (
            <Button
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setAmountReceived('')}
            >
              <X className="size-3.5" /> Nothing
            </Button>
          )}
        </div>

        {balance > 0 && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
            Balance outstanding: {inr(balance)}
          </p>
        )}

        <Field label="Note" htmlFor="r-note" hint="Optional.">
          <Input
            id="r-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Come back tomorrow evening"
          />
        </Field>
      </div>

      <FormError>{error}</FormError>

      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={pending || total <= 0} onClick={() => submit(false)}>
          {pending ? 'Saving…' : 'Save & open receipt'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={pending || total <= 0}
          onClick={() => submit(true)}
        >
          Save & next customer
        </Button>
      </div>
    </div>
  );
}

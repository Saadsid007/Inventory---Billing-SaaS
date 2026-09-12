'use client';

import type { BatchRow } from '@billwise/db';
import { EXPIRY_WARNING_DAYS } from '@billwise/shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  Input,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  cn,
} from '@billwise/ui';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { addBatchAction, writeOffBatchAction } from './batch-actions';

const inr = (v: string | null) => (v ? `₹${Number(v).toFixed(2)}` : '—');

/** "03/2027" — how an expiry is printed on a strip, and how it is read back. */
const expiryLabel = (iso: string | null) => {
  if (!iso) return 'No expiry';
  const [y, m] = iso.slice(0, 10).split('-');
  return `${m}/${y}`;
};

/**
 * The last day of a month, from an `<input type="month">` value.
 *
 * "EXP 03/2027" means the medicine is good *through* March. Storing the first
 * of the month would expire every batch a month early and put saleable stock on
 * the write-off list.
 */
function endOfMonth(monthValue: string): string {
  const [y, m] = monthValue.split('-').map(Number);
  if (!y || !m) return '';
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const EMPTY = { batchNo: '', expiryMonth: '', mfgMonth: '', mrp: '', cost: '', quantity: '' };

/**
 * The lots of one medicine.
 *
 * ## Why a month picker and not a date picker
 *
 * Because a strip is printed "EXP 03/2027" and nothing else. Asking a chemist
 * for a day they do not have forces them to invent one, and the one they invent
 * is the 1st — which quietly expires every batch a month early.
 *
 * ## Why expired lots are not hidden
 *
 * They are the ones that need doing something about. Hiding them would make
 * the shelf and the screen disagree exactly where it matters most, and the
 * write-off button is the whole point of showing them.
 */
export function BatchPanel({
  productId,
  batches,
  itemLabel,
}: {
  productId: string;
  batches: BatchRow[];
  itemLabel: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const inStock = batches.reduce((sum, b) => sum + Number(b.quantity), 0);

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await addBatchAction({
        productId,
        batchNo: form.batchNo,
        expiryDate: form.expiryMonth ? endOfMonth(form.expiryMonth) : undefined,
        mfgDate: form.mfgMonth ? endOfMonth(form.mfgMonth) : undefined,
        mrp: form.mrp || undefined,
        purchasePrice: form.cost || undefined,
        quantity: form.quantity || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(EMPTY);
      setAdding(false);
      router.refresh();
    });
  }

  function writeOff(batch: BatchRow) {
    setError(undefined);
    startTransition(async () => {
      const result = await writeOffBatchAction(batch.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <Layers className="size-3.5" /> Batches
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {batches.length === 0
              ? 'Stock is held per batch, with its own expiry date.'
              : `${inStock} in stock across ${batches.length} ${
                  batches.length === 1 ? 'batch' : 'batches'
                }.`}
          </p>
        </div>
        <Button size="sm" variant={adding ? 'ghost' : 'outline'} onClick={() => setAdding((v) => !v)}>
          <Plus /> {adding ? 'Cancel' : 'Add batch'}
        </Button>
      </div>

      {adding && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Batch number" htmlFor="b-no" required>
              <Input
                id="b-no"
                // biome-ignore lint/a11y/noAutofocus: the panel only opens when
                // somebody has already chosen to type into it.
                autoFocus
                placeholder="As printed on the strip"
                value={form.batchNo}
                onChange={set('batchNo')}
              />
            </Field>

            <Field label="Expiry" htmlFor="b-exp" hint="Month and year, as printed.">
              <Input id="b-exp" type="month" value={form.expiryMonth} onChange={set('expiryMonth')} />
            </Field>

            <Field label="Manufactured" htmlFor="b-mfg">
              <Input id="b-mfg" type="month" value={form.mfgMonth} onChange={set('mfgMonth')} />
            </Field>

            <Field label="MRP" htmlFor="b-mrp" hint="Printed on this pack.">
              <Input id="b-mrp" inputMode="decimal" value={form.mrp} onChange={set('mrp')} />
            </Field>

            <Field label="Cost price" htmlFor="b-cost" hint="What this lot cost you.">
              <Input id="b-cost" inputMode="decimal" value={form.cost} onChange={set('cost')} />
            </Field>

            <Field label="Quantity received" htmlFor="b-qty" hint="Goes onto the stock ledger.">
              <Input
                id="b-qty"
                inputMode="decimal"
                value={form.quantity}
                onChange={set('quantity')}
              />
            </Field>
          </div>

          <FormError>{error}</FormError>

          <div className="flex gap-2">
            <Button disabled={pending} onClick={submit}>
              {pending ? 'Saving…' : 'Add batch'}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!adding && <FormError>{error}</FormError>}

      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          description={`Add the lots you have on the shelf. Each one keeps its own expiry, MRP and cost, and billing picks the one expiring soonest.`}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Batch</TH>
              <TH>Expiry</TH>
              <TH numeric>MRP</TH>
              <TH numeric>Cost</TH>
              <TH numeric>In stock</TH>
              <TH> </TH>
            </TR>
          </THead>
          <TBody>
            {batches.map((batch) => {
              const days = batch.daysToExpiry;
              const expired = days !== null && days < 0;
              const soon = days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;
              return (
                <TR
                  key={batch.id}
                  className={cn(expired && 'bg-destructive/5', soon && 'bg-warning/5')}
                >
                  <TD className="tabular font-medium">{batch.batchNo}</TD>
                  <TD>
                    <span className="tabular">{expiryLabel(batch.expiryDate)}</span>
                    {expired && (
                      <Badge variant="destructive" className="ml-2">
                        Expired
                      </Badge>
                    )}
                    {soon && (
                      <Badge variant="warning" className="ml-2">
                        {days} {days === 1 ? 'day' : 'days'} left
                      </Badge>
                    )}
                  </TD>
                  <TD numeric>{inr(batch.mrp)}</TD>
                  <TD numeric className="text-muted-foreground">
                    {inr(batch.purchasePrice)}
                  </TD>
                  <TD numeric className="font-medium">
                    {Number(batch.quantity)}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      {expired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={pending}
                          title={`Write off ${batch.batchNo}`}
                          onClick={() => writeOff(batch)}
                        >
                          <Trash2 /> Write off
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Stock for this {itemLabel.toLowerCase()} is the total of its batches. Billing sells from
        the batch expiring soonest, and never from one that has already expired.
      </p>
    </Card>
  );
}

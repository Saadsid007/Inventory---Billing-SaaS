'use client';

import { Alert, Button, Card, Checkbox, Field, FormError, Input, Textarea } from '@billwise/ui';
import { Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { recordReturnAction } from '../actions';

/**
 * Recording what a customer brought back.
 *
 * Starts from the invoice's own lines rather than a blank form, because a
 * return is always "some of this bill". Typing the item name again is how a
 * return ends up against the wrong product.
 *
 * Quantity defaults to nothing, not to the full amount: most returns are
 * partial, and a pre-filled full quantity is the kind of default that gets
 * saved without being read.
 */
export type ReturnableLine = {
  lineId: string;
  productId: string | null;
  name: string;
  rate: string;
  soldQty: string;
  alreadyReturned: string;
  unit: string | null;
};

export function ReturnForm({
  invoiceId,
  lines,
  today,
  defaultOpen = false,
}: {
  invoiceId: string;
  lines: readonly ReturnableLine[];
  today: string;
  /** Set by ?return=1, which is what the header button links to. */
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Opened from the header, which is a screen away on a long invoice. Scrolling
  // to it is the difference between "nothing happened" and "there it is".
  React.useEffect(() => {
    if (defaultOpen) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [defaultOpen]);
  const [qty, setQty] = React.useState<Record<number, string>>({});
  const [restock, setRestock] = React.useState<Record<number, boolean>>({});
  const [returnDate, setReturnDate] = React.useState(today);
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const remaining = (i: number) =>
    Number(lines[i]?.soldQty ?? 0) - Number(lines[i]?.alreadyReturned ?? 0);

  const picked = lines
    .map((line, i) => ({ line, i, qty: Number(qty[i] ?? 0) }))
    .filter((p) => p.qty > 0);

  const total = picked.reduce((sum, p) => sum + p.qty * Number(p.line.rate), 0);

  const overLimit = picked.filter((p) => p.qty > remaining(p.i) + 1e-9);

  function submit() {
    setError(undefined);
    if (picked.length === 0) {
      setError('Enter a quantity against at least one item.');
      return;
    }
    if (overLimit.length > 0) {
      setError('A return cannot be more than what was sold on this bill.');
      return;
    }

    startTransition(async () => {
      const result = await recordReturnAction({
        invoiceId,
        returnDate,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
        lines: picked.map((p) => ({
          lineId: p.line.lineId,
          qty: String(p.qty),
          restock: restock[p.i] ?? true,
        })),
      });

      if (result.ok) {
        setOpen(false);
        setQty({});
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <div id="return">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Undo2 /> Record a return
        </Button>
      </div>
    );
  }

  return (
    <Card id="return" ref={cardRef} className="space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-[0.95rem] font-semibold">Record a return</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Enter how much of each item came back. Stock goes up again and the customer owes that
          much less. The bill itself does not change, so what was printed stays true.
        </p>
      </div>

      <FormError>{error}</FormError>

      <div className="space-y-2">
        {lines.map((line, i) => {
          const left = remaining(i);
          return (
            <div
              key={`${line.name}-${i}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.name}</p>
                <p className="tabular text-xs text-muted-foreground">
                  Sold {line.soldQty}
                  {line.unit ? ` ${line.unit}` : ''} at ₹{line.rate}
                  {Number(line.alreadyReturned) > 0 && ` · ${line.alreadyReturned} already back`}
                  {` · ${left} can be returned`}
                </p>
              </div>

              <Input
                className="w-28"
                inputMode="decimal"
                placeholder="Qty"
                aria-label={`Return quantity for ${line.name}`}
                disabled={left <= 0}
                value={qty[i] ?? ''}
                onChange={(e) => setQty((q) => ({ ...q, [i]: e.target.value }))}
                aria-invalid={Number(qty[i] ?? 0) > left}
              />

              <Checkbox
                label="Back on shelf"
                hint="Uncheck if damaged"
                checked={restock[i] ?? true}
                onCheckedChange={(checked) => setRestock((r) => ({ ...r, [i]: checked }))}
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Return date" htmlFor="return-date" required>
          <Input
            id="return-date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </Field>
        <Field label="Reason" htmlFor="return-reason" hint="Damaged, wrong item, not needed.">
          <Input id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>

      <Field label="Note" htmlFor="return-note">
        <Textarea id="return-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {picked.length > 0 && (
        <Alert variant="info" title={`Credit of ₹${total.toFixed(2)}`}>
          {picked.length} {picked.length === 1 ? 'item' : 'items'} coming back. That comes off what
          this customer owes you.
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : 'Save return'}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { Button, Field, FormError, Input, Select, Textarea } from '@bahikhata/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { adjustStockAction } from './actions';

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  currentStock: string;
};

export function StockForm({ products }: { products: readonly ProductOption[] }) {
  const router = useRouter();
  const [productId, setProductId] = React.useState('');
  const [direction, setDirection] = React.useState<'in' | 'out'>('in');
  const [qty, setQty] = React.useState('');
  const [note, setNote] = React.useState('');
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
    done?: string;
  }>({});
  const [pending, startTransition] = React.useTransition();

  const product = products.find((p) => p.id === productId);

  /**
   * What the stock will read after this is recorded.
   *
   * Shown live because "out" of more than you have is allowed — shops sell
   * before entering purchases, and blocking it would stop real work (spec
   * §5.4). Showing the negative result is the warning.
   */
  const projected =
    product && qty && !Number.isNaN(Number(qty))
      ? (Number(product.currentStock) + (direction === 'in' ? 1 : -1) * Number(qty)).toFixed(3)
      : null;

  // Spec rule 6: explicit handler, not a <form> submit.
  function submit() {
    setState({});
    startTransition(async () => {
      const result = await adjustStockAction({ productId, direction, qty, note });
      if (result.ok) {
        setState({ done: `${result.productName} is now at ${result.newStock}.` });
        setQty('');
        setNote('');
        router.refresh();
      } else {
        setState({
          ...(result.formError !== undefined && { formError: result.formError }),
          ...(result.fieldErrors !== undefined && { fieldErrors: result.fieldErrors }),
        });
      }
    });
  }

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <div className="space-y-4">
      <FormError>{state.formError}</FormError>
      {state.done && (
        <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
          {state.done}
        </p>
      )}

      <Field label="Product" htmlFor="productId" error={err('productId')} required>
        <Select id="productId" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Pick a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.sku ? ` · ${p.sku}` : ''} — {p.currentStock}
              {p.unit ? ` ${p.unit}` : ''}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Direction" htmlFor="direction" error={err('direction')}>
          <Select
            id="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
          >
            <option value="in">Stock in — goods arrived</option>
            <option value="out">Stock out — goods left</option>
          </Select>
        </Field>
        <Field
          label="Quantity"
          htmlFor="qty"
          error={err('qty')}
          hint={
            projected !== null
              ? `${product!.name} will be at ${projected}${product!.unit ? ` ${product!.unit}` : ''}`
              : undefined
          }
          required
        >
          <Input
            id="qty"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-invalid={Boolean(err('qty'))}
          />
        </Field>
      </div>

      {projected !== null && Number(projected) < 0 && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          This takes stock below zero. That is allowed — shops often sell before entering the
          purchase — but check the number is right.
        </p>
      )}

      <Field
        label="Note"
        htmlFor="note"
        error={err('note')}
        hint="Why. You will thank yourself when reconciling later."
      >
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Delivery from supplier / breakage / stock count correction"
        />
      </Field>

      <Button onClick={submit} disabled={pending || !productId || !qty}>
        {pending ? 'Recording…' : direction === 'in' ? 'Record stock in' : 'Record stock out'}
      </Button>
    </div>
  );
}

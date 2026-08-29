'use client';

import { productWarnings } from '@billwise/shared';
import {
  Button,
  Card,
  Checkbox,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
  WarningList,
} from '@billwise/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { saveProductAction } from './actions';

export type FormOption = { id: string; label: string };
export type CustomFieldDefView = {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options: string[] | null;
  required: boolean;
};

export type ProductFormValues = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  unitId: string;
  hsnCode: string;
  taxRateId: string;
  salePrice: string;
  purchasePrice: string;
  openingStock: string;
  lowStockAlert: string;
  trackInventory: boolean;
  description: string;
  showInCatalog: boolean;
  customFields: Record<string, unknown>;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  unitId: '',
  hsnCode: '',
  taxRateId: '',
  salePrice: '',
  purchasePrice: '',
  openingStock: '',
  lowStockAlert: '',
  trackInventory: true,
  description: '',
  showInCatalog: true,
  customFields: {},
};

export function ProductForm({
  productId,
  initial,
  categories,
  units,
  taxRates,
  customFieldDefs,
}: {
  productId?: string;
  initial: ProductFormValues;
  categories: readonly FormOption[];
  units: readonly FormOption[];
  taxRates: readonly FormOption[];
  customFieldDefs: readonly CustomFieldDefView[];
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const [pending, startTransition] = React.useTransition();

  const set =
    <K extends keyof ProductFormValues>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }) as ProductFormValues);

  const setCustom = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, customFields: { ...v.customFields, [key]: value } }));

  // Advice, not validation. Recomputed on every keystroke so it disappears the
  // moment the user fixes it (spec §5.5 — warn, never block).
  const warnings = productWarnings({
    hsnCode: values.hsnCode || undefined,
    taxRateId: values.taxRateId || undefined,
    trackInventory: values.trackInventory,
    openingStock: values.openingStock || undefined,
  });

  // Spec rule 6: explicit handler, not a <form> submit.
  function submit() {
    setState({});
    startTransition(async () => {
      const result = await saveProductAction(values, productId);
      if (result.ok) {
        router.push('/app/products');
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
    <div className="space-y-6">
      <FormError>{state.formError}</FormError>

      <Card className="space-y-4 p-5">
        <Field label="Product name" htmlFor="name" error={err('name')} required>
          <Input
            id="name"
            autoFocus
            value={values.name}
            onChange={set('name')}
            aria-invalid={Boolean(err('name'))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" htmlFor="sku" error={err('sku')} hint="Your own item code. Optional.">
            <Input id="sku" value={values.sku} onChange={set('sku')} />
          </Field>
          <Field
            label="Barcode"
            htmlFor="barcode"
            error={err('barcode')}
            hint="Scannable during billing."
          >
            <Input id="barcode" value={values.barcode} onChange={set('barcode')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="categoryId" error={err('categoryId')}>
            <Select id="categoryId" value={values.categoryId} onChange={set('categoryId')}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unit" htmlFor="unitId" error={err('unitId')}>
            <Select id="unitId" value={values.unitId} onChange={set('unitId')}>
              <option value="">No unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Pricing and tax
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sale price" htmlFor="salePrice" error={err('salePrice')} required>
            <Input
              id="salePrice"
              inputMode="decimal"
              value={values.salePrice}
              onChange={set('salePrice')}
              aria-invalid={Boolean(err('salePrice'))}
            />
          </Field>
          <Field
            label="Purchase price"
            htmlFor="purchasePrice"
            error={err('purchasePrice')}
            hint="Your cost. Never shown to customers."
          >
            <Input
              id="purchasePrice"
              inputMode="decimal"
              value={values.purchasePrice}
              onChange={set('purchasePrice')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="HSN / SAC code"
            htmlFor="hsnCode"
            error={err('hsnCode')}
            hint="4, 6 or 8 digits. Required on GST invoices."
          >
            <Input
              id="hsnCode"
              inputMode="numeric"
              value={values.hsnCode}
              onChange={set('hsnCode')}
            />
          </Field>
          <Field label="GST rate" htmlFor="taxRateId" error={err('taxRateId')}>
            <Select id="taxRateId" value={values.taxRateId} onChange={set('taxRateId')}>
              <option value="">No tax (0%)</option>
              {taxRates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Stock
        </h2>

        <Checkbox
          label="Track inventory for this product"
          hint="Turn off for services — there is nothing to count."
          checked={values.trackInventory}
          onCheckedChange={(checked) => setValues((v) => ({ ...v, trackInventory: checked }))}
        />

        {values.trackInventory && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Opening stock"
              htmlFor="openingStock"
              error={err('openingStock')}
              hint={
                productId
                  ? 'Set at creation. Use Stock In / Out to change stock now.'
                  : 'How much you have right now.'
              }
            >
              <Input
                id="openingStock"
                inputMode="decimal"
                value={values.openingStock}
                onChange={set('openingStock')}
                // Stock only ever moves through the ledger. Letting this field
                // rewrite current_stock would desynchronise the rollup from its
                // own movements, and nothing would detect it.
                disabled={Boolean(productId)}
              />
            </Field>
            <Field
              label="Low stock alert at"
              htmlFor="lowStockAlert"
              error={err('lowStockAlert')}
              hint="Warn when stock drops to this."
            >
              <Input
                id="lowStockAlert"
                inputMode="decimal"
                value={values.lowStockAlert}
                onChange={set('lowStockAlert')}
              />
            </Field>
          </div>
        )}
      </Card>

      {customFieldDefs.length > 0 && (
        <Card className="space-y-4 p-5">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Your own fields
          </h2>
          {customFieldDefs.map((def) => (
            <Field key={def.id} label={def.label} htmlFor={`cf-${def.key}`} required={def.required}>
              {def.type === 'checkbox' ? (
                <Checkbox
                  id={`cf-${def.key}`}
                  label={def.label}
                  checked={Boolean(values.customFields[def.key])}
                  onCheckedChange={(checked) => setCustom(def.key, checked)}
                />
              ) : def.type === 'select' ? (
                <Select
                  id={`cf-${def.key}`}
                  value={String(values.customFields[def.key] ?? '')}
                  onChange={(e) => setCustom(def.key, e.target.value)}
                >
                  <option value="">—</option>
                  {(def.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={`cf-${def.key}`}
                  type={def.type === 'date' ? 'date' : 'text'}
                  inputMode={def.type === 'number' ? 'decimal' : undefined}
                  value={String(values.customFields[def.key] ?? '')}
                  onChange={(e) => setCustom(def.key, e.target.value)}
                />
              )}
            </Field>
          ))}
        </Card>
      )}

      <Card className="space-y-4 p-5">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Catalog
        </h2>
        <Field label="Description" htmlFor="description" error={err('description')}>
          <Textarea id="description" value={values.description} onChange={set('description')} />
        </Field>
        <Checkbox
          label="Show on my public catalog"
          checked={values.showInCatalog}
          onCheckedChange={(checked) => setValues((v) => ({ ...v, showInCatalog: checked }))}
        />
        {!productId && (
          <p className="text-xs text-muted-foreground">
            Save the product first, then add photos — they are filed under the product, so it has to
            exist before they can be uploaded.
          </p>
        )}
      </Card>

      <WarningList warnings={warnings} />

      <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Button onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : productId ? 'Save changes' : 'Add product'}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

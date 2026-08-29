'use client';

import { Button, Card, Checkbox, Field, FormError, Input, Select, Textarea } from '@billwise/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { saveSettingsAction } from './actions';

type Values = {
  defaultTaxMode: 'inclusive' | 'exclusive';
  invoiceTerms: string;
  invoiceFooter: string;
  showCatalogPrices: boolean;
  catalogEnabled: boolean;
  catalogWhatsapp: string;
};

export function InvoiceSettingsSection({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
    saved?: boolean;
  }>({});
  const [pending, startTransition] = React.useTransition();

  function submit() {
    setState({});
    startTransition(async () => {
      const result = await saveSettingsAction(values);
      if (result.ok) {
        setState({ saved: true });
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
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Invoices and catalog</h2>
        <p className="text-sm text-muted-foreground">
          Defaults applied to new invoices, and what the public sees.
        </p>
      </div>

      <FormError>{state.formError}</FormError>

      <Field
        label="Price entry"
        htmlFor="s-taxMode"
        error={err('defaultTaxMode')}
        hint="Whether the rates you type already include GST."
      >
        <Select
          id="s-taxMode"
          value={values.defaultTaxMode}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              defaultTaxMode: e.target.value as Values['defaultTaxMode'],
            }))
          }
        >
          <option value="exclusive">Tax added on top (exclusive)</option>
          <option value="inclusive">Tax already included (inclusive)</option>
        </Select>
      </Field>

      <Field
        label="Terms and conditions"
        htmlFor="s-terms"
        error={err('invoiceTerms')}
        hint="Printed at the bottom of every invoice."
      >
        <Textarea
          id="s-terms"
          value={values.invoiceTerms}
          onChange={(e) => setValues((v) => ({ ...v, invoiceTerms: e.target.value }))}
        />
      </Field>

      <Field label="Invoice footer" htmlFor="s-footer" error={err('invoiceFooter')}>
        <Input
          id="s-footer"
          value={values.invoiceFooter}
          onChange={(e) => setValues((v) => ({ ...v, invoiceFooter: e.target.value }))}
        />
      </Field>

      <div className="space-y-3 rounded-lg border p-4">
        <Checkbox
          label="Publish my public catalog"
          hint="Turning this off makes your catalog page return 404 immediately."
          checked={values.catalogEnabled}
          onCheckedChange={(checked) => setValues((v) => ({ ...v, catalogEnabled: checked }))}
        />
        <Checkbox
          label="Show prices on the catalog"
          hint="Wholesalers often publish a catalog without prices."
          checked={values.showCatalogPrices}
          onCheckedChange={(checked) => setValues((v) => ({ ...v, showCatalogPrices: checked }))}
        />
        <Field
          label="WhatsApp number for enquiries"
          htmlFor="s-whatsapp"
          error={err('catalogWhatsapp')}
          hint="Catalog visitors get an Enquire button that opens a chat with you."
        >
          <Input
            id="s-whatsapp"
            type="tel"
            value={values.catalogWhatsapp}
            onChange={(e) => setValues((v) => ({ ...v, catalogWhatsapp: e.target.value }))}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {state.saved && <span className="text-sm text-success">Saved</span>}
      </div>
    </Card>
  );
}

'use client';

import { Button, Field, FormError, FormSuccess, Input } from '@billwise/ui';
import * as React from 'react';
import { saveSevaSettingsAction } from './actions';

type Values = {
  name: string;
  phone: string;
  addressLine1: string;
  city: string;
  pincode: string;
  gstin: string;
  invoiceFooter: string;
};

export function SevaSettingsForm({ initial }: { initial: Values }) {
  const [values, setValues] = React.useState(initial);
  const [error, setError] = React.useState<string | undefined>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  function submit() {
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSevaSettingsAction(values);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-lg border p-5">
        <Field label="Centre name" htmlFor="s-name" required>
          <Input id="s-name" value={values.name} onChange={set('name')} />
        </Field>

        <Field
          label="Mobile number"
          htmlFor="s-phone"
          hint="Printed on every receipt and sent with every WhatsApp message."
          required
        >
          <Input id="s-phone" inputMode="tel" value={values.phone} onChange={set('phone')} />
        </Field>

        <Field label="Address" htmlFor="s-addr">
          <Input
            id="s-addr"
            placeholder="Shop 3, near the Block Office"
            value={values.addressLine1}
            onChange={set('addressLine1')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="s-city">
            <Input id="s-city" value={values.city} onChange={set('city')} />
          </Field>
          <Field label="Pincode" htmlFor="s-pin">
            <Input id="s-pin" inputMode="numeric" value={values.pincode} onChange={set('pincode')} />
          </Field>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-5">
        <Field
          label="GSTIN"
          htmlFor="s-gstin"
          hint="Most Jan Seva Kendras are not registered — leave this blank. Fill it in and your receipts become tax invoices."
        >
          <Input id="s-gstin" value={values.gstin} onChange={set('gstin')} />
        </Field>

        <Field
          label="Line printed at the bottom of receipts"
          htmlFor="s-footer"
          hint="For example: we will message you as soon as your work is ready."
        >
          <Input id="s-footer" value={values.invoiceFooter} onChange={set('invoiceFooter')} />
        </Field>
      </div>

      <FormError>{error}</FormError>
      {saved && <FormSuccess>Saved.</FormSuccess>}

      <Button size="lg" disabled={pending} onClick={submit}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

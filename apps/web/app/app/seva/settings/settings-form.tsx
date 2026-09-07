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
        <Field label="Kendra ka naam" htmlFor="s-name" required>
          <Input id="s-name" value={values.name} onChange={set('name')} />
        </Field>

        <Field
          label="Mobile number"
          htmlFor="s-phone"
          hint="Receipt pe chhapta hai aur WhatsApp message me jaata hai."
          required
        >
          <Input id="s-phone" inputMode="tel" value={values.phone} onChange={set('phone')} />
        </Field>

        <Field label="Pata" htmlFor="s-addr">
          <Input
            id="s-addr"
            placeholder="Shop 3, Block Office ke paas"
            value={values.addressLine1}
            onChange={set('addressLine1')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shehar" htmlFor="s-city">
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
          hint="Zyadatar Jan Seva Kendra registered nahi hote — khaali chhod dijiye. Daalne par receipt tax invoice ban jaayegi."
        >
          <Input id="s-gstin" value={values.gstin} onChange={set('gstin')} />
        </Field>

        <Field
          label="Receipt ke neeche likha jaane wala"
          htmlFor="s-footer"
          hint="Jaise: kaam taiyaar hone par message aa jaayega."
        >
          <Input id="s-footer" value={values.invoiceFooter} onChange={set('invoiceFooter')} />
        </Field>
      </div>

      <FormError>{error}</FormError>
      {saved && <FormSuccess>Save ho gaya.</FormSuccess>}

      <Button size="lg" disabled={pending} onClick={submit}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

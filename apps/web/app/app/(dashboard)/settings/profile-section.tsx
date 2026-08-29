'use client';

import { GST_STATES } from '@bahikhata/shared';
import { Button, Card, Field, FormError, Input, Select } from '@bahikhata/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { saveProfileAction } from './actions';

type Values = {
  name: string;
  legalName: string;
  gstin: string;
  stateCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
};

export function ProfileSection({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
    saved?: boolean;
  }>({});
  const [pending, startTransition] = React.useTransition();

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function submit() {
    setState({});
    startTransition(async () => {
      const result = await saveProfileAction(values);
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
        <h2 className="text-base font-semibold">Business profile</h2>
        <p className="text-sm text-muted-foreground">
          This is what prints on your invoices and shows on your public catalog.
        </p>
      </div>

      <FormError>{state.formError}</FormError>

      <Field label="Business name" htmlFor="p-name" error={err('name')} required>
        <Input id="p-name" value={values.name} onChange={set('name')} />
      </Field>

      <Field
        label="Legal name"
        htmlFor="p-legalName"
        error={err('legalName')}
        hint="If different from your trading name."
      >
        <Input id="p-legalName" value={values.legalName} onChange={set('legalName')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="GSTIN"
          htmlFor="p-gstin"
          error={err('gstin')}
          hint="Leave blank if you are not registered."
        >
          <Input
            id="p-gstin"
            value={values.gstin}
            onChange={set('gstin')}
            className="uppercase"
            maxLength={15}
          />
        </Field>
        <Field
          label="State"
          htmlFor="p-stateCode"
          error={err('stateCode')}
          hint="Decides place of supply on every invoice."
          required
        >
          <Select id="p-stateCode" value={values.stateCode} onChange={set('stateCode')}>
            <option value="">Select a state…</option>
            {GST_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Address" htmlFor="p-addressLine1" error={err('addressLine1')}>
        <Input id="p-addressLine1" value={values.addressLine1} onChange={set('addressLine1')} />
      </Field>
      <Field label="Address line 2" htmlFor="p-addressLine2" error={err('addressLine2')}>
        <Input id="p-addressLine2" value={values.addressLine2} onChange={set('addressLine2')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="p-city" error={err('city')}>
          <Input id="p-city" value={values.city} onChange={set('city')} />
        </Field>
        <Field label="PIN code" htmlFor="p-pincode" error={err('pincode')}>
          <Input id="p-pincode" inputMode="numeric" value={values.pincode} onChange={set('pincode')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="p-phone" error={err('phone')}>
          <Input id="p-phone" type="tel" value={values.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email" htmlFor="p-email" error={err('email')}>
          <Input id="p-email" type="email" value={values.email} onChange={set('email')} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
        {state.saved && <span className="text-sm text-success">Saved</span>}
      </div>
    </Card>
  );
}

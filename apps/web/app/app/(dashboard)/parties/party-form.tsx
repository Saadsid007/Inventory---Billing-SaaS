'use client';

import { GST_STATES, partyWarnings } from '@billwise/shared';
import { Button, Card, Field, FormError, Input, Select, WarningList } from '@billwise/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { savePartyAction } from './actions';

export type CustomFieldDefView = {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options: string[] | null;
  required: boolean;
};

export type PartyFormValues = {
  type: 'customer' | 'supplier' | 'both';
  name: string;
  phone: string;
  email: string;
  gstin: string;
  stateCode: string;
  addressLine1: string;
  city: string;
  pincode: string;
  openingBalance: string;
  customFields: Record<string, unknown>;
};

export const EMPTY_PARTY: PartyFormValues = {
  type: 'customer',
  name: '',
  phone: '',
  email: '',
  gstin: '',
  stateCode: '',
  addressLine1: '',
  city: '',
  pincode: '',
  openingBalance: '',
  customFields: {},
};

export function PartyForm({
  partyId,
  initial,
  customFieldDefs,
}: {
  partyId?: string;
  initial: PartyFormValues;
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
    <K extends keyof PartyFormValues>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }) as PartyFormValues);

  const setCustom = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, customFields: { ...v.customFields, [key]: value } }));

  const warnings = partyWarnings({
    gstin: values.gstin || undefined,
    stateCode: values.stateCode || undefined,
  });

  // Spec rule 6: explicit handler, not a <form> submit.
  function submit() {
    setState({});
    startTransition(async () => {
      const result = await savePartyAction(values, partyId);
      if (result.ok) {
        router.push(`/app/parties/${result.partyId}`);
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
    <div className="space-y-5">
      <FormError>{state.formError}</FormError>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={err('name')} required>
            <Input
              id="name"
              autoFocus
              value={values.name}
              onChange={set('name')}
              aria-invalid={Boolean(err('name'))}
            />
          </Field>
          <Field
            label="Type"
            htmlFor="type"
            error={err('type')}
            hint="'Both' shows up in customer and supplier lists."
          >
            <Select id="type" value={values.type} onChange={set('type')}>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="both">Both</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" error={err('phone')}>
            <Input id="phone" type="tel" value={values.phone} onChange={set('phone')} />
          </Field>
          <Field label="Email" htmlFor="email" error={err('email')}>
            <Input id="email" type="email" value={values.email} onChange={set('email')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="GSTIN"
            htmlFor="gstin"
            error={err('gstin')}
            hint="Only if they are GST registered."
          >
            <Input
              id="gstin"
              className="uppercase"
              maxLength={15}
              value={values.gstin}
              onChange={set('gstin')}
              aria-invalid={Boolean(err('gstin'))}
            />
          </Field>
          <Field
            label="State"
            htmlFor="stateCode"
            error={err('stateCode')}
            hint="Decides IGST vs CGST/SGST on their invoices."
            required={Boolean(values.gstin)}
          >
            <Select
              id="stateCode"
              value={values.stateCode}
              onChange={set('stateCode')}
              aria-invalid={Boolean(err('stateCode'))}
            >
              <option value="">Not recorded</option>
              {GST_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Address" htmlFor="addressLine1" error={err('addressLine1')}>
          <Input id="addressLine1" value={values.addressLine1} onChange={set('addressLine1')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="city" error={err('city')}>
            <Input id="city" value={values.city} onChange={set('city')} />
          </Field>
          <Field label="PIN code" htmlFor="pincode" error={err('pincode')}>
            <Input
              id="pincode"
              inputMode="numeric"
              value={values.pincode}
              onChange={set('pincode')}
            />
          </Field>
        </div>

        <Field
          label="Opening balance"
          htmlFor="openingBalance"
          error={err('openingBalance')}
          hint={
            partyId
              ? 'Set when the contact was created. Record a payment to change what they owe.'
              : 'What they already owed you before you started using Billwise. Negative if you owe them.'
          }
        >
          <Input
            id="openingBalance"
            inputMode="decimal"
            value={values.openingBalance}
            onChange={set('openingBalance')}
            // The starting point of a ledger. Moving it later would change every
            // running balance since, with no record of why.
            disabled={Boolean(partyId)}
          />
        </Field>
      </Card>

      {customFieldDefs.length > 0 && (
        <Card className="space-y-4 p-5">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Your own fields
          </h2>
          {customFieldDefs.map((def) => (
            <Field key={def.id} label={def.label} htmlFor={`cf-${def.key}`} required={def.required}>
              {def.type === 'select' ? (
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
              ) : def.type === 'checkbox' ? (
                <input
                  id={`cf-${def.key}`}
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  checked={Boolean(values.customFields[def.key])}
                  onChange={(e) => setCustom(def.key, e.target.checked)}
                />
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

      <WarningList warnings={warnings} />

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : partyId ? 'Save changes' : 'Add contact'}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

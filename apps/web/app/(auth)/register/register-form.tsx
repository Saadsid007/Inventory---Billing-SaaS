'use client';

import { GST_STATES } from '@bahikhata/shared';
import { Button, Field, FormError, Input, Select } from '@bahikhata/ui';
import Link from 'next/link';
import * as React from 'react';
import { registerAction } from '../actions';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  stateCode: '',
};

export function RegisterForm() {
  const [values, setValues] = React.useState(EMPTY);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const [pending, startTransition] = React.useTransition();

  function set(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  // Spec rule 6: explicit handler, not a <form> submit.
  function submit() {
    setState({});
    startTransition(async () => {
      const result = await registerAction(values);
      if (result) setState(result);
    });
  }

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <div className="space-y-4">
      <FormError>{state.formError}</FormError>

      <Field label="Your name" htmlFor="name" error={err('name')} required>
        <Input
          id="name"
          autoComplete="name"
          autoFocus
          value={values.name}
          onChange={set('name')}
          aria-invalid={Boolean(err('name'))}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={err('email')} required>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          aria-invalid={Boolean(err('email'))}
        />
      </Field>

      <Field
        label="Mobile number"
        htmlFor="phone"
        error={err('phone')}
        hint="Optional. Can appear on invoices and your catalog later."
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={set('phone')}
          aria-invalid={Boolean(err('phone'))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={err('password')} required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={set('password')}
            aria-invalid={Boolean(err('password'))}
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={err('confirmPassword')}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={set('confirmPassword')}
            aria-invalid={Boolean(err('confirmPassword'))}
          />
        </Field>
      </div>

      <div className="border-t pt-4">
        <Field
          label="Business name"
          htmlFor="businessName"
          error={err('businessName')}
          hint="Printed on bills and shown on your public catalog."
          required
        >
          <Input
            id="businessName"
            value={values.businessName}
            onChange={set('businessName')}
            aria-invalid={Boolean(err('businessName'))}
          />
        </Field>
      </div>

      <Field
        label="State"
        htmlFor="stateCode"
        error={err('stateCode')}
        hint="Sets the place of supply on every GST invoice."
        required
      >
        <Select
          id="stateCode"
          value={values.stateCode}
          onChange={set('stateCode')}
          aria-invalid={Boolean(err('stateCode'))}
        >
          <option value="">Select a state…</option>
          {GST_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} — {s.name}
            </option>
          ))}
        </Select>
      </Field>

      <Button className="w-full" onClick={submit} disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

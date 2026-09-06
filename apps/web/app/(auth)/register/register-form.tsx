'use client';

import { BUSINESS_PROFILES, BUSINESS_TYPES, type BusinessType, GST_STATES } from '@billwise/shared';
import { Button, Field, FormError, Input, Select } from '@billwise/ui';
import { ArrowRight } from 'lucide-react';
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
  businessType: 'retail' as BusinessType,
};

/**
 * Signup.
 *
 * Split into "you" and "your shop" with a visible divider. It is the same seven
 * fields either way, but a single undifferentiated column of seven inputs is
 * the thing that makes people abandon a signup — two short groups read as two
 * small tasks.
 */
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
    <div
      className="space-y-5"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !pending) submit();
      }}
    >
      <FormError>{state.formError}</FormError>

      <div className="space-y-4">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          About you
        </p>

        <Field label="Your name" htmlFor="name" error={err('name')} required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ramesh Kumar"
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
            placeholder="you@example.com"
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
            placeholder="98765 43210"
            value={values.phone}
            onChange={set('phone')}
            aria-invalid={Boolean(err('phone'))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Password"
            htmlFor="password"
            error={err('password')}
            hint="At least 8 characters."
            required
          >
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
      </div>

      <div className="space-y-4 border-t pt-5">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Your shop
        </p>

        {/*
          Asked before the name, because it changes what the rest of the app
          looks like. A Jan Seva Kendra owner who lands on a stock screen has
          already decided the software is not for them.
        */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            What do you do?<span className="ml-0.5 text-destructive">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_TYPES.map((type) => {
              const profile = BUSINESS_PROFILES[type];
              const selected = values.businessType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, businessType: type }))}
                  aria-pressed={selected}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <span className="block text-sm font-medium">{profile.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {profile.description}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            You can change this later in Settings.
          </p>
        </fieldset>

        <Field
          label="Business name"
          htmlFor="businessName"
          error={err('businessName')}
          hint="Printed on bills and shown on your public catalog. You can change it later."
          required
        >
          <Input
            id="businessName"
            placeholder="Sharma General Store"
            value={values.businessName}
            onChange={set('businessName')}
            aria-invalid={Boolean(err('businessName'))}
          />
        </Field>

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
                {s.code} - {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Button className="w-full" size="lg" onClick={submit} disabled={pending}>
        {pending ? (
          'Creating account…'
        ) : (
          <>
            Create account <ArrowRight />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        GSTIN, address and logo come later, in Settings. Nothing here is final.
      </p>
    </div>
  );
}

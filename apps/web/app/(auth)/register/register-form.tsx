'use client';

import {
  BUSINESS_PROFILES,
  BUSINESS_TYPES,
  type BusinessType,
  GST_STATES,
} from '@billwise/shared';
import { Button, Field, FormError, Input, Select, cn } from '@billwise/ui';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Landmark,
  Pill,
  Store,
} from 'lucide-react';
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
 * An icon per trade.
 *
 * Kept here rather than in `BUSINESS_PROFILES` because that module is imported
 * by the database package, and shipping lucide components into it would drag a
 * React dependency somewhere that has no business having one. A missing entry
 * falls back to the shop, same as the profile lookup does.
 */
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  retail: Store,
  jan_seva: Landmark,
  medical: Pill,
};

/**
 * How strong a password looks, in four steps.
 *
 * Deliberately crude — length first, then variety. It is a nudge, not a policy:
 * the only hard rule is the eight characters the server enforces, and a meter
 * that blocks the button is a meter that loses you the signup. Nothing here is
 * sent anywhere.
 */
function strengthOf(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (password.length < 8) return { score: 0, label: 'Too short' };
  let variety = 0;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) variety++;
  if (/\d/.test(password)) variety++;
  if (/[^A-Za-z0-9]/.test(password)) variety++;
  if (password.length >= 12) variety++;
  if (variety >= 3) return { score: 3, label: 'Strong' };
  if (variety === 2) return { score: 2, label: 'Good' };
  return { score: 1, label: 'Weak' };
}

const STRENGTH_TONE = ['bg-muted', 'bg-destructive', 'bg-warning', 'bg-success'] as const;

/**
 * Signup.
 *
 * Split into "you" and "your shop" with a visible divider. It is the same seven
 * fields either way, but a single undifferentiated column of seven inputs is
 * the thing that makes people abandon a signup — two short groups read as two
 * small tasks.
 *
 * Controls are the `lg` size here rather than the app's usual 38px. This form is
 * filled in once, by somebody deciding whether to trust the product, and the
 * density that helps at a busy counter just looks cramped on the page that is
 * meant to persuade them.
 */
export function RegisterForm() {
  const [values, setValues] = React.useState(EMPTY);
  const [showPassword, setShowPassword] = React.useState(false);
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
  const strength = strengthOf(values.password);
  const confirmed =
    values.confirmPassword.length > 0 && values.confirmPassword === values.password;

  return (
    <div
      className="space-y-6"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !pending) submit();
      }}
    >
      <FormError>{state.formError}</FormError>

      <div className="space-y-4">
        <p className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          About you
        </p>

        <Field label="Your name" htmlFor="name" error={err('name')} required>
          <Input
            id="name"
            size="lg"
            autoComplete="name"
            placeholder="Ramesh Kumar"
            // biome-ignore lint/a11y/noAutofocus: the first field of a page
            // whose only purpose is this form.
            autoFocus
            value={values.name}
            onChange={set('name')}
            aria-invalid={Boolean(err('name'))}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={err('email')} required>
          <Input
            id="email"
            size="lg"
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
            size="lg"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            value={values.phone}
            onChange={set('phone')}
            aria-invalid={Boolean(err('phone'))}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={err('password')}
          hint={values.password ? undefined : 'At least 8 characters.'}
          required
        >
          <div className="relative">
            <Input
              id="password"
              size="lg"
              // One field, one toggle. Two password boxes where the letters are
              // hidden is how a typo gets typed twice and noticed on the login
              // screen a day later.
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-11"
              value={values.password}
              onChange={set('password')}
              aria-invalid={Boolean(err('password'))}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {/* Only once there is something to judge. A strength meter sitting at
            zero under an empty box is an accusation before you have typed. */}
        {values.password.length > 0 && (
          <div className="-mt-1 flex items-center gap-3">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    strength.score >= step ? STRENGTH_TONE[strength.score] : 'bg-muted',
                  )}
                />
              ))}
            </div>
            <span
              className={cn(
                'w-20 shrink-0 text-right text-xs font-medium',
                strength.score === 0 && 'text-muted-foreground',
                strength.score === 1 && 'text-destructive',
                strength.score === 2 && 'text-warning',
                strength.score === 3 && 'text-success',
              )}
              aria-live="polite"
            >
              {strength.label}
            </span>
          </div>
        )}

        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={err('confirmPassword')}
          required
        >
          <div className="relative">
            <Input
              id="confirmPassword"
              size="lg"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-11"
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
              aria-invalid={Boolean(err('confirmPassword'))}
            />
            {/* Answered while they are still looking at the field, instead of
                on submit. */}
            {confirmed && (
              <Check
                className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-success"
                aria-label="Passwords match"
              />
            )}
          </div>
        </Field>
      </div>

      <div className="space-y-4 border-t pt-6">
        <p className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          Your shop
        </p>

        {/*
          Asked before the name, because it changes what the rest of the app
          looks like. A Jan Seva Kendra owner who lands on a stock screen has
          already decided the software is not for them.

          One per row rather than two across: there are three trades now, and a
          two-column grid leaves the third stranded on a line of its own.
        */}
        <fieldset className="space-y-2.5">
          <legend className="mb-2.5 text-sm font-medium text-foreground">
            What do you do?<span className="ml-0.5 text-destructive">*</span>
          </legend>
          <div className="space-y-2">
            {BUSINESS_TYPES.map((type) => {
              const profile = BUSINESS_PROFILES[type];
              const Icon = TYPE_ICONS[type] ?? Store;
              const selected = values.businessType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, businessType: type }))}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                    selected
                      ? 'border-primary bg-primary-subtle/50 ring-1 ring-primary/25'
                      : 'hover:border-primary/40 hover:bg-muted/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{profile.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {profile.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                      selected ? 'border-primary bg-primary' : 'border-input',
                    )}
                    aria-hidden
                  >
                    {selected && (
                      <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">You can change this later in Settings.</p>
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
            size="lg"
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
            size="lg"
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

      <Button
        className="h-12 w-full text-[0.95rem] shadow-sm shadow-primary/20"
        size="lg"
        onClick={submit}
        disabled={pending}
      >
        {pending ? (
          'Creating account…'
        ) : (
          <>
            Create account <ArrowRight />
          </>
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        GSTIN, address and logo come later, in Settings. Nothing here is final.
      </p>
    </div>
  );
}

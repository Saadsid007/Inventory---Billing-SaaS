'use client';

import { Button, Field, FormError, Input } from '@billwise/ui';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import * as React from 'react';
import { loginAction } from '../actions';

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [reveal, setReveal] = React.useState(false);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
  }>({});
  const [pending, startTransition] = React.useTransition();

  // Spec rule 6: no <form> submit flow in a client component. This is an
  // explicit handler calling a server action.
  function submit() {
    setState({});
    startTransition(async () => {
      const result = await loginAction({ email, password, next });
      if (result) setState(result);
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !pending) submit();
  }

  return (
    <div className="space-y-4" onKeyDown={onKeyDown}>
      <FormError>{state.formError}</FormError>

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.['email']} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.['email'])}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.['password']} required>
        <div className="relative">
          <Input
            id="password"
            // A shopkeeper typing a password on a phone keyboard, in a hurry,
            // gets it wrong often enough that hiding it by default and letting
            // them look is kinder than a second failed login.
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.['password'])}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button className="w-full" size="lg" onClick={submit} disabled={pending}>
        {pending ? (
          'Signing in…'
        ) : (
          <>
            <LogIn /> Log in
          </>
        )}
      </Button>
    </div>
  );
}

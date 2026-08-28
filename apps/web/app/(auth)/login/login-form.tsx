'use client';

import { Button, Field, FormError, Input } from '@bahikhata/ui';
import Link from 'next/link';
import * as React from 'react';
import { loginAction } from '../actions';

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.['email'])}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.['password']} required>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.['password'])}
        />
      </Field>

      <Button className="w-full" onClick={submit} disabled={pending}>
        {pending ? 'Signing in…' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account yet?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

'use client';

import { Button, Field, FormError, Input } from '@bahikhata/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { grantAdminAction, revokeAdminAction } from '../../actions';

export function GrantAdminForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [done, setDone] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  function submit() {
    setError(undefined);
    setDone(undefined);
    startTransition(async () => {
      const result = await grantAdminAction(email);
      if (result.ok) {
        setDone(`${email} is now an admin.`);
        setEmail('');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !pending) submit();
      }}
    >
      <FormError>{error}</FormError>

      <Field label="Email address" htmlFor="admin-email" required>
        <Input
          id="admin-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="person@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      </Field>

      <Button onClick={submit} disabled={pending || email.trim().length === 0}>
        {pending ? 'Adding…' : 'Make admin'}
      </Button>

      {done && <p className="text-sm text-success">{done}</p>}
    </div>
  );
}

export function RevokeAdminButton({
  userId,
  name,
  isSelf,
}: {
  userId: string;
  name: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  // Self-revocation is refused server side too; hiding the button here just
  // saves someone a pointless error.
  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  function revoke() {
    setError(undefined);
    startTransition(async () => {
      const result = await revokeAdminAction(userId);
      if (result.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs">Remove {name}?</span>
          <Button variant="destructive" size="sm" disabled={pending} onClick={revoke}>
            Remove
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          Remove admin
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

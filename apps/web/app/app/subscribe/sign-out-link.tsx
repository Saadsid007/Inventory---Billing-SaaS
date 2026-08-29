'use client';

import { Button } from '@billwise/ui';
import * as React from 'react';
import { signOutAction } from '@/app/(auth)/actions';

export function SignOutLink() {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
    >
      Log out
    </Button>
  );
}

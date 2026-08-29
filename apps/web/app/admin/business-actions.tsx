'use client';

import { Button } from '@billwise/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { extendTrialAction, markPaidAction, setSuspendedAction } from './actions';

/**
 * Per-business admin controls.
 *
 * Suspending is behind a confirmation because it locks a paying shop out of
 * their own billing mid-day. Marking paid is not — the worst case is giving
 * someone a month for free, which is recoverable.
 */
export function BusinessActions({
  businessId,
  name,
  status,
}: {
  businessId: string;
  name: string;
  status: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(result.error ?? 'Something went wrong.');
      }
    });
  }

  if (confirming) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs">Suspend {name}? They lose access immediately.</p>
        <div className="flex gap-1.5">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setSuspendedAction(businessId, true))}
          >
            Suspend
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {status !== 'active' && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => markPaidAction(businessId))}
          >
            Mark paid
          </Button>
        )}
        {status === 'trial' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => extendTrialAction(businessId, 7))}
          >
            +7 days
          </Button>
        )}
        {status === 'suspended' ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => setSuspendedAction(businessId, false))}
          >
            Restore
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(true)}>
            Suspend
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

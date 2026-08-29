'use client';

import { Button } from '@billwise/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';

const STORAGE_KEY = 'billwise-print-format';

/**
 * Format switcher. Screen only — `.no-print` keeps it off the paper.
 *
 * The choice is remembered, because a shop uses one printer: a counter with a
 * thermal roll should not be asked "A4 or 80mm?" on every single bill.
 */
export function PrintToolbar({
  invoiceId,
  current,
}: {
  invoiceId: string;
  current: 'a4' | 'thermal';
}) {
  const router = useRouter();

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, current);
  }, [current]);

  function choose(format: 'a4' | 'thermal') {
    localStorage.setItem(STORAGE_KEY, format);
    router.replace(`/app/invoices/${invoiceId}/print?format=${format}`);
  }

  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background p-3">
      <div className="inline-flex rounded-md border p-0.5">
        {(['a4', 'thermal'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => choose(f)}
            className={
              current === f
                ? 'rounded-sm bg-accent px-3 py-1 text-sm font-medium'
                : 'rounded-sm px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {f === 'a4' ? 'A4' : '80mm thermal'}
          </button>
        ))}
      </div>
      <Button size="sm" onClick={() => window.print()}>
        Print
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/app/invoices/${invoiceId}`)}
      >
        Back
      </Button>
    </div>
  );
}

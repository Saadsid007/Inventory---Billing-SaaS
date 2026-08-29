'use client';

import { Button, Input } from '@bahikhata/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';

/** Date range for the sales report. Kept in the URL so a range is shareable. */
export function DateRangePicker({ initial }: { initial: { from: string; to: string } }) {
  const router = useRouter();
  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [pending, startTransition] = React.useTransition();

  function apply(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    startTransition(() =>
      router.replace(`/app/reports?from=${nextFrom}&to=${nextTo}`),
    );
  }

  /** The ranges a shopkeeper actually asks for, without touching a date picker. */
  function preset(kind: 'month' | 'lastMonth' | 'fy') {
    const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    if (kind === 'month') {
      apply(iso(new Date(Date.UTC(y, m, 1))), iso(now));
    } else if (kind === 'lastMonth') {
      apply(iso(new Date(Date.UTC(y, m - 1, 1))), iso(new Date(Date.UTC(y, m, 0))));
    } else {
      // Indian financial year: April to March.
      const startYear = m >= 3 ? y : y - 1;
      apply(iso(new Date(Date.UTC(startYear, 3, 1))), iso(now));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="w-36"
        type="date"
        aria-label="From date"
        value={from}
        onChange={(e) => apply(e.target.value, to)}
      />
      <Input
        className="w-36"
        type="date"
        aria-label="To date"
        value={to}
        onChange={(e) => apply(from, e.target.value)}
      />
      {/* The three ranges a shopkeeper actually asks for. Typing two dates to
          see this month's sales is work nobody should have to do. */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
        <Button variant="ghost" size="sm" onClick={() => preset('month')}>
          This month
        </Button>
        <Button variant="ghost" size="sm" onClick={() => preset('lastMonth')}>
          Last month
        </Button>
        <Button variant="ghost" size="sm" onClick={() => preset('fy')}>
          This FY
        </Button>
      </div>
      {pending && <span className="text-xs text-muted-foreground">Updating…</span>}
    </div>
  );
}

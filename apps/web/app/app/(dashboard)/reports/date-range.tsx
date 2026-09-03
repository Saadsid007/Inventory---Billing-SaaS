'use client';

import { Button, FilterBar, Input } from '@billwise/ui';
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
    <FilterBar pending={pending}>
      <Input
        className="h-8.5 w-34 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        type="date"
        aria-label="From date"
        value={from}
        onChange={(e) => apply(e.target.value, to)}
      />
      <Input
        className="h-8.5 w-34 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        type="date"
        aria-label="To date"
        value={to}
        onChange={(e) => apply(from, e.target.value)}
      />
      <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/50 p-0.5 shadow-2xs">
        <Button variant="ghost" size="sm" className="h-7 rounded-md text-xs px-2.5" onClick={() => preset('month')}>
          This month
        </Button>
        <Button variant="ghost" size="sm" className="h-7 rounded-md text-xs px-2.5" onClick={() => preset('lastMonth')}>
          Last month
        </Button>
        <Button variant="ghost" size="sm" className="h-7 rounded-md text-xs px-2.5" onClick={() => preset('fy')}>
          This FY
        </Button>
      </div>
    </FilterBar>
  );
}

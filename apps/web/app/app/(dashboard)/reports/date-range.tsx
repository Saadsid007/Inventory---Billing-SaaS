'use client';

import { Button, FilterBar, Input } from '@billwise/ui';
import { CalendarDays, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export type DateRangeState = {
  from: string;
  to: string;
  groupBy?: 'day' | 'month';
};

/** Date range for the sales and P&L report with day/month-wise aggregation. */
export function DateRangePicker({ initial }: { initial: DateRangeState }) {
  const router = useRouter();
  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [groupBy, setGroupBy] = React.useState<'day' | 'month'>(initial.groupBy || 'day');
  const [pending, startTransition] = React.useTransition();

  function apply(nextFrom: string, nextTo: string, nextGroup: 'day' | 'month' = groupBy) {
    setFrom(nextFrom);
    setTo(nextTo);
    setGroupBy(nextGroup);
    startTransition(() =>
      router.replace(`/app/reports?from=${nextFrom}&to=${nextTo}&groupBy=${nextGroup}`),
    );
  }

  /** The ranges a business owner asks for, without manual date entry. */
  function preset(kind: 'month' | 'lastMonth' | 'last3Months' | 'fy' | 'lastFy') {
    const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    if (kind === 'month') {
      apply(iso(new Date(Date.UTC(y, m, 1))), iso(now));
    } else if (kind === 'lastMonth') {
      apply(iso(new Date(Date.UTC(y, m - 1, 1))), iso(new Date(Date.UTC(y, m, 0))));
    } else if (kind === 'last3Months') {
      apply(iso(new Date(Date.UTC(y, m - 2, 1))), iso(now));
    } else if (kind === 'fy') {
      // Indian financial year: April to March.
      const startYear = m >= 3 ? y : y - 1;
      apply(iso(new Date(Date.UTC(startYear, 3, 1))), iso(now));
    } else if (kind === 'lastFy') {
      const startYear = (m >= 3 ? y : y - 1) - 1;
      apply(
        iso(new Date(Date.UTC(startYear, 3, 1))),
        iso(new Date(Date.UTC(startYear + 1, 2, 31))),
      );
    }
  }

  return (
    <FilterBar pending={pending} className="flex-wrap gap-2">
      {/* Grouping / Breakdown Toggle (Daily vs Month-wise) */}
      <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/60 p-0.5 shadow-2xs">
        <button
          type="button"
          onClick={() => apply(from, to, 'day')}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
            groupBy === 'day'
              ? 'bg-background text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Day-by-day dates"
        >
          <CalendarDays className="size-3.5" />
          <span>Daily</span>
        </button>
        <button
          type="button"
          onClick={() => apply(from, to, 'month')}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
            groupBy === 'month'
              ? 'bg-background text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Month-wise aggregation"
        >
          <Layers className="size-3.5" />
          <span>Month-wise</span>
        </button>
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-1.5">
        <Input
          className="h-8.5 w-33 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
          type="date"
          aria-label="From date"
          value={from}
          onChange={(e) => apply(e.target.value, to)}
        />
        <span className="text-xs text-muted-foreground font-medium">to</span>
        <Input
          className="h-8.5 w-33 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
          type="date"
          aria-label="To date"
          value={to}
          onChange={(e) => apply(from, e.target.value)}
        />
      </div>

      {/* Presets */}
      <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/50 p-0.5 shadow-2xs overflow-x-auto">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-md text-xs px-2"
          onClick={() => preset('month')}
        >
          This month
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-md text-xs px-2"
          onClick={() => preset('lastMonth')}
        >
          Last month
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-md text-xs px-2"
          onClick={() => preset('last3Months')}
        >
          Last 3M
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-md text-xs px-2"
          onClick={() => preset('fy')}
        >
          This FY
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-md text-xs px-2"
          onClick={() => preset('lastFy')}
        >
          Last FY
        </Button>
      </div>
    </FilterBar>
  );
}

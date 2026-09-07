'use client';

import Link from 'next/link';

/**
 * Four fixed ranges instead of two date pickers.
 *
 * The shop's report page opens with a from-date and a to-date. That is right
 * when somebody is pulling a quarter for their CA, and wrong here: the whole
 * question is "how much today" or "how much this month", and typing two dates
 * to find out is three interactions too many.
 */
const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
] as const;

export function RangeTabs({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-1">
      {RANGES.map((r) => {
        const selected = active === r.key;
        return (
          <Link
            key={r.key}
            href={`/app/seva/reports?range=${r.key}`}
            aria-current={selected ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}

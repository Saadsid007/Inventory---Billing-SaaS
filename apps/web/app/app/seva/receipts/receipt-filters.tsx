'use client';

import { Input, Select } from '@billwise/ui';
import { Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

/**
 * Two controls, and no more.
 *
 * The shop's invoice filter bar has six, including a date range and a document
 * type. Here there is one document type and the question at the counter is
 * always the same one: who still owes me money.
 */
export function ReceiptFilters({
  initialQuery,
  initialPayment,
}: {
  initialQuery: string;
  initialPayment: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = React.useState(initialQuery);
  const [payment, setPayment] = React.useState(initialPayment);

  function apply(next: { q?: string; payment?: string }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const p = next.payment ?? payment;
    if (q.trim()) params.set('q', q.trim());
    if (p) params.set('payment', p);
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Receipt number or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply({});
          }}
          onBlur={() => apply({})}
          aria-label="Search receipts"
        />
      </div>
      <Select
        className="sm:w-44"
        value={payment}
        onChange={(e) => {
          setPayment(e.target.value);
          apply({ payment: e.target.value });
        }}
        aria-label="Filter by payment"
      >
        <option value="">All receipts</option>
        <option value="unpaid">Unpaid</option>
        <option value="partial">Part paid</option>
        <option value="paid">Fully paid</option>
      </Select>
    </div>
  );
}

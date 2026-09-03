'use client';

import { INVOICE_KINDS, INVOICE_KIND_LABELS } from '@billwise/shared';
import { Button, FilterBar, Input, Select } from '@billwise/ui';
import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

/** Filters live in the URL, so a filtered list is shareable and back-navigable. */
export function InvoiceFilterBar({
  initial,
}: {
  initial: { q: string; from: string; to: string; kind: string; status: string; payment: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(initial.q);
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback(
    (next: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      startTransition(() => router.replace(`/app/invoices?${sp.toString()}`));
    },
    [params, router],
  );

  React.useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => apply({ q: q.trim() }), 300);
    return () => clearTimeout(t);
  }, [q, initial.q, apply]);

  const isFiltered = Object.values(initial).some(Boolean);

  return (
    <FilterBar pending={pending}>
      <div className="relative w-full sm:w-60">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
          placeholder="Invoice # or customer…"
          aria-label="Search invoices"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Input
        className="h-8.5 w-34 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        type="date"
        aria-label="From date"
        value={initial.from}
        onChange={(e) => apply({ from: e.target.value })}
      />
      <Input
        className="h-8.5 w-34 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        type="date"
        aria-label="To date"
        value={initial.to}
        onChange={(e) => apply({ to: e.target.value })}
      />
      <Select
        className="h-8.5 w-40 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        aria-label="Document type"
        value={initial.kind}
        onChange={(e) => apply({ kind: e.target.value })}
      >
        <option value="">All types</option>
        {INVOICE_KINDS.map((k) => (
          <option key={k} value={k}>
            {INVOICE_KIND_LABELS[k]}
          </option>
        ))}
      </Select>
      <Select
        className="h-8.5 w-36 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        aria-label="Status"
        value={initial.status}
        onChange={(e) => apply({ status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="issued">Issued</option>
        <option value="cancelled">Cancelled</option>
      </Select>
      <Select
        className="h-8.5 w-36 rounded-lg border-border/80 bg-background text-xs shadow-2xs"
        aria-label="Payment status"
        value={initial.payment}
        onChange={(e) => apply({ payment: e.target.value })}
      >
        <option value="">Any payment</option>
        <option value="unpaid">Unpaid</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
      </Select>
      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8.5 rounded-lg text-xs px-2.5"
          onClick={() => {
            setQ('');
            startTransition(() => router.replace('/app/invoices'));
          }}
        >
          <X className="size-3" /> Clear
        </Button>
      )}
    </FilterBar>
  );
}

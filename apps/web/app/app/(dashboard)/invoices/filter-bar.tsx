'use client';

import { INVOICE_KINDS, INVOICE_KIND_LABELS } from '@billwise/shared';
import { Button, Card, Input, Select } from '@billwise/ui';
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

  // Debounced so typing an invoice number does not fire a query per keystroke.
  React.useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => apply({ q: q.trim() }), 300);
    return () => clearTimeout(t);
  }, [q, initial.q, apply]);

  const isFiltered = Object.values(initial).some(Boolean);

  return (
    <Card className="flex flex-wrap items-center gap-2 p-3">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Invoice number or customer…"
          aria-label="Search invoices"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Input
        className="w-36"
        type="date"
        aria-label="From date"
        value={initial.from}
        onChange={(e) => apply({ from: e.target.value })}
      />
      <Input
        className="w-36"
        type="date"
        aria-label="To date"
        value={initial.to}
        onChange={(e) => apply({ to: e.target.value })}
      />
      <Select
        className="w-44"
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
        className="w-40"
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
        className="w-40"
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
          onClick={() => {
            setQ('');
            startTransition(() => router.replace('/app/invoices'));
          }}
        >
          <X /> Clear
        </Button>
      )}
      {pending && <span className="text-xs text-muted-foreground">Updating…</span>}
    </Card>
  );
}

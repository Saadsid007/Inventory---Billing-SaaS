'use client';

import { Button, Card, Input, Select } from '@bahikhata/ui';
import { Search, TriangleAlert, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * Filters live in the URL, not in component state.
 *
 * That makes a filtered list shareable and back-button-friendly, and it lets
 * the page stay a server component that reads `searchParams` — no client-side
 * fetching, no loading spinner.
 */
export function ProductFilterBar({
  categories,
  initial,
}: {
  categories: readonly { id: string; name: string }[];
  initial: { q: string; category: string; low: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(initial.q);
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback(
    (next: Partial<{ q: string; category: string; low: boolean }>) => {
      const sp = new URLSearchParams(params.toString());
      const set = (key: string, value: string | undefined) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      };
      if (next.q !== undefined) set('q', next.q.trim() || undefined);
      if (next.category !== undefined) set('category', next.category || undefined);
      if (next.low !== undefined) set('low', next.low ? '1' : undefined);
      startTransition(() => router.replace(`/app/products?${sp.toString()}`));
    },
    [params, router],
  );

  // Debounced so typing a product name does not fire a query per keystroke.
  React.useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => apply({ q }), 300);
    return () => clearTimeout(t);
  }, [q, initial.q, apply]);

  const isFiltered = Boolean(initial.q || initial.category || initial.low);

  return (
    <Card className="flex flex-wrap items-center gap-2 p-3">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, SKU or barcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
      </div>

      <Select
        className="w-full sm:w-48"
        value={initial.category}
        onChange={(e) => apply({ category: e.target.value })}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Button
        variant={initial.low ? 'default' : 'outline'}
        onClick={() => apply({ low: !initial.low })}
        aria-pressed={initial.low}
      >
        <TriangleAlert /> Low stock only
      </Button>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ('');
            startTransition(() => router.replace('/app/products'));
          }}
        >
          <X /> Clear
        </Button>
      )}

      {pending && <span className="text-xs text-muted-foreground">Updating…</span>}
    </Card>
  );
}

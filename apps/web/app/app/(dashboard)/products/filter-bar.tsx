'use client';

import { Button, FilterBar, Input, Select } from '@billwise/ui';
import { Search, TriangleAlert, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * Filters live in the URL, not in component state.
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

  React.useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => apply({ q }), 300);
    return () => clearTimeout(t);
  }, [q, initial.q, apply]);

  const isFiltered = Boolean(initial.q || initial.category || initial.low);

  return (
    <FilterBar pending={pending}>
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
          placeholder="Search name, SKU, barcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
      </div>

      <Select
        className="h-8.5 w-full rounded-lg border-border/80 bg-background text-xs shadow-2xs sm:w-44"
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
        className="h-8.5 rounded-lg text-xs px-3"
        onClick={() => apply({ low: !initial.low })}
        aria-pressed={initial.low}
      >
        <TriangleAlert className="size-3.5" /> Low stock only
      </Button>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8.5 rounded-lg text-xs px-2.5"
          onClick={() => {
            setQ('');
            startTransition(() => router.replace('/app/products'));
          }}
        >
          <X className="size-3" /> Clear
        </Button>
      )}
    </FilterBar>
  );
}

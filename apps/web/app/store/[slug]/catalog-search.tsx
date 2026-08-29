'use client';

import { Input, Select } from '@bahikhata/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * Catalog search and category filter.
 *
 * State lives in the URL so a customer can send "here, this one" as a link, and
 * so the page stays server-rendered and cacheable.
 */
export function CatalogSearch({
  slug,
  categories,
  initial,
}: {
  slug: string;
  categories: readonly { id: string; name: string }[];
  initial: { q: string; category: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(initial.q);

  const apply = React.useCallback(
    (next: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      const query = sp.toString();
      router.replace(query ? `/store/${slug}?${query}` : `/store/${slug}`);
    },
    [params, router, slug],
  );

  React.useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => apply({ q: q.trim() }), 300);
    return () => clearTimeout(t);
  }, [q, initial.q, apply]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="w-full sm:max-w-xs"
        placeholder="Search products…"
        aria-label="Search products"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {/* Only rendered when the shop actually has categories — an empty
          dropdown is worse than no dropdown. */}
      {categories.length > 0 && (
        <Select
          className="w-full sm:w-48"
          aria-label="Filter by category"
          value={initial.category}
          onChange={(e) => apply({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

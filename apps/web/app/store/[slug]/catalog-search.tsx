'use client';

import { cn, Input } from '@billwise/ui';
import { LayoutGrid, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

/** Map known Indian grocery/retail category names to friendly visual icons */
function categoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('beverage') || n.includes('tea') || n.includes('coffee') || n.includes('drink')) return '🥤';
  if (n.includes('oil') || n.includes('ghee')) return '🧈';
  if (n.includes('atta') || n.includes('rice') || n.includes('dal') || n.includes('grain')) return '🌾';
  if (n.includes('masala') || n.includes('spice')) return '🌶️';
  if (n.includes('biscuit') || n.includes('snack') || n.includes('namkeen') || n.includes('chips')) return '🍪';
  if (n.includes('house') || n.includes('clean') || n.includes('detergent')) return '🧼';
  if (n.includes('care') || n.includes('soap') || n.includes('shampoo')) return '✨';
  if (n.includes('dairy') || n.includes('milk') || n.includes('paneer')) return '🥛';
  if (n.includes('sweet') || n.includes('choco')) return '🍫';
  return '📦';
}

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
      router.replace(query ? `/store/${slug}?${query}` : `/store/${slug}`, { scroll: false });
    },
    [params, router, slug],
  );

  React.useEffect(() => {
    if (q === initial.q) return;
    const t = setTimeout(() => apply({ q: q.trim() }), 300);
    return () => clearTimeout(t);
  }, [q, initial.q, apply]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 rounded-xl pl-10 pr-10 text-sm shadow-xs focus:ring-2 focus:ring-primary/20 transition-all bg-card"
          placeholder="Search products by name, brand, or pack size…"
          aria-label="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              apply({ q: '' });
            }}
            title="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Modern Interactive Category Pills Bar */}
      {categories.length > 0 && (
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none no-scrollbar">
            {/* "All Items" Pill */}
            <button
              type="button"
              onClick={() => apply({ category: '' })}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-xs',
                !initial.category
                  ? 'bg-primary text-primary-foreground shadow-sm scale-102 ring-2 ring-primary/30'
                  : 'bg-card text-muted-foreground border hover:border-primary/40 hover:text-foreground hover:bg-muted/40',
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span>All Items</span>
            </button>

            {/* Individual Category Pills */}
            {categories.map((c) => {
              const isActive = initial.category === c.id;
              const icon = categoryIcon(c.name);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => apply({ category: isActive ? '' : c.id })}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-xs',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm scale-102 ring-2 ring-primary/30'
                      : 'bg-card text-muted-foreground border hover:border-primary/40 hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  <span className="text-sm leading-none">{icon}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

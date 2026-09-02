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
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-xl pl-9 pr-9 text-sm shadow-xs bg-card sm:h-11 sm:pl-10"
          placeholder="Search products…"
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
        <div className="-mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:gap-2">
            <button
              type="button"
              onClick={() => apply({ category: '' })}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all sm:px-4 sm:py-2 sm:text-xs',
                !initial.category
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              <LayoutGrid className="size-3 sm:size-3.5" />
              All
            </button>

            {categories.map((c) => {
              const isActive = initial.category === c.id;
              const icon = categoryIcon(c.name);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => apply({ category: isActive ? '' : c.id })}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all sm:px-4 sm:py-2 sm:text-xs',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  <span className="text-xs leading-none sm:text-sm">{icon}</span>
                  <span className="max-w-[7rem] truncate sm:max-w-none">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

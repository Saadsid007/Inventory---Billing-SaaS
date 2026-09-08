import { Card, Skeleton } from '@billwise/ui';

/**
 * A shop's public catalog, while its slug is being looked up.
 *
 * At `/store` rather than inside `[slug]`, because the layout that renders the
 * storefront header is async — this is the fallback during that lookup, and a
 * fallback one level deeper would only appear after it.
 *
 * Without it, a customer following a QR code from a shop counter got the
 * Billwise marketing skeleton for a moment: our landing page, briefly, on a
 * page that is supposed to be somebody else's shop.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Skeleton className="mb-5 h-10 w-full max-w-sm rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Card key={i} className="space-y-3 p-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-20" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

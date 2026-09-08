import { Card, MarketingPageSkeleton, Skeleton } from '@billwise/ui';

/**
 * The home page, and the last resort for anything without its own.
 *
 * Every other segment in the app defines a `loading.tsx` — both dashboards,
 * every list, the print views, the public receipt, the store. That is on
 * purpose: a root fallback is inherited by any descendant that lacks one, and
 * a marketing hero appearing over a thermal print preview would be worse than
 * a blank frame. This file is the floor, not the plan.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <MarketingPageSkeleton cards={1} />

      {/* The landing page keeps going below the fold, so the hold does too —
          stopping dead after the hero makes the page look like it ended. */}
      <div className="mx-auto max-w-5xl space-y-10 px-5 pb-20 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="mx-auto h-7 w-72 max-w-full" />
          <Skeleton className="mx-auto h-4 w-96 max-w-full" />
        </div>
      </div>
    </div>
  );
}

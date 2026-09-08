import { PageBody, PageHeaderSkeleton, Skeleton, TableSkeleton } from '@billwise/ui';

/**
 * The plan card keeps its brand wash while it loads.
 *
 * This is the screen where somebody is about to pay us. A grey rectangle
 * turning blue under a price is exactly the wrong moment for a visual jolt.
 */
export default function Loading() {
  return (
    <PageBody className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="brand-wash space-y-3 p-5 sm:p-6">
          <div className="h-3.5 w-40 rounded bg-white/20" />
          <div className="h-10 w-48 rounded-lg bg-white/25" />
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="grid gap-2 border-t pt-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 w-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-4 w-36" />
      <TableSkeleton rows={3} cols={5} />
    </PageBody>
  );
}

import { CardGridSkeleton, PageHeaderSkeleton, Skeleton } from '@billwise/ui';

/**
 * The handover desk, in outline.
 *
 * Its own file rather than `ListPageSkeleton`, because this screen is cards
 * and two count tabs, not a table. A table-shaped placeholder that resolves
 * into a card grid is a worse transition than no placeholder at all — the
 * whole page appears to rearrange itself the moment the data lands.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-xl border bg-card p-0.5">
          <Skeleton className="h-8 w-36 rounded-[0.6rem]" />
          <Skeleton className="h-8 w-32 rounded-[0.6rem]" />
        </div>
        <Skeleton className="h-9.5 w-full max-w-xs rounded-md" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}

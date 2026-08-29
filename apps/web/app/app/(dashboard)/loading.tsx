import { Card, Skeleton } from '@bahikhata/ui';

/**
 * Shown while a page under /app streams in.
 *
 * A skeleton in roughly the shape of the page it is replacing, rather than a
 * spinner: the sidebar and topbar are already painted by the layout, so a
 * spinner in the middle of a finished frame reads as "broken", while an outline
 * reads as "nearly there".
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      <Card className="space-y-3 p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </Card>
    </div>
  );
}

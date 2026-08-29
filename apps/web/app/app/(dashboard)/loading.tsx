import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '@billwise/ui';

/**
 * Shown while the dashboard streams in.
 *
 * A skeleton in roughly the shape of the page it replaces, rather than a
 * spinner. The sidebar and topbar are already painted by the layout, so a
 * spinner in the middle of a finished frame reads as stuck.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <TableSkeleton />
    </div>
  );
}

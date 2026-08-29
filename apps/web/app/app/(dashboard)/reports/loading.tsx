import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <TableSkeleton rows={5} />
      <TableSkeleton rows={4} cols={6} />
    </div>
  );
}

import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <StatCardsSkeleton count={2} />
      <TableSkeleton cols={5} rows={8} />
    </div>
  );
}

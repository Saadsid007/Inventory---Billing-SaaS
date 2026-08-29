import { Card, PageHeaderSkeleton, Skeleton, StatCardsSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <StatCardsSkeleton count={3} />
      <Card className="flex flex-col gap-5 p-4 sm:flex-row sm:p-5">
        <Skeleton className="size-44 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Skeleton } from '@billwise/ui';

/**
 * A page whose whole job is to be printed.
 *
 * No app shell, no sidebar — so this draws a sheet of paper rather than a
 * dashboard, and stops the root marketing placeholder being inherited here.
 */
export default function Loading() {
  return (
    <div className="mx-auto my-4 w-full max-w-[210mm] bg-card p-8 shadow-sm" aria-busy="true" aria-label="Loading">
      <div className="flex items-start justify-between gap-8 border-b pb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-3 w-20" />
          <Skeleton className="ml-auto h-5 w-28" />
          <Skeleton className="ml-auto h-3.5 w-24" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-6">
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-8 ml-auto w-56 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  );
}

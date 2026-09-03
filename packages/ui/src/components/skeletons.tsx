import { Card } from './card';
import { Skeleton } from './page';

/**
 * Page-shaped loading states.
 *
 * Shared so that every `loading.tsx` in the app is one line instead of thirty,
 * and so the placeholder keeps matching the page when the page changes.
 *
 * These are outlines, never spinners. The shell is already painted by the time
 * one of these renders, and a spinner in the middle of a finished frame reads
 * as "stuck", while an outline reads as "nearly there".
 */

export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-9 w-32 rounded-md" />}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="space-y-3 p-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex gap-4 border-b border-border/80 bg-[oklch(0.28_0.055_255)]/25 px-3.5 py-2.5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-3.5 py-2">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9.5 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded-md" />
    </Card>
  );
}

/** The default: header, filter row, table. Fits most list screens. */
export function ListPageSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <Card className="flex flex-wrap gap-2 p-3">
        <Skeleton className="h-9.5 w-64 rounded-md" />
        <Skeleton className="h-9.5 w-40 rounded-md" />
        <Skeleton className="h-9.5 w-32 rounded-md" />
      </Card>
      <TableSkeleton cols={cols} />
    </div>
  );
}

export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <FormSkeleton fields={fields} />
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-2.5 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </Card>
        <Card className="space-y-2.5 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </Card>
      </div>
      <TableSkeleton rows={4} cols={6} />
    </div>
  );
}

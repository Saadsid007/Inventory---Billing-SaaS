import { Card, Skeleton } from '@billwise/ui';

/** One product in a shop's public catalog. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-5 h-3.5 w-32" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-40" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 w-full" />
            ))}
          </div>
          <Skeleton className="h-11 w-48 rounded-xl" />
        </div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="space-y-3 p-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
    </main>
  );
}

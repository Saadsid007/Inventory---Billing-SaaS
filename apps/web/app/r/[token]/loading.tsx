import { Card, Skeleton } from '@billwise/ui';

/**
 * A customer's copy of a bill, opened from WhatsApp.
 *
 * The audience here is on mobile data with no app shell around them, so this
 * has to look like the receipt from the first frame — an empty white page for
 * two seconds reads as a dead link, and a dead link is not one they will tap
 * again.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12" aria-busy="true" aria-label="Loading">
      <Card className="overflow-hidden p-0">
        <div className="space-y-2 border-b bg-muted/30 px-5 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-52" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div className="flex items-baseline justify-between gap-2 px-5 pt-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="px-5 pb-3 pt-2">
          <Skeleton className="h-3.5 w-36" />
        </div>
        <ul className="divide-y border-y">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
        <div className="space-y-2 px-5 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-none" />
      </Card>
    </main>
  );
}

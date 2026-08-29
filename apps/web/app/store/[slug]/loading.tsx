import { Card, Skeleton } from '@billwise/ui';

/** The catalog is ISR-cached, so this shows mainly on a cold first render. */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9.5 w-60 rounded-md" />
        <Skeleton className="h-9.5 w-44 rounded-md" />
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <Card className="overflow-hidden p-0">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-3.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

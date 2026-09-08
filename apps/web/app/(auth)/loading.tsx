import { FormSkeleton, Skeleton } from '@billwise/ui';

/**
 * Login and register share this.
 *
 * The auth layout already paints its own panel, so all that is missing is the
 * form itself — drawing a whole page here would put a second heading under the
 * one already on screen.
 */
export default function Loading() {
  return (
    <div className="w-full space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <FormSkeleton fields={4} />
    </div>
  );
}

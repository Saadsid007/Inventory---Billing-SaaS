import { PageBody, PageHeaderSkeleton, Skeleton, TableSkeleton } from '@billwise/ui';

/**
 * The admin panel, while it checks you are allowed in.
 *
 * Sits at `/admin` rather than inside `(panel)` on purpose: the panel layout is
 * async — it awaits `requireSuperAdmin()` — so this is the fallback that
 * actually shows during that check. A fallback inside `(panel)` would only
 * appear after the guard had already passed.
 *
 * Draws the panel's own top bar rather than inheriting the marketing skeleton
 * from the root, which is what happened before and looked like the panel had
 * been replaced by the landing page.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-md" />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      </header>

      <PageBody className="mx-auto max-w-6xl p-6 sm:p-8">
        <PageHeaderSkeleton withAction={false} />
        <TableSkeleton rows={8} cols={6} />
      </PageBody>
    </div>
  );
}

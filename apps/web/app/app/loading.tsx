import { AppShellSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '@billwise/ui';

/**
 * The first frame of the app, before it knows who you are.
 *
 * ## Why this one draws the whole window
 *
 * Every other `loading.tsx` renders *inside* the shell, so it only has to
 * outline the page. This one does not: the section layouts under `/app` —
 * `(dashboard)`, `seva`, `billing` — are async, and each awaits the session,
 * the membership and the business before it can render `AppFrame` at all.
 * While a layout is suspending there is no shell yet, and Next.js falls back to
 * the nearest ancestor fallback, which is this file.
 *
 * It used to be a bare `ListPageSkeleton`, and the result was a page outline
 * floating full-bleed on an empty background with no rail and no header. That
 * does not read as "loading", it reads as "broken" — the app appeared to have
 * lost its own furniture. So this draws the furniture.
 *
 * ## Why the content underneath is generic
 *
 * It covers both apps and every section, so it cannot know whether a dashboard,
 * a list or a form is coming. Header, four figures, a table: the shape most
 * screens in here share, and it is on screen for the length of one auth check.
 * The route's own fallback takes over the moment the layout resolves.
 */
export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-5">
        <PageHeaderSkeleton />
        <StatCardsSkeleton />
        <TableSkeleton rows={6} cols={5} />
      </div>
    </AppShellSkeleton>
  );
}

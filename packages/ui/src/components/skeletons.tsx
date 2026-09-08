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

/**
 * The tinted banner both dashboards open with.
 *
 * Drawn as a real gradient rather than as grey bars, because it is the one
 * block on the page whose colour is known before the data arrives. Leaving it
 * grey and then flooding it blue is a bigger visual jump than anything the
 * skeleton saves.
 */
export function HeroSkeleton() {
  return (
    <div className="brand-wash relative overflow-hidden rounded-3xl p-5 shadow-lg shadow-primary/20 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2.5">
          <div className="h-6 w-40 rounded-full bg-white/20" />
          <div className="h-8 w-56 rounded-lg bg-white/25" />
          <div className="h-4 w-72 max-w-full rounded bg-white/15" />
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="h-11 w-36 rounded-xl bg-white/25" />
          <div className="h-11 w-32 rounded-xl bg-white/15" />
        </div>
      </div>
    </div>
  );
}

/** A grid of equal cards — the deliveries desk, the services list on mobile. */
export function CardGridSkeleton({ count = 6, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="space-y-2.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20 rounded-lg" />
          </div>
          {Array.from({ length: lines }, (_, l) => (
            <Skeleton key={l} className="h-3 w-full" style={{ maxWidth: `${88 - l * 14}%` }} />
          ))}
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * A printed-document-shaped placeholder: an invoice, a receipt.
 *
 * Keeps the coloured header band and the three-figure money strip, because
 * those are the two things that anchor the eye on the real page. A flat stack
 * of grey bars would technically be a skeleton and would tell you nothing about
 * what is coming.
 */
export function DocumentSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3.5 w-28" />

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="brand-wash px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-white/20" />
              <div className="h-8 w-40 rounded-lg bg-white/25" />
              <div className="h-3.5 w-32 rounded bg-white/15" />
            </div>
            <div className="space-y-2 text-right">
              <div className="ml-auto h-6 w-24 rounded-full bg-white/20" />
              <div className="ml-auto h-4 w-28 rounded bg-white/20" />
              <div className="ml-auto h-3 w-20 rounded bg-white/15" />
            </div>
          </div>
        </div>

        <ul className="divide-y">
          {Array.from({ length: lines }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-7">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-3 divide-x border-y bg-muted/30">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2 px-3 py-4 text-center">
              <Skeleton className="mx-auto h-2.5 w-16" />
              <Skeleton className="mx-auto h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9.5 w-36 rounded-lg" />
        <Skeleton className="h-9.5 w-40 rounded-lg" />
        <Skeleton className="h-9.5 w-24 rounded-lg" />
      </div>
    </div>
  );
}

/** Hero, four figures, then two lists side by side. Both dashboards. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <HeroSkeleton />
      <StatCardsSkeleton />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-4 w-32" />
          <TableSkeleton rows={5} cols={3} />
        </div>
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-4 w-32" />
          <TableSkeleton rows={5} cols={4} />
        </div>
      </div>
    </div>
  );
}

/** Range tabs, four figures, then two lists. The reports screens. */
export function ReportsSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-1">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>
      <StatCardsSkeleton count={stats} />
      <div className="grid gap-5 lg:grid-cols-2">
        <TableSkeleton rows={7} cols={3} />
        <TableSkeleton rows={7} cols={3} />
      </div>
    </div>
  );
}

/**
 * A public page: header bar, a big centred heading, then content.
 *
 * Full-bleed rather than page-padded, because the marketing routes have no app
 * shell around them — this placeholder has to draw its own top bar or the
 * screen looks like it lost its navigation.
 */
export function MarketingPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>

        <div className={`mt-10 grid gap-6 ${cards > 1 ? 'md:grid-cols-2' : ''}`}>
          {Array.from({ length: cards }, (_, i) => (
            <Card key={i} className="overflow-hidden p-0">
              <div className="brand-wash space-y-2.5 p-7 sm:p-8">
                <div className="h-3.5 w-32 rounded bg-white/20" />
                <div className="h-9 w-40 rounded-lg bg-white/25" />
                <div className="h-3.5 w-56 max-w-full rounded bg-white/15" />
              </div>
              <div className="space-y-3 p-7 sm:p-8">
                <Skeleton className="h-2.5 w-32" />
                {Array.from({ length: 6 }, (_, l) => (
                  <Skeleton key={l} className="h-3.5 w-full" />
                ))}
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

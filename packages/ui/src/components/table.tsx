import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Plain semantic table. Not a data-grid — a shopkeeper's product list is a
 * list, and a virtualised grid would cost more than it returns at these sizes.
 *
 * Money and quantity cells must carry `numeric`, which right-aligns and uses
 * tabular figures so a rupee column lines up.
 *
 * Visual language: dark navy header, zebra rows, blue hover — dense data that
 * still reads as intentional, not a spreadsheet dump.
 */

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs ring-1 ring-border/50">
      <div className="w-full overflow-x-auto">
        <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
      </div>
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn(
        // Solid navy header (reference-style). Kill body row zebra/hover here.
        'bg-[oklch(0.28_0.055_255)] text-white border-b border-border/80',
        '[&_tr]:border-0 [&_tr]:bg-transparent [&_tr]:even:bg-transparent',
        '[&_tr]:hover:!bg-transparent dark:bg-[oklch(0.22_0.05_255)]',
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-border border-b border-border', className)} {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'vendor-table-row border-b border-border bg-card transition-colors duration-150',
        // Subtle zebra on the row itself so hover can reliably override it.
        'even:bg-muted/30 dark:even:bg-muted/15',
        'hover:bg-primary-subtle/80 dark:hover:bg-primary-subtle/40',
        className,
      )}
      {...props}
    />
  );
}

export function TH({
  className,
  numeric,
  icon: Icon,
  children,
  ...props
}: React.ComponentProps<'th'> & {
  numeric?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <th
      className={cn(
        'h-9 px-3.5 text-left align-middle text-[0.68rem] font-bold tracking-[0.08em] text-white/95 uppercase select-none',
        numeric && 'text-right',
        className,
      )}
      {...props}
    >
      <span className={cn('inline-flex items-center gap-1.5', numeric && 'justify-end')}>
        {Icon && <Icon className="size-3 shrink-0 opacity-80" aria-hidden />}
        {children}
      </span>
    </th>
  );
}

export function TD({
  className,
  numeric,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'px-3.5 py-2 align-middle text-xs sm:text-[0.8125rem] leading-tight text-foreground',
        numeric && 'tabular text-right',
        className,
      )}
      {...props}
    />
  );
}

/** Compact action cluster for the rightmost table column. */
export function RowActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-1.5', className)}
      {...props}
    />
  );
}

/** Shared class for the primary identity cell (order no / product name / party). */
export const tableLinkClass =
  'font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline';

/**
 * The screen a shopkeeper sees before they have any data, which is their first
 * impression of every module.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-card to-muted/20 px-6 py-14 text-center shadow-xs',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-subtle text-primary-subtle-foreground shadow-xs ring-1 ring-primary/10">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-base font-bold tracking-tight">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

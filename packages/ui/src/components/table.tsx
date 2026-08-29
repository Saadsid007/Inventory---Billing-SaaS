import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Plain semantic table. Not a data-grid — a shopkeeper's product list is a
 * list, and a virtualised grid would cost more than it returns at these sizes.
 *
 * Money and quantity cells must carry `numeric`, which right-aligns and uses
 * tabular figures so a rupee column lines up.
 *
 * The wrapper scrolls horizontally on a phone rather than wrapping cells into
 * unreadable stacks. A bill list with a squashed amount column is worse than
 * one the shopkeeper swipes sideways.
 */

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-xs">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('bg-muted/60 [&_tr]:border-b', className)} {...props} />;
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('border-b transition-colors hover:bg-primary-subtle/45', className)}
      {...props}
    />
  );
}

export function TH({
  className,
  numeric,
  ...props
}: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold tracking-wide text-muted-foreground uppercase',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  numeric,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle', numeric && 'tabular text-right', className)}
      {...props}
    />
  );
}

/**
 * The screen a shopkeeper sees before they have any data, which is their first
 * impression of every module. It gets an icon, a sentence explaining what will
 * appear here, and — most importantly — the button that creates the first one.
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
        'flex flex-col items-center rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-12 place-items-center rounded-xl bg-primary-subtle text-primary-subtle-foreground">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-base font-semibold">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Plain semantic table. Not a data-grid — a shopkeeper's product list is a
 * list, and a virtualised grid would cost more than it returns at these sizes.
 *
 * Money and quantity cells must carry `numeric`, which right-aligns and uses
 * tabular figures so a rupee column lines up.
 */

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('bg-muted/50 [&_tr]:border-b', className)} {...props} />;
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('border-b transition-colors hover:bg-muted/40', className)} {...props} />;
}

export function TH({
  className,
  numeric,
  ...props
}: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        'h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground',
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
      className={cn('px-3 py-2.5 align-middle', numeric && 'tabular text-right', className)}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

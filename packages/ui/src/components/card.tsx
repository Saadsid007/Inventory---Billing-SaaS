import type * as React from 'react';
import { cn } from '../lib/cn';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-xs transition-shadow',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-semibold leading-none', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t bg-muted/30 px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}

/**
 * Dashboard metric tile.
 *
 * Money values must pass `tabular` so digits align when several tiles sit in a
 * row — a rupee column that jitters looks broken.
 *
 * `tone` tints the icon chip only, never the number. Colouring the figure
 * itself makes a dashboard look like a warning panel; the shopkeeper should be
 * able to read the row of numbers before deciding which one is a problem.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}) {
  const toneClass = {
    default: 'bg-primary-subtle text-primary-subtle-foreground',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-warning',
    destructive: 'bg-destructive/12 text-destructive',
    info: 'bg-info/12 text-info',
  }[tone];

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon && (
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', toneClass)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-2xl font-semibold sm:text-[1.7rem]">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

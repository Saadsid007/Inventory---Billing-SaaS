import type * as React from 'react';
import { cn } from '../lib/cn';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-black/[0.02] transition-shadow dark:ring-white/[0.05]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-[0.95rem] font-semibold leading-none', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t bg-muted/30 px-4 py-3.5 sm:px-5', className)}
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
 * `tone` tints the surface and icon chip. The figure itself stays readable
 * foreground so a row of metrics does not shout like a warning panel.
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
  icon?: React.ComponentType<{ className?: string }> | undefined;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | undefined;
  className?: string | undefined;
}) {
  const toneStyles = {
    default: {
      surface:
        'from-indigo-50/90 via-card to-blue-50/70 border-indigo-200/80 hover:border-indigo-300 dark:from-indigo-950/40 dark:via-card dark:to-blue-950/20 dark:border-indigo-800/50',
      bar: 'from-primary via-indigo-500 to-sky-500',
      badge: 'bg-gradient-to-br from-primary to-sky-600 text-primary-foreground shadow-xs',
      orb: 'bg-primary/20',
      label: 'text-primary-subtle-foreground',
    },
    success: {
      surface:
        'from-emerald-50/90 via-card to-teal-50/70 border-emerald-200/80 hover:border-emerald-300 dark:from-emerald-950/40 dark:via-card dark:to-teal-950/20 dark:border-emerald-800/50',
      bar: 'from-emerald-500 via-teal-500 to-emerald-600',
      badge: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xs',
      orb: 'bg-emerald-500/20',
      label: 'text-emerald-800 dark:text-emerald-300',
    },
    warning: {
      surface:
        'from-amber-50/90 via-card to-orange-50/70 border-amber-200/80 hover:border-amber-300 dark:from-amber-950/40 dark:via-card dark:to-orange-950/20 dark:border-amber-800/50',
      bar: 'from-amber-500 via-orange-500 to-amber-600',
      badge: 'bg-gradient-to-br from-amber-500 to-orange-600 text-amber-950 shadow-xs',
      orb: 'bg-amber-500/20',
      label: 'text-amber-900 dark:text-amber-300',
    },
    destructive: {
      surface:
        'from-rose-50/90 via-card to-orange-50/50 border-rose-200/80 hover:border-rose-300 dark:from-rose-950/40 dark:via-card dark:to-rose-950/20 dark:border-rose-800/50',
      bar: 'from-rose-500 via-rose-600 to-orange-500',
      badge: 'bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-xs',
      orb: 'bg-rose-500/20',
      label: 'text-rose-800 dark:text-rose-300',
    },
    info: {
      surface:
        'from-sky-50/90 via-card to-cyan-50/70 border-sky-200/80 hover:border-sky-300 dark:from-sky-950/40 dark:via-card dark:to-cyan-950/20 dark:border-sky-800/50',
      bar: 'from-sky-500 via-cyan-500 to-blue-500',
      badge: 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-xs',
      orb: 'bg-sky-500/20',
      label: 'text-sky-800 dark:text-sky-300',
    },
  }[tone];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-gradient-to-br p-2.5 sm:p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs',
        toneStyles.surface,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r', toneStyles.bar)}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 size-20 rounded-full blur-xl transition-transform duration-500 group-hover:scale-125',
          toneStyles.orb,
        )}
      />

      <div className="relative flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-[0.62rem] font-bold tracking-[0.08em] uppercase truncate',
            toneStyles.label,
          )}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105',
              toneStyles.badge,
            )}
          >
            <Icon className="size-3.5" />
          </span>
        )}
      </div>

      <p className="tabular relative mt-1.5 text-lg sm:text-[1.35rem] font-black tracking-tight text-foreground leading-tight">
        {value}
      </p>
      {hint && (
        <p className="relative mt-0.5 text-[11px] leading-tight text-muted-foreground truncate">
          {hint}
        </p>
      )}
    </Card>
  );
}

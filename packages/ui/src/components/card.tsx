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
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}) {
  const toneStyles = {
    default: {
      surface:
        'from-[oklch(0.95_0.04_258)] via-card to-[oklch(0.96_0.03_232)] border-primary/25 hover:border-primary/45 dark:from-primary/20 dark:via-card dark:to-sky-500/10',
      bar: 'from-primary via-sky-500 to-primary',
      badge: 'bg-gradient-to-br from-primary to-sky-600 text-primary-foreground shadow-sm shadow-primary/30',
      orb: 'bg-primary/20',
      label: 'text-primary-subtle-foreground',
    },
    success: {
      surface:
        'from-emerald-50 via-card to-teal-50/80 border-emerald-300/60 hover:border-emerald-400/70 dark:from-emerald-950/50 dark:via-card dark:to-teal-950/30 dark:border-emerald-700/50',
      bar: 'from-emerald-500 via-teal-500 to-emerald-600',
      badge: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/30',
      orb: 'bg-emerald-500/20',
      label: 'text-emerald-800 dark:text-emerald-300',
    },
    warning: {
      surface:
        'from-amber-50 via-card to-orange-50/80 border-amber-300/70 hover:border-amber-400/80 dark:from-amber-950/50 dark:via-card dark:to-orange-950/30 dark:border-amber-700/50',
      bar: 'from-amber-500 via-orange-500 to-amber-600',
      badge: 'bg-gradient-to-br from-amber-500 to-orange-600 text-amber-950 shadow-sm shadow-amber-500/30',
      orb: 'bg-amber-500/20',
      label: 'text-amber-900 dark:text-amber-300',
    },
    destructive: {
      surface:
        'from-rose-50 via-card to-orange-50/50 border-rose-300/60 hover:border-rose-400/70 dark:from-rose-950/50 dark:via-card dark:to-rose-950/30 dark:border-rose-700/50',
      bar: 'from-rose-500 via-rose-600 to-orange-500',
      badge: 'bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-sm shadow-rose-600/30',
      orb: 'bg-rose-500/20',
      label: 'text-rose-800 dark:text-rose-300',
    },
    info: {
      surface:
        'from-sky-50 via-card to-cyan-50/80 border-sky-300/60 hover:border-sky-400/70 dark:from-sky-950/50 dark:via-card dark:to-cyan-950/30 dark:border-sky-700/50',
      bar: 'from-sky-500 via-cyan-500 to-blue-500',
      badge: 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-sm shadow-sky-600/30',
      orb: 'bg-sky-500/20',
      label: 'text-sky-800 dark:text-sky-300',
    },
  }[tone];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5',
        toneStyles.surface,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r', toneStyles.bar)}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125',
          toneStyles.orb,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p
          className={cn(
            'text-[0.68rem] font-bold tracking-[0.1em] uppercase',
            toneStyles.label,
          )}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3',
              toneStyles.badge,
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <p className="tabular relative mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.65rem] leading-none">
        {value}
      </p>
      {hint && (
        <p className="relative mt-2 text-xs leading-snug text-muted-foreground">{hint}</p>
      )}
    </Card>
  );
}

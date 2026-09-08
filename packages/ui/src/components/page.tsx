import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Page furniture.
 *
 * Every screen in the app opens the same way: a title, one line saying what
 * this page is for, and the primary action on the right.
 */

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary action(s), right-aligned on desktop and stacked under on a phone. */
  actions?: React.ReactNode;
  /** e.g. a "back to invoices" link above the title. */
  breadcrumb?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary-subtle/30 p-4 shadow-xs sm:p-5',
        className,
      )}
    >
      {breadcrumb && <div className="mb-2 text-sm text-muted-foreground">{breadcrumb}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Standard vertical rhythm for a page's contents. */
export function PageBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('space-y-5', className)} {...props} />;
}

/** A titled block within a page. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Separator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="separator" className={cn('h-px w-full bg-border', className)} {...props} />;
}

/**
 * Standing information — not a validation failure, which is `FormError`.
 */
export function Alert({
  variant = 'info',
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  variant?: 'info' | 'warning' | 'destructive' | 'success';
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-info/25 bg-info/8 text-info',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    destructive: 'border-destructive/30 bg-destructive/8 text-destructive',
    success: 'border-success/30 bg-success/8 text-success',
  }[variant];

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-2xl border p-4 shadow-xs',
        styles,
        className,
      )}
    >
      {Icon && <Icon className="mt-0.5 size-4.5 shrink-0" />}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className="text-sm leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Label/value pairs — an invoice's party block, a product's tax details.
 */
export function DetailList({ className, ...props }: React.ComponentProps<'dl'>) {
  return <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)} {...props} />;
}

export function Detail({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{children}</dd>
    </div>
  );
}

/**
 * Loading placeholder.
 *
 * A band of light sweeping left to right, not a block fading in and out. The
 * fade was cheaper and read as a fault — nothing on a working screen breathes.
 * A sweep has a direction, and a direction is what tells somebody to wait
 * rather than to reload.
 *
 * The gradient is painted at 250% width and the *background position* is what
 * animates, so nothing here paints outside the element, needs `overflow-hidden`
 * or forces a layout pass. Colour comes from two tokens that move in opposite
 * directions between themes: in the dark theme a sweep still has to travel
 * towards the light, or it looks like a shadow crossing the page.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-shimmer-base',
        'bg-[linear-gradient(100deg,var(--shimmer-base)_38%,var(--shimmer-highlight)_50%,var(--shimmer-base)_62%)]',
        'bg-[length:250%_100%]',
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

/**
 * Shared chrome for list-page filter/search toolbars.
 * Pages put Inputs / Selects / Buttons inside; this owns the look.
 */
export function FilterBar({
  className,
  children,
  pending,
  ...props
}: React.ComponentProps<'div'> & { pending?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-gradient-to-r from-card via-card to-muted/20 p-2 sm:p-2.5 shadow-xs ring-1 ring-border/50 backdrop-blur-xs',
        className,
      )}
      {...props}
    >
      {children}
      {pending && (
        <span className="ml-auto text-[11px] font-medium text-muted-foreground animate-pulse pr-1">
          Updating…
        </span>
      )}
    </div>
  );
}

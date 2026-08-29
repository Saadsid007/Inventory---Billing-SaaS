import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Page furniture.
 *
 * Every screen in the app opens the same way: a title, one line saying what
 * this page is for, and the primary action on the right. Doing that by hand on
 * twenty pages produces twenty slightly different headers, which is the single
 * clearest way to make a product look homemade.
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
    <header className={cn('space-y-1.5', className)}>
      {breadcrumb && <div className="text-sm text-muted-foreground">{breadcrumb}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{title}</h1>
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
  return <div className={cn('space-y-6', className)} {...props} />;
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
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
 * Used for "your trial ends in 3 days" and similar.
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
    <div className={cn('flex flex-wrap items-start gap-3 rounded-xl border p-4', styles, className)}>
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
 * Two columns on desktop, stacked on a phone.
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

/** Loading placeholder. Pulses via opacity, so it works on both surfaces. */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-shimmer rounded-md bg-muted', className)}
      aria-hidden
      {...props}
    />
  );
}

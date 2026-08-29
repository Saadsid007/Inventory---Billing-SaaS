import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Status pills.
 *
 * Soft variants (a tinted background with a matching ring) rather than solid
 * blocks of colour. A row of solid red and green chips in a table shouts over
 * the numbers, which are what the shopkeeper is actually reading.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground ring-transparent',
        subtle: 'bg-primary-subtle text-primary-subtle-foreground ring-primary/20',
        secondary: 'bg-secondary text-secondary-foreground ring-border',
        outline: 'bg-transparent text-muted-foreground ring-border',
        success: 'bg-success/12 text-success ring-success/25',
        warning: 'bg-warning/15 text-warning ring-warning/30',
        destructive: 'bg-destructive/12 text-destructive ring-destructive/25',
        info: 'bg-info/12 text-info ring-info/25',
      },
      dot: { true: '', false: '' },
    },
    defaultVariants: { variant: 'default', dot: false },
  },
);

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** Small leading dot. Reads as "live status" rather than "label". */
    dot?: boolean;
  };

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/**
 * Stock shown as a state, never a number — on the public catalog because
 * competitors read it, and in the app because "Low" is the thing that prompts
 * action (spec Phase 1f).
 */
export function StockBadge({ status }: { status: 'in_stock' | 'low_stock' | 'out_of_stock' }) {
  const map = {
    in_stock: { label: 'In stock', variant: 'success' as const },
    low_stock: { label: 'Low stock', variant: 'warning' as const },
    out_of_stock: { label: 'Out of stock', variant: 'destructive' as const },
  };
  const { label, variant } = map[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

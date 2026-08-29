import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success/15 text-success',
        warning: 'border-transparent bg-warning/20 text-warning',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
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
  return <Badge variant={variant}>{label}</Badge>;
}

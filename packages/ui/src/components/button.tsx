import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Buttons.
 *
 * Two details that matter more than they look:
 *
 * • Hover on the primary swaps to a darker *token*, not `bg-primary/90`. An
 *   opacity hover over a tinted page background goes milky and washes the blue
 *   out — the button appears to fade rather than to press.
 * • Every variant has an `active:` state. On a phone at a shop counter there is
 *   no hover at all, so without a pressed state a tap gives no feedback and the
 *   shopkeeper taps again — which is how a bill gets saved twice.
 */
const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium transition-[background-color,color,box-shadow,transform] duration-150',
    'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-55',
    'active:translate-y-px',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-hover',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:brightness-95 active:brightness-90',
        outline:
          'border border-input bg-card text-foreground shadow-xs hover:border-primary/40 hover:bg-primary-subtle hover:text-primary-subtle-foreground active:bg-accent',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-accent active:bg-accent',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent',
        subtle:
          'bg-primary-subtle text-primary-subtle-foreground hover:brightness-[0.97] active:brightness-95',
        success:
          'bg-success text-success-foreground shadow-xs hover:brightness-95 active:brightness-90',
        link: 'text-primary underline-offset-4 hover:underline active:translate-y-0',
      },
      size: {
        default: 'h-9 px-4 text-sm',
        sm: 'h-7.5 gap-1.5 rounded-md px-2.5 text-xs',
        lg: 'h-10.5 rounded-lg px-6 text-sm',
        /** Dense, small table action button — enterprise-style. */
        table: 'h-6.5 gap-1 rounded-md px-2 text-[11px] font-semibold shadow-2xs tracking-tight',
        icon: 'size-9',
        'icon-sm': 'size-6.5 rounded-md',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

/**
 * Note for anyone adding forms later — build spec rule 6: no `<form>` submit
 * flows in client components. Buttons here default to `type="button"` so a
 * stray button inside a form cannot trigger a native submit.
 */
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };

import type * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Form primitives. Every form in the product repeats label + control + error +
 * hint, so it lives here once and stays consistent.
 *
 * Controls are 38px tall (`h-9.5`), which with the surrounding field spacing
 * still gives a comfortable tap target. The primary user is billing on a phone,
 * one-handed, sometimes with a customer waiting.
 */

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn('text-sm font-medium leading-none text-foreground', className)}
      {...props}
    />
  );
}

/**
 * Shared control chrome.
 *
 * The focus state deliberately does two things at once — the border turns the
 * brand blue AND a soft ring appears. Border alone is too easy to miss on a
 * dense form; ring alone looks like a halo hovering off the edge of the field.
 */
const controlBase = [
  'w-full rounded-md border border-input bg-card text-sm text-foreground shadow-xs',
  'transition-[border-color,box-shadow,background-color] duration-150',
  'placeholder:text-muted-foreground/70',
  'hover:border-primary/35',
  'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:hover:border-destructive',
];

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(controlBase, 'h-9.5 px-3 py-1', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        controlBase,
        'ui-select h-9.5 cursor-pointer appearance-none py-1.5 pl-3 pr-8.5 text-sm font-medium text-foreground bg-background shadow-2xs transition-all hover:border-border-hover focus:border-primary',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  /**
   * Hide the label visually, keeping it for screen readers.
   *
   * For repeating rows — several "Amount" fields stacked under one heading —
   * where printing the word again on every line is noise. Dropping the label
   * entirely instead would leave the control unnamed, which is exactly the
   * case a screen reader cannot recover from.
   */
  labelHidden?: boolean;
  /** Right-aligned extra, e.g. a character count or a "why?" link. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  labelHidden,
  aside,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'flex items-baseline justify-between gap-3',
          labelHidden && 'sr-only',
        )}
      >
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
        {aside}
      </div>
      {children}
      {/* aria-live so a screen reader announces a validation failure that
          appears after the user has already moved on from the field. */}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-destructive" aria-live="polite">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Form-level failure — a wrong password, a duplicate email, a dead database. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm font-medium text-destructive"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="mt-0.5 size-4 shrink-0"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

/** Confirmation of something that worked. The counterpart to FormError. */
export function FormSuccess({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/8 px-3.5 py-3 text-sm font-medium text-success">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 size-4 shrink-0"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

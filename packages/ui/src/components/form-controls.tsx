import * as React from 'react';
import { cn } from '../lib/cn';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs',
        'transition-[border-color,box-shadow] duration-150',
        'placeholder:text-muted-foreground/70',
        'hover:border-primary/35',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
        className,
      )}
      {...props}
    />
  );
}

export type CheckboxProps = Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> & {
  label: string;
  hint?: string;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * Checkbox with its label and hint.
 *
 * The whole block is a label target, so a thumb on a phone does not have to
 * find a 16px square.
 */
export function Checkbox({ label, hint, className, onCheckedChange, ...props }: CheckboxProps) {
  const id = React.useId();
  const inputId = props.id ?? id;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-transparent p-1 transition-colors has-[:checked]:border-primary/20 has-[:checked]:bg-primary-subtle/50',
        className,
      )}
    >
      <input
        {...props}
        id={inputId}
        type="checkbox"
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-input accent-primary focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none"
      />
      <div className="min-w-0">
        <label htmlFor={inputId} className="cursor-pointer text-sm leading-tight font-medium">
          {label}
        </label>
        {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Non-blocking advice. Build spec §5.5: a tax invoice line with no HSN gets a
 * warning, never a hard block — refusing to bill a customer standing at the
 * counter over paperwork that can be fixed later is the wrong trade.
 */
export function WarningList({ warnings }: { warnings: readonly string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-3.5"
          aria-hidden
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        Worth checking — you can still save
      </p>
      <ul className="space-y-1 text-xs leading-relaxed text-warning/95">
        {warnings.map((w) => (
          <li key={w} className="flex gap-1.5">
            <span aria-hidden>•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

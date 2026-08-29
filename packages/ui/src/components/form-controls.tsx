import * as React from 'react';
import { cn } from '../lib/cn';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
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

export function Checkbox({ label, hint, className, onCheckedChange, ...props }: CheckboxProps) {
  const id = React.useId();
  const inputId = props.id ?? id;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        {...props}
        id={inputId}
        type="checkbox"
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
      />
      <div className="min-w-0">
        <label htmlFor={inputId} className="text-sm leading-tight font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
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
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
      <ul className="space-y-1 text-xs">
        {warnings.map((w) => (
          <li key={w}>• {w}</li>
        ))}
      </ul>
    </div>
  );
}

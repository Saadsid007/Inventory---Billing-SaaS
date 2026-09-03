'use client';

import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | undefined;
  description?: string | undefined;
};

export interface DropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly DropdownOption<T>[];
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  size?: 'sm' | 'md' | undefined;
  id?: string | undefined;
}

export function Dropdown<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option…',
  disabled = false,
  className,
  size = 'md',
  id,
}: DropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close when clicking outside
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-border/90 bg-background text-left font-medium text-foreground shadow-2xs transition-all',
          'hover:border-border-hover focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
          size === 'sm' ? 'h-8 px-2.5 text-xs gap-1.5' : 'h-9.5 px-3 text-sm gap-2',
          open && 'border-primary ring-2 ring-primary/20',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <selected.icon className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'shrink-0 text-muted-foreground/80 transition-transform duration-200',
            size === 'sm' ? 'size-3.5' : 'size-4',
            open && 'rotate-180 text-primary',
          )}
        />
      </button>

      {/* Floating Menu */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border/90 bg-card p-1 shadow-lg ring-1 ring-border/50 backdrop-blur-xs animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                  isSelected
                    ? 'bg-primary/10 font-bold text-primary'
                    : 'text-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && (
                    <option.icon
                      className={cn(
                        'size-3.5 shrink-0',
                        isSelected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  )}
                  <div className="truncate">
                    <p className="truncate">{option.label}</p>
                    {option.description && (
                      <p className="text-[10px] text-muted-foreground font-normal">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="size-3.5 shrink-0 text-primary ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

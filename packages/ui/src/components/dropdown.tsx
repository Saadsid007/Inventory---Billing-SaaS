'use client';

import { Check, ChevronDown, Search, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | undefined;
  description?: string | undefined;
  badge?: string | undefined;
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
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  clearable?: boolean | undefined;
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
  searchable = false,
  searchPlaceholder = 'Search options…',
  clearable = false,
}: DropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  // Auto-enable search if there are many options
  const shouldSearch = searchable || options.length > 7;

  const filtered = React.useMemo(() => {
    if (!shouldSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)),
    );
  }, [options, shouldSearch, query]);

  // Focus search input when opened
  React.useEffect(() => {
    if (open && shouldSearch) {
      setQuery('');
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, shouldSearch]);

  // Close when clicking outside or pressing Escape
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
          'group flex w-full items-center justify-between rounded-xl border border-border/90 bg-background text-left font-medium text-foreground shadow-2xs transition-all duration-150',
          'hover:border-primary/50 hover:bg-muted/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
          size === 'sm' ? 'h-8 px-2.5 text-xs gap-1.5' : 'h-10 px-3 text-sm gap-2',
          open && 'border-primary ring-2 ring-primary/25 shadow-xs',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <selected.icon className="size-4 shrink-0 text-primary" />}
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange('' as T);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'shrink-0 text-muted-foreground/80 transition-transform duration-200 group-hover:text-foreground',
              size === 'sm' ? 'size-3.5' : 'size-4',
              open && 'rotate-180 text-primary',
            )}
          />
        </div>
      </button>

      {/* Floating Menu */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 flex max-h-72 flex-col overflow-hidden rounded-2xl border border-border/90 bg-card p-1 shadow-xl ring-1 ring-border/50 backdrop-blur-md animate-fade-in"
        >
          {shouldSearch && (
            <div className="relative border-b border-border/70 px-2 pb-2 pt-1">
              <Search className="pointer-events-none absolute left-4.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border/60 bg-muted/30 py-1 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No matching options
              </div>
            ) : (
              filtered.map((option) => {
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
                      'flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors',
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
                        <p className="truncate font-medium">{option.label}</p>
                        {option.description && (
                          <p className="text-[10px] text-muted-foreground font-normal">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {option.badge && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="size-3.5 shrink-0 text-primary ml-1" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

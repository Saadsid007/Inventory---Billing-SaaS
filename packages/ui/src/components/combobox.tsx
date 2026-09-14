'use client';

import { Check, ChevronDown, Search, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type ComboboxItem<T extends string = string> = {
  value: T;
  label: string;
  sublabel?: string | undefined;
  badge?: string | undefined;
  badgeTone?: 'default' | 'warning' | 'success' | 'info' | undefined;
  icon?: React.ComponentType<{ className?: string }> | undefined;
  disabled?: boolean | undefined;
};

export interface ComboboxProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  items: readonly ComboboxItem<T>[];
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyText?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
  clearable?: boolean | undefined;
  onClear?: (() => void) | undefined;
  footerAction?: {
    label: string;
    icon?: React.ComponentType<{ className?: string }> | undefined;
    onClick: () => void;
  } | undefined;
}

export function Combobox<T extends string = string>({
  value,
  onChange,
  items,
  placeholder = 'Select option…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matching options',
  disabled = false,
  className,
  id,
  clearable = true,
  onClear,
  footerAction,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = React.useMemo(
    () => items.find((i) => i.value === value),
    [items, value],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(q)),
    );
  }, [items, search]);

  // Reset highlight when filtered list changes
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length]);

  // Focus search input on open
  React.useEffect(() => {
    if (open) {
      setSearch('');
      // Small timeout to allow DOM render before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const buttons = listRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const target = buttons[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  // Handle outside click & escape
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[highlightedIndex];
      if (target && !target.disabled) {
        onChange(target.value);
        setOpen(false);
      }
    }
  }

  const badgeStyles = {
    default: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning font-semibold',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold',
    info: 'bg-info/15 text-info font-semibold',
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
      {/* Trigger Button */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        id={id}
        className={cn(
          'group flex min-h-10 w-full cursor-pointer items-center justify-between rounded-xl border border-border/90 bg-background px-3 py-2 text-left text-sm shadow-2xs transition-all duration-150',
          'hover:border-primary/50 hover:bg-muted/20',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
          disabled && 'cursor-not-allowed opacity-60 bg-muted',
          open && 'border-primary ring-2 ring-primary/25 shadow-xs',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {selected?.icon ? (
            <selected.icon className="size-4 shrink-0 text-primary" />
          ) : (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary uppercase">
              {selected ? selected.label.charAt(0) : '?'}
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 truncate">
            {selected ? (
              <>
                <span className="truncate font-semibold text-foreground">{selected.label}</span>
                {selected.sublabel && (
                  <span className="tabular shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {selected.sublabel}
                  </span>
                )}
                {selected.badge && (
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-[11px]',
                      badgeStyles[selected.badgeTone ?? 'default'],
                    )}
                  >
                    {selected.badge}
                  </span>
                )}
              </>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pl-2">
          {clearable && value && !disabled && (
            <button
              type="button"
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                if (onClear) onClear();
                else onChange('' as T);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}

          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 text-muted-foreground/80 transition-transform duration-200 group-hover:text-foreground',
              open && 'rotate-180 text-primary',
            )}
          />
        </div>
      </div>

      {/* Dropdown Floating Menu */}
      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 flex max-h-80 flex-col overflow-hidden rounded-2xl border border-border/90 bg-card p-1.5 shadow-xl ring-1 ring-border/50 backdrop-blur-md animate-fade-in"
        >
          {/* Search Input Header */}
          <div className="relative border-b border-border/70 px-2 pb-2 pt-1">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-lg border border-border/60 bg-muted/30 py-1.5 pl-8 pr-7 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Items list */}
          <div ref={listRef} className="flex-1 overflow-y-auto py-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs sm:text-sm text-muted-foreground">
                <p>{emptyText}</p>
                {search && (
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    No results for &ldquo;{search}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              filtered.map((item, index) => {
                const isSelected = item.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={item.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        onChange(item.value);
                        setOpen(false);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs sm:text-sm transition-all duration-100',
                      isSelected
                        ? 'bg-primary/10 font-semibold text-primary'
                        : isHighlighted
                          ? 'bg-muted/70 text-foreground'
                          : 'text-foreground hover:bg-muted/50',
                      item.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {item.icon ? (
                        <item.icon
                          className={cn(
                            'size-4 shrink-0',
                            isSelected ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {item.label.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 truncate">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-medium">{item.label}</span>
                          {item.sublabel && (
                            <span className="tabular shrink-0 font-mono text-[11px] text-muted-foreground">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pl-2">
                      {item.badge && (
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px]',
                            badgeStyles[item.badgeTone ?? 'default'],
                          )}
                        >
                          {item.badge}
                        </span>
                      )}

                      {isSelected && (
                        <Check className="size-4 shrink-0 text-primary" aria-hidden />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Optional Footer Action */}
          {footerAction && (
            <div className="border-t border-border/70 p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  footerAction.onClick();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-primary hover:bg-primary-subtle transition-colors"
              >
                {footerAction.icon && <footerAction.icon className="size-3.5" />}
                <span>{footerAction.label}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import {
  Command,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';
import { LogoMark } from './logo';
import { ThemeToggle } from './theme';

/**
 * The authenticated app frame: sidebar, topbar, mobile drawer.
 *
 * Takes everything as props and renders no data of its own. Routing and session
 * are the app's concern, so this stays a pure presentation component that
 * `packages/ui` is allowed to own.
 */

const COLLAPSE_KEY = 'billwise-sidebar-collapsed';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Group heading. Items with the same section render together. */
  section?: string;
  /** Small count on the right, e.g. unpaid bills. */
  badge?: string | number;
};

export type AppShellProps = {
  businessName: string;
  /** e.g. 'Trial, 6 days left' - rendered under the business name. */
  statusLabel?: string | undefined;
  /** How urgent that status is. Only 'warning' and 'destructive' draw the eye. */
  statusTone?: 'default' | 'warning' | 'destructive' | undefined;
  userName: string;
  userEmail?: string | undefined;
  nav: readonly NavItem[];
  currentPath: string;
  /** Rendered inside the sidebar's business button. Phase 3 makes it a real menu. */
  onSwitchBusiness?: (() => void) | undefined;
  /** Sign-out control, supplied by the app because it owns the auth action. */
  userMenu?: React.ReactNode;
  /** Optional banner above the page content, e.g. trial ending. */
  banner?: React.ReactNode;
  /** Global header search — app owns routing (products / invoices). */
  onSearch?: ((query: string) => void) | undefined;
  /** Primary CTA in the header, e.g. New bill. */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  /** Link component. Passed in so this package never imports next/link. */
  LinkComponent: React.ComponentType<{
    href: string;
    className?: string;
    title?: string;
    children: React.ReactNode;
    onClick?: () => void;
    'aria-current'?: 'page' | undefined;
  }>;
};

function isActive(currentPath: string, href: string): boolean {
  return href === '/app' ? currentPath === '/app' : currentPath.startsWith(href);
}

/** Groups items by `section`, preserving the order sections first appear. */
function groupNav(nav: readonly NavItem[]) {
  const groups: { section: string; items: NavItem[] }[] = [];
  for (const item of nav) {
    const section = item.section ?? '';
    const existing = groups.find((g) => g.section === section);
    if (existing) existing.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}

export function AppShell({
  businessName,
  statusLabel,
  statusTone = 'default',
  userName,
  userEmail,
  nav,
  currentPath,
  onSwitchBusiness,
  userMenu,
  banner,
  onSearch,
  headerAction,
  children,
  LinkComponent: Link,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const mobileSearchRef = React.useRef<HTMLInputElement>(null);
  const groups = React.useMemo(() => groupNav(nav), [nav]);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  React.useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [currentPath]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // ⌘K / Ctrl+K focuses the header search — same muscle memory as most apps.
  React.useEffect(() => {
    if (!onSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(max-width: 639px)').matches) {
          setMobileSearchOpen(true);
          queueMicrotask(() => mobileSearchRef.current?.focus());
        } else {
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSearch]);

  React.useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || !onSearch) return;
    onSearch(q);
  }

  const statusClass = {
    default: 'text-muted-foreground',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }[statusTone];

  function sidebarContent(rail: boolean) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
        <div
          className={cn(
            'relative flex h-16 items-center border-b border-sidebar-border/80',
            rail ? 'justify-center px-2' : 'gap-3 px-4',
          )}
        >
          <LogoMark className="size-9 shrink-0 shadow-sm shadow-primary/20" />
          {!rail && (
            <div className="min-w-0">
              <span className="block text-[0.95rem] font-bold tracking-tight">Billwise</span>
              <span className="block text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                Business panel
              </span>
            </div>
          )}
        </div>

        <div className={cn('relative p-3', rail && 'px-2')}>
          <button
            type="button"
            onClick={onSwitchBusiness}
            disabled={!onSwitchBusiness}
            title={rail ? businessName : undefined}
            className={cn(
              'flex w-full items-center rounded-xl border border-sidebar-border/80 bg-card/70 text-left shadow-xs backdrop-blur-xs transition-all',
              rail ? 'justify-center p-1.5' : 'gap-2.5 p-2.5',
              onSwitchBusiness
                ? 'hover:border-primary/30 hover:bg-card hover:shadow-sm'
                : 'cursor-default',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground shadow-xs">
              {businessName.charAt(0).toUpperCase()}
            </span>
            {!rail && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{businessName}</span>
                {statusLabel && (
                  <span className={cn('block truncate text-[0.7rem] font-medium', statusClass)}>
                    {statusLabel}
                  </span>
                )}
              </span>
            )}
          </button>
        </div>

        <nav
          className={cn(
            'relative flex-1 space-y-4 overflow-y-auto pb-4',
            rail ? 'px-2' : 'space-y-5 px-3',
          )}
        >
          {groups.map((group) => (
            <div key={group.section} className="space-y-1">
              {group.section &&
                (rail ? (
                  <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" aria-hidden />
                ) : (
                  <p className="px-2.5 pb-1.5 text-[0.65rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase">
                    {group.section}
                  </p>
                ))}
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(currentPath, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={rail ? label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                      rail ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2.5',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        active
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground group-hover:text-primary',
                      )}
                    />
                    {!rail && <span className="truncate">{label}</span>}
                    {!rail && badge !== undefined && (
                      <span
                        className={cn(
                          'tabular ml-auto rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold',
                          active
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-primary-subtle text-primary-subtle-foreground',
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={cn('relative border-t border-sidebar-border/80 p-3', rail && 'px-2')}>
          <div
            className={cn(
              'flex items-center rounded-xl border border-transparent bg-card/40 p-1.5',
              rail ? 'flex-col justify-center gap-2' : 'gap-2.5',
            )}
          >
            <span
              title={rail ? userName : undefined}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/25"
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            {!rail && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{userName}</span>
                  {userEmail && (
                    <span className="block truncate text-[0.7rem] text-muted-foreground">
                      {userEmail}
                    </span>
                  )}
                </span>
                {userMenu}
              </>
            )}
            {rail && userMenu}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block print:hidden',
          collapsed ? 'w-[4.75rem]' : 'w-64',
        )}
      >
        <div className="sticky top-0 h-dvh">{sidebarContent(collapsed)}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 h-dvh md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/45 backdrop-blur-[3px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-[17rem] border-r border-sidebar-border shadow-xl">
            {sidebarContent(false)}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 print:hidden">
          <div className="relative border-b border-border/70 bg-card/90 shadow-xs backdrop-blur-xl dark:bg-card/85">
            <div className="relative flex h-16 items-center gap-2.5 px-3 sm:gap-3 sm:px-5">
              <button
                type="button"
                className="shrink-0 rounded-xl border border-border/80 bg-background p-2 text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:bg-primary-subtle hover:text-primary md:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              <button
                type="button"
                className="hidden shrink-0 rounded-xl border border-border/80 bg-background p-2 text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:bg-primary-subtle hover:text-primary md:inline-flex"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
                title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4.5" />
                ) : (
                  <PanelLeftClose className="size-4.5" />
                )}
              </button>

              {onSearch && (
                <form
                  onSubmit={submitSearch}
                  className="relative mx-auto hidden min-w-0 flex-1 sm:block max-w-lg lg:max-w-xl"
                >
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products, bills, customers…"
                    aria-label="Search"
                    className={cn(
                      'h-11 w-full rounded-2xl border bg-card/95 pr-16 pl-10 text-sm shadow-xs outline-none transition-all',
                      'placeholder:text-muted-foreground/70',
                      'border-border/80 hover:border-primary/35',
                      'focus:border-primary focus:bg-card focus:shadow-md focus:ring-[3px] focus:ring-primary/20',
                    )}
                  />
                  <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
                    {query ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setQuery('');
                          searchRef.current?.focus();
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : (
                      <kbd className="pointer-events-none hidden items-center gap-0.5 rounded-lg border border-border/80 bg-muted/70 px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground md:inline-flex">
                        <Command className="size-2.5" />K
                      </kbd>
                    )}
                  </div>
                </form>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
                {onSearch && (
                  <button
                    type="button"
                    className="inline-flex rounded-xl border border-border/80 bg-card/90 p-2 text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:bg-primary-subtle hover:text-primary sm:hidden"
                    aria-label="Open search"
                    aria-expanded={mobileSearchOpen}
                    onClick={() => setMobileSearchOpen((v) => !v)}
                  >
                    <Search className="size-4.5" />
                  </button>
                )}

                {headerAction}

                <div className="hidden h-8 w-px bg-border/70 sm:block" aria-hidden />

                <ThemeToggle />

                <div className="hidden items-center gap-2 rounded-2xl border border-border/70 bg-card/85 py-1 pr-2.5 pl-1 shadow-xs md:flex">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[7rem] truncate text-xs font-semibold lg:block">
                    {userName.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>

            {onSearch && mobileSearchOpen && (
              <form
                onSubmit={(e) => {
                  submitSearch(e);
                  setMobileSearchOpen(false);
                }}
                className="relative border-t border-border/50 px-3 pt-2.5 pb-3 sm:hidden"
              >
                <Search className="pointer-events-none absolute top-[1.35rem] left-6 size-4 text-muted-foreground" />
                <input
                  ref={mobileSearchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products, bills…"
                  aria-label="Search"
                  className="h-11 w-full rounded-2xl border border-border/80 bg-card pr-3 pl-10 text-sm shadow-xs outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"
                />
              </form>
            )}
          </div>
        </header>

        {banner}

        <main className="min-w-0 flex-1 bg-background p-4 sm:p-5 lg:p-7 print:bg-none print:p-0">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

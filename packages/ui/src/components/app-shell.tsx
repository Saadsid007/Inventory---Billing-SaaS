'use client';

import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
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
  children,
  LinkComponent: Link,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const groups = React.useMemo(() => groupNav(nav), [nav]);
  const current = nav.find((item) => isActive(currentPath, item.href));

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
  }, [currentPath]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const statusClass = {
    default: 'text-muted-foreground',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }[statusTone];

  function sidebarContent(rail: boolean) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
        {/* Soft brand wash behind the rail */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.21_258_/_0.08),transparent_55%)]"
        />

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
              onSwitchBusiness ? 'hover:border-primary/30 hover:bg-card hover:shadow-sm' : 'cursor-default',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-sm font-bold text-primary-foreground shadow-xs">
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
                        active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary',
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
              className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary-subtle text-xs font-bold text-accent-foreground ring-2 ring-background"
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
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-3 shadow-xs backdrop-blur-xl sm:px-5 print:hidden">
          <button
            type="button"
            className="-ml-1 rounded-xl border bg-card p-2 text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <button
            type="button"
            className="-ml-1 hidden rounded-xl border bg-card p-2 text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground md:block"
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

          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight md:hidden">
              {current?.label ?? businessName}
            </p>
            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-lg bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary-subtle-foreground">
                {current?.label ?? 'Dashboard'}
              </span>
              <span className="truncate text-xs text-muted-foreground">{businessName}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {banner}

        <main className="min-w-0 flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.21_258_/_0.035),transparent_50%)] p-4 sm:p-5 lg:p-7 print:bg-none print:p-0">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

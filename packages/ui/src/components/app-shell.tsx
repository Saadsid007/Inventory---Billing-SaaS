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
 *
 * ## Why the nav is grouped
 *
 * Eight flat links all look equally important, so the shopkeeper reads all
 * eight every time. Grouped into what they came to do (Billing), what they
 * sell (Catalogue) and what they only touch occasionally (Business), the eye
 * skips two thirds of the list. The groups are declared by the app via
 * `section` on each item and rendered in the order they first appear.
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
  // /app must not light up for /app/invoices, but /app/invoices should stay lit
  // on /app/invoices/new.
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

  // Read the stored preference after mount rather than during render: the
  // server has no localStorage, and guessing here would hydrate a wide sidebar
  // over a narrow one.
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

  // A shopkeeper taps a nav item on a phone; leaving the drawer open would
  // cover the page they just asked for.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  // Escape closes the drawer. Cheap, and expected by anyone using a keyboard.
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

  /**
   * `rail` collapses the sidebar to icons only. The drawer on a phone always
   * renders full width, because there is no room shortage to solve there and a
   * row of unlabelled icons is a guessing game.
   */
  function sidebarContent(rail: boolean) {
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        {/* Brand. The product name is here and nowhere else in the app, so a
            shopkeeper always knows what they are inside of. */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-sidebar-border',
            rail ? 'justify-center px-2' : 'gap-2.5 px-4',
          )}
        >
          <LogoMark className="size-7 shrink-0" />
          {!rail && <span className="text-[0.95rem] font-semibold tracking-tight">Billwise</span>}
        </div>

        <div className={cn('p-3', rail && 'px-2')}>
          <button
            type="button"
            onClick={onSwitchBusiness}
            disabled={!onSwitchBusiness}
            title={rail ? businessName : undefined}
            className={cn(
              'flex w-full items-center rounded-lg border border-sidebar-border bg-card/60 text-left transition-colors',
              rail ? 'justify-center p-1.5' : 'gap-2.5 p-2.5',
              onSwitchBusiness ? 'hover:bg-sidebar-accent' : 'cursor-default',
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-subtle text-sm font-semibold text-primary-subtle-foreground">
              {businessName.charAt(0).toUpperCase()}
            </span>
            {!rail && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{businessName}</span>
                {statusLabel && (
                  <span className={cn('block truncate text-xs', statusClass)}>{statusLabel}</span>
                )}
              </span>
            )}
          </button>
        </div>

        <nav
          className={cn(
            'flex-1 space-y-4 overflow-y-auto pb-4',
            rail ? 'px-2' : 'space-y-5 px-3',
          )}
        >
          {groups.map((group) => (
            <div key={group.section} className="space-y-1">
              {group.section &&
                (rail ? (
                  <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" aria-hidden />
                ) : (
                  <p className="px-2 pb-1 text-[0.68rem] font-semibold tracking-widest text-muted-foreground/80 uppercase">
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
                      'relative flex items-center rounded-lg text-sm transition-colors',
                      rail ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2',
                      active
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                    )}
                  >
                    {/* The active marker is a bar, not just a fill: at a glance
                        down a list of eight, a coloured edge is found faster
                        than a slightly different background. */}
                    {active && (
                      <span
                        className={cn(
                          'absolute inset-y-1.5 w-1 rounded-r-full bg-primary',
                          rail ? '-left-2' : '-left-3',
                        )}
                        aria-hidden
                      />
                    )}
                    <Icon className={cn('size-4 shrink-0', active && 'text-primary')} />
                    {!rail && <span className="truncate">{label}</span>}
                    {!rail && badge !== undefined && (
                      <span className="tabular ml-auto rounded-full bg-primary-subtle px-1.5 py-0.5 text-[0.7rem] font-medium text-primary-subtle-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={cn('border-t border-sidebar-border p-3', rail && 'px-2')}>
          <div className={cn('flex items-center', rail ? 'justify-center' : 'gap-2.5')}>
            <span
              title={rail ? userName : undefined}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            {!rail && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{userName}</span>
                  {userEmail && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  )}
                </span>
                {userMenu}
              </>
            )}
          </div>
          {rail && userMenu && <div className="mt-2 flex justify-center">{userMenu}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* `print:hidden` on the chrome: the invoice print view escapes this
          shell entirely, but somebody will eventually hit Ctrl+P on an ordinary
          screen, and a sidebar down the edge of the paper looks broken. */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block print:hidden',
          collapsed ? 'w-[4.5rem]' : 'w-60',
        )}
      >
        <div className="sticky top-0 h-dvh">{sidebarContent(collapsed)}</div>
      </aside>

      {mobileOpen && (
        // `h-dvh` as well as `inset-0`: on a mobile browser the fixed
        // containing block can end up as tall as the document, which would let
        // the drawer scroll away from the menu button that opened it.
        <div className="fixed inset-0 z-50 h-dvh md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-[16.5rem] border-r border-sidebar-border shadow-lg">
            {sidebarContent(false)}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md sm:px-5 print:hidden">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <button
            type="button"
            className="-ml-1 hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:block"
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

          {/* On a phone the sidebar is hidden, so the topbar has to answer
              "where am I?" with the current page's name, not the product's. */}
          <span className="truncate text-sm font-medium md:hidden">
            {current?.label ?? businessName}
          </span>
          <span className="hidden truncate text-sm text-muted-foreground md:inline">
            {current?.label}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {banner}

        <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6 print:p-0">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

'use client';

import { ChevronsUpDown, Menu, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';
import { ThemeToggle } from './theme';

/**
 * The authenticated app frame: sidebar, topbar, business switcher.
 *
 * Takes everything as props and renders no data of its own — routing and
 * session are the app's concern, so this stays a pure presentation component
 * that `packages/ui` is allowed to own.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type AppShellProps = {
  businessName: string;
  /** e.g. 'Trial' — rendered as a small badge beside the name. */
  statusLabel?: string | undefined;
  userName: string;
  nav: readonly NavItem[];
  currentPath: string;
  /** Rendered inside the sidebar's business button. Phase 3 makes it a real menu. */
  onSwitchBusiness?: (() => void) | undefined;
  /** Sign-out control, supplied by the app because it owns the auth action. */
  userMenu?: React.ReactNode;
  children: React.ReactNode;
  /** Link component. Passed in so this package never imports next/link. */
  LinkComponent: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
  }>;
};

function isActive(currentPath: string, href: string): boolean {
  // /app must not light up for /app/invoices, but /app/invoices should stay lit
  // on /app/invoices/new.
  return href === '/app' ? currentPath === '/app' : currentPath.startsWith(href);
}

export function AppShell({
  businessName,
  statusLabel,
  userName,
  nav,
  currentPath,
  onSwitchBusiness,
  userMenu,
  children,
  LinkComponent: Link,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // A shopkeeper taps a nav item on a phone; leaving the drawer open would
  // cover the page they just asked for.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-3">
        <button
          type="button"
          onClick={onSwitchBusiness}
          disabled={!onSwitchBusiness}
          className={cn(
            'flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors',
            onSwitchBusiness ? 'hover:bg-sidebar-accent' : 'cursor-default',
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            {businessName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{businessName}</span>
            {statusLabel && (
              <span className="block truncate text-xs text-muted-foreground">{statusLabel}</span>
            )}
          </span>
          {onSwitchBusiness && (
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
              isActive(currentPath, href)
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm text-muted-foreground">{userName}</span>
          {userMenu}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r md:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r shadow-lg">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="truncate text-sm font-medium md:hidden">{businessName}</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

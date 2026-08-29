'use client';

import { AppShell, type NavItem } from '@bahikhata/ui';
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  QrCode,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { signOutAction } from '@/app/(auth)/actions';

/**
 * Client wrapper around the design system's AppShell.
 *
 * Exists because the shell needs `usePathname()` to highlight the active nav
 * item, and because `next/link` is injected rather than imported inside
 * `@bahikhata/ui` — keeping that package free of framework dependencies.
 */

/**
 * Nav grows one phase at a time. Adding a link before its page exists just
 * gives a shopkeeper a 404 to find on their own.
 */
const NAV: readonly NavItem[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/invoices', label: 'Invoices', icon: FileText },
  { href: '/app/products', label: 'Products', icon: Package },
  { href: '/app/stock', label: 'Stock in / out', icon: PackagePlus },
  { href: '/app/parties', label: 'Parties', icon: Users },
  { href: '/app/catalog', label: 'Catalog', icon: QrCode },
  { href: '/app/reports', label: 'Reports', icon: BarChart3 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

/**
 * Shown only to super admins, and only as a shortcut — the panel guards itself.
 * Without it the only way in is to know the URL, which is a bad thing to rely
 * on for the people who run the service.
 */
const ADMIN_NAV: NavItem = { href: '/admin', label: 'Admin panel', icon: Shield };

function SignOutButton() {
  const [pending, startTransition] = React.useTransition();
  return (
    <button
      type="button"
      title="Log out"
      aria-label="Log out"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="size-4" />
    </button>
  );
}

export function AppFrame({
  businessName,
  statusLabel,
  userName,
  isSuperAdmin = false,
  children,
}: {
  businessName: string;
  statusLabel?: string | undefined;
  userName: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = isSuperAdmin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <AppShell
      businessName={businessName}
      statusLabel={statusLabel}
      userName={userName}
      nav={nav}
      currentPath={pathname}
      // Business switching is a Phase 3 feature (multi-branch). The shell
      // renders no switcher affordance until there is something to switch to.
      onSwitchBusiness={undefined}
      userMenu={<SignOutButton />}
      LinkComponent={Link}
    >
      {children}
    </AppShell>
  );
}

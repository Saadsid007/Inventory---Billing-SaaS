'use client';

import { AppShell, type NavItem } from '@bahikhata/ui';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Settings,
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
  { href: '/app/parties', label: 'Parties', icon: Users },
  { href: '/app/catalog', label: 'Catalog', icon: QrCode },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

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
  children,
}: {
  businessName: string;
  statusLabel?: string | undefined;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      businessName={businessName}
      statusLabel={statusLabel}
      userName={userName}
      nav={NAV}
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

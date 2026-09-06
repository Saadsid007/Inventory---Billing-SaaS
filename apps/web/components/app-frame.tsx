'use client';

import { AppShell, Button, type NavItem } from '@billwise/ui';
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Plus,
  QrCode,
  Settings,
  Shield,
  Undo2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { signOutAction } from '@/app/(auth)/actions';

/**
 * Client wrapper around the design system's AppShell.
 *
 * Exists because the shell needs `usePathname()` to highlight the active nav
 * item, and because `next/link` is injected rather than imported inside
 * `@billwise/ui` — keeping that package free of framework dependencies.
 */

/**
 * Nav grows one phase at a time. Adding a link before its page exists just
 * gives a shopkeeper a 404 to find on their own.
 *
 * Grouped by what someone came here to do. "Billing" is first and stays first:
 * on a normal day a shopkeeper opens this product to make a bill and closes it
 * again, and everything else is occasional.
 */
const NAV: readonly NavItem[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/invoices', label: 'Invoices', icon: FileText, section: 'Billing' },
  { href: '/app/parties', label: 'Customers', icon: Users, section: 'Billing' },
  { href: '/app/returns', label: 'Returns', icon: Undo2, section: 'Billing' },
  { href: '/app/products', label: 'Products', icon: Package, section: 'Catalogue' },
  { href: '/app/categories', label: 'Categories', icon: FolderTree, section: 'Catalogue' },
  { href: '/app/stock', label: 'Stock in / out', icon: ArrowLeftRight, section: 'Catalogue' },
  { href: '/app/catalog', label: 'Online catalog', icon: QrCode, section: 'Catalogue' },
  { href: '/app/storefront', label: 'Store Customizer', icon: Palette, section: 'Catalogue' },
  { href: '/app/reports', label: 'Reports', icon: BarChart3, section: 'Business' },
  { href: '/app/billing', label: 'Billing', icon: CreditCard, section: 'Business' },
  { href: '/app/settings', label: 'Settings', icon: Settings, section: 'Business' },
];

/**
 * Shown only to super admins, and only as a shortcut — the panel guards itself.
 * Without it the only way in is to know the URL, which is a bad thing to rely
 * on for the people who run the service.
 */
const ADMIN_NAV: NavItem = {
  href: '/admin',
  label: 'Admin panel',
  icon: Shield,
  section: 'Billwise',
};

function SignOutButton() {
  const [pending, startTransition] = React.useTransition();
  return (
    <button
      type="button"
      title="Log out"
      aria-label="Log out"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
      className="shrink-0 rounded-xl border bg-card p-2 text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="size-4" />
    </button>
  );
}

export function AppFrame({
  businessName,
  statusLabel,
  statusTone,
  userName,
  userEmail,
  isSuperAdmin = false,
  nav: navItems = NAV,
  banner,
  children,
}: {
  businessName: string;
  statusLabel?: string | undefined;
  statusTone?: 'default' | 'warning' | 'destructive' | undefined;
  userName: string;
  userEmail?: string | undefined;
  isSuperAdmin?: boolean;
  /**
   * Which set of links to show. Defaults to the shop nav.
   *
   * Passed in rather than derived here because this is a client component and
   * the business type is a server read — and because a nav that branches on a
   * type inside itself is the first step towards every component doing so.
   */
  nav?: readonly NavItem[];
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = isSuperAdmin ? [...navItems, ADMIN_NAV] : navItems;

  /**
   * Header search routes by intent:
   * - invoice-looking tokens (INV-, "bill …") → invoices
   * - phone-looking tokens → customers
   * - everything else → products (names, SKUs, barcodes)
   */
  function handleSearch(query: string) {
    const q = query.trim();
    if (!q) return;
    const encoded = encodeURIComponent(q);
    if (/^inv[-/\s]?\d*/i.test(q) || /\bbill\b/i.test(q)) {
      router.push(`/app/invoices?q=${encoded}`);
      return;
    }
    if (/^\+?\d[\d\s-]{6,}$/.test(q)) {
      router.push(`/app/parties`);
      return;
    }
    router.push(`/app/products?q=${encoded}`);
  }

  return (
    <AppShell
      businessName={businessName}
      statusLabel={statusLabel}
      statusTone={statusTone}
      userName={userName}
      userEmail={userEmail}
      nav={nav}
      currentPath={pathname}
      // Business switching is a Phase 3 feature (multi-branch). The shell
      // renders no switcher affordance until there is something to switch to.
      onSwitchBusiness={undefined}
      userMenu={<SignOutButton />}
      banner={banner}
      onSearch={handleSearch}
      headerAction={
        <Link href="/app/invoices/new" className="hidden sm:inline-flex">
          <Button size="sm" className="h-9 rounded-xl px-3 shadow-sm shadow-primary/20">
            <Plus className="size-3.5" />
            New bill
          </Button>
        </Link>
      }
      LinkComponent={Link}
    >
      {children}
    </AppShell>
  );
}

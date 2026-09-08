'use client';

import { AppShell, Button, type NavItem } from '@billwise/ui';
import { LogOut, Plus, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { signOutAction } from '@/app/(auth)/actions';
import { navFor } from './app-nav';
import { startNavProgress } from './nav-progress';

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
      // White-alpha, not `bg-card`: this button lives on the sidebar, which is
      // dark in both themes, and `card` is white in the light one.
      className="shrink-0 rounded-lg p-1.5 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground disabled:opacity-50"
    >
      <LogOut className="size-3.5" />
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
  businessType,
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
   * Which trade this is. A plain string, because that is all React can carry
   * across the server/client boundary — see app-nav.ts.
   */
  businessType?: string | undefined;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isSeva = businessType === 'jan_seva';
  const navItems = navFor(businessType);
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

    // The header search is the app's most-used navigation and none of it is a
    // link click, so the top bar has to be told by hand.
    startNavProgress();

    /*
     * A Jan Seva Kendra has none of these screens — /app/invoices and
     * /app/products now redirect it straight back to its own dashboard, so
     * searching from the header would silently do nothing. It gets its own
     * three destinations, and its default is the work register rather than a
     * product list: at that counter the thing being looked up is almost always
     * somebody's pending application.
     */
    if (isSeva) {
      if (/^\+?\d[\d\s-]{6,}$/.test(q)) {
        router.push(`/app/seva/customers`);
        return;
      }
      if (/^jsk[-/\s]?\d*/i.test(q) || /\breceipt\b/i.test(q)) {
        router.push(`/app/seva/receipts?q=${encoded}`);
        return;
      }
      router.push(`/app/seva/work?q=${encoded}`);
      return;
    }

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
        // The one button that is on every screen, so it has to lead somewhere
        // that exists for this trade — the shop's invoice form redirects a Jan
        // Seva user away, and the word "bill" is not the one they use.
        <Link
          href={isSeva ? '/app/seva/receipts/new' : '/app/invoices/new'}
          className="hidden sm:inline-flex"
        >
          <Button size="sm" className="h-9 rounded-xl px-3 shadow-sm shadow-primary/20">
            <Plus className="size-3.5" />
            {isSeva ? 'New receipt' : 'New bill'}
          </Button>
        </Link>
      }
      LinkComponent={Link}
    >
      {children}
    </AppShell>
  );
}

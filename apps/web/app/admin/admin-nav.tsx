'use client';

import { cn } from '@bahikhata/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin panel nav.
 *
 * A client component only because it needs `usePathname()` to mark the current
 * tab. Deliberately plain — this panel is used by a handful of people and does
 * not need the tenant app's shell.
 */
const TABS = [
  { href: '/admin', label: 'Businesses' },
  { href: '/admin/admins', label: 'Admins' },
  { href: '/admin/config', label: 'Site settings' },
] as const;

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <span className="text-sm font-semibold tracking-tight">Bahikhata admin</span>

        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            // `/admin` is a prefix of every other tab, so it only matches exactly.
            const active =
              tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{userName}</span>
          <Link href="/app" className="hover:text-foreground">
            Back to my business
          </Link>
        </div>
      </div>
    </header>
  );
}

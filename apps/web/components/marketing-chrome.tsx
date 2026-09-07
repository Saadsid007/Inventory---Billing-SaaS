import { FROM_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Logo, ThemeToggle } from '@billwise/ui';
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';

/**
 * Header and footer for the public marketing pages.
 *
 * Shared so `/` and `/pricing` cannot drift apart. Two nearly identical headers
 * with slightly different padding is exactly the sort of thing that makes a
 * site feel amateur, and it happens the moment they are copies.
 *
 * The header is a server component that reads the session, so someone who is
 * already logged in sees "Go to dashboard" instead of "Log in". Doing that in
 * the browser instead would flash the wrong button first, which is worse than
 * the small cost of rendering this page per request. The check is a JWT decode,
 * not a database read.
 */

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Billwise home" className={className}>
      <Logo />
    </Link>
  );
}

export async function MarketingHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/pricing"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Pricing
          </Link>
          <ThemeToggle />

          {signedIn ? (
            <Link
              href="/app"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Go to dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
              >
                Start free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

const PRODUCT_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/register', label: 'Create an account' },
  { href: '/login', label: 'Log in' },
];

export async function MarketingFooter() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <BrandMark />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              GST billing, stock and khata software for Indian shops. {TRIAL_DAYS} days free, then
              From ₹{FROM_PRICE_INR} a month, everything included.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Product
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {signedIn ? (
                <>
                  <li>
                    <Link
                      href="/app"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Go to dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Pricing
                    </Link>
                  </li>
                </>
              ) : (
                PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              What it does
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>GST and non-GST billing</li>
              <li>Stock and low-stock alerts</li>
              <li>Customer khata</li>
              <li>Online catalog with QR</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Billwise. All rights reserved.</p>
          <p>
            Powered by{' '}
            <a
              href="https://www.growthtechnos.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Growth Technos
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

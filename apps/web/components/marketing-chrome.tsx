import { ThemeToggle } from '@billwise/ui';
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
    <Link href="/" className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-xs">
        B
      </span>
      <span className="text-lg font-semibold tracking-tight">Billwise</span>
    </Link>
  );
}

export async function MarketingHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Pricing
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />

          {signedIn ? (
            <Link
              href="/app"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
            >
              <LayoutDashboard className="size-4" />
              Go to dashboard
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

export async function MarketingFooter() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <BrandMark />
          <p className="text-sm text-muted-foreground">
            Billing, stock and khata for Indian shops.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          {signedIn ? (
            <Link href="/app" className="transition-colors hover:text-foreground">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Log in
              </Link>
              <Link href="/register" className="transition-colors hover:text-foreground">
                Create an account
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}

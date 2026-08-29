import { ThemeToggle } from '@bahikhata/ui';
import Link from 'next/link';

/**
 * Header and footer for the public marketing pages.
 *
 * Shared so `/` and `/pricing` cannot drift apart — two nearly-identical
 * headers with slightly different padding is exactly the sort of thing that
 * makes a site feel amateur, and it happens the moment they are copies.
 */

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-xs">
        B
      </span>
      <span className="text-lg font-semibold tracking-tight">Bahikhata</span>
    </Link>
  );
}

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Pricing
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            href="/login"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9.5 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
          <Link href="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/register" className="transition-colors hover:text-foreground">
            Create an account
          </Link>
        </nav>
      </div>
    </footer>
  );
}

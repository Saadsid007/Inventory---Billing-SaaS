import type { Metadata } from 'next';

/**
 * Admin shell.
 *
 * Deliberately outside the tenant app frame: an admin is not acting as a
 * business, and rendering a business sidebar around this page would blur
 * exactly the line spec §6 draws.
 *
 * No `<ThemeScript />` here. The root layout already puts it in <head>, and a
 * second copy inside <body> is re-rendered on every client navigation — which
 * React 19 rejects ("scripts inside React components are never executed when
 * rendering on the client") and logs as an error.
 */
/** Nothing behind a login should ever be indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}

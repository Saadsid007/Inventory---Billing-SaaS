import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The print view escapes the app shell.
 *
 * It lives outside the `(dashboard)` route group for exactly this reason. Route
 * groups do not stop layouts nesting: a page under `(dashboard)` gets the
 * sidebar and topbar wrapped around it no matter what its own layout says, and
 * that chrome then eats the width of the paper and can print alongside the
 * bill. Moving the segment out is the only way to genuinely render bare.
 *
 * The URL is unchanged. `(dashboard)` contributes nothing to the path, so this
 * is still /app/invoices/[id]/print.
 *
 * No `requireBusiness()` here either, for the same reason it is not relied on
 * anywhere else: the page calls the guard itself.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white text-black">{children}</div>;
}

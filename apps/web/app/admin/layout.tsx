import { ThemeScript } from '@bahikhata/ui';

/**
 * Admin shell.
 *
 * Deliberately outside the tenant app frame: an admin is not acting as a
 * business, and rendering a business sidebar around this page would blur
 * exactly the line spec §6 draws.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <ThemeScript />
      {children}
    </div>
  );
}

import { requireSuperAdmin } from '@/lib/auth/require-business';
import { AdminNav } from '../admin-nav';

/**
 * The guarded half of /admin.
 *
 * `/admin/login` sits outside this route group on purpose: it is the way IN to
 * the panel, so it cannot be behind the guard that sends non-admins to /app.
 *
 * The guard here is convenience, not the control. Every page re-checks it, and
 * so does every server action — a layout does not run on a POST.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();

  return (
    <>
      <AdminNav userName={admin.name || admin.email} />
      {children}
    </>
  );
}

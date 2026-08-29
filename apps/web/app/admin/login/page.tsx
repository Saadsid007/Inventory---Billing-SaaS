import { findUserById } from '@bahikhata/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bahikhata/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/app/(auth)/login/login-form';
import { auth } from '@/auth';

export const metadata: Metadata = { title: 'Admin login' };

/**
 * The way in to /admin.
 *
 * Sits outside the (panel) route group, and is listed in PUBLIC_PREFIXES, so it
 * is reachable without a session — otherwise the proxy would bounce an admin to
 * the ordinary /login and drop the fact that they were heading for the panel.
 *
 * It is the same credentials form as /login. There is no separate admin
 * password: a second set of credentials for the same person is one more thing
 * to leak, and the flag on the user row is what actually grants the access.
 */
export default async function AdminLoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    // Read live, not from the token — the same reason `requireSuperAdmin` does.
    const live = await findUserById(session.user.id);
    if (live?.isSuperAdmin) {
      redirect('/admin');
    }

    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not an admin account</CardTitle>
            <CardDescription>
              You are logged in as {session.user.email}, which does not have admin access.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            If this should be an admin, ask an existing admin to add this email under Admins.{' '}
            <Link href="/app" className="font-medium text-primary hover:underline">
              Back to your business
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Admin login</CardTitle>
            <CardDescription>Log in with your Bahikhata account.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm next="/admin" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

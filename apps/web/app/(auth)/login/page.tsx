import { TRIAL_DAYS } from '@billwise/shared';
import { Alert } from '@billwise/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Login' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ended?: string }>;
}) {
  const { next, ended } = await searchParams;

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Log in to carry on billing where you left off.
        </p>
      </div>

      {/* Set by /session-ended. Without a word here, being logged out mid-work
          looks like the app threw you out for no reason. */}
      {ended === '1' && (
        <Alert variant="info" title="You were signed out">
          Your session pointed to an account that is no longer there. Please log in again.
        </Alert>
      )}

      <LoginForm next={next} />

      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>. It is free for {TRIAL_DAYS} days.
      </p>
    </div>
  );
}

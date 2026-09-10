import { TRIAL_DAYS } from '@billwise/shared';
import { Alert, Card } from '@billwise/ui';
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
    <div className="space-y-6 py-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
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

      {/* Same treatment as signup: heading outside, form inside a card that
          disappears on a phone, where the screen is already the card. */}
      <Card className="border-0 bg-transparent p-0 shadow-none sm:border sm:bg-card sm:p-7 sm:shadow-sm">
        <LoginForm next={next} />
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>. It is free for {TRIAL_DAYS} days.
      </p>
    </div>
  );
}

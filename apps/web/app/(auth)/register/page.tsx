import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Badge } from '@billwise/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <div className="space-y-7 py-6">
      <div className="space-y-2.5">
        <Badge variant="subtle">{TRIAL_DAYS} days free</Badge>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No card, and nothing to wait for — you can make your first bill in a minute. ₹
          {MONTHLY_PRICE_INR} a month after the trial, only if you want to carry on.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

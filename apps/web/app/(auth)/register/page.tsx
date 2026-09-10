import { FROM_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Badge, Card } from '@billwise/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Register' };

/**
 * Signup.
 *
 * The heading sits outside the card and the form inside it. That is deliberate:
 * the card is the thing you are being asked to fill in, and giving it an edge
 * makes it read as one contained task rather than as a column of controls
 * running off the page. The border disappears below `sm`, where a phone screen
 * is already the card.
 */
export default function RegisterPage() {
  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2.5">
        <Badge variant="subtle">{TRIAL_DAYS} days free</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create your account</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No card, and nothing to wait for. You can make your first bill in a minute. From ₹
          {FROM_PRICE_INR} a month after the trial, only if you want to carry on.
        </p>
      </div>

      <Card className="border-0 bg-transparent p-0 shadow-none sm:border sm:bg-card sm:p-7 sm:shadow-sm">
        <RegisterForm />
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

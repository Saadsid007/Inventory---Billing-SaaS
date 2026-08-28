import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@bahikhata/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Free for {TRIAL_DAYS} days — no card, no waiting for approval. ₹{MONTHLY_PRICE_INR} a
          month after that.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}

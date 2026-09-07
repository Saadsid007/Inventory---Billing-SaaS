import { listPlans } from '@billwise/db';
import { Alert, PageBody, PageHeader } from '@billwise/ui';
import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/require-business';
import { PlanEditor } from './plan-editor';

export const metadata: Metadata = { title: 'Plans and pricing' };

/**
 * What Billwise charges, per kind of business.
 *
 * Every vertical that exists in code appears here, including one that has never
 * been priced — those show their code-level default and become a real row the
 * first time somebody saves. So adding a business type is a deploy plus a form,
 * never a migration written by hand at the point of sale.
 *
 * What is deliberately absent: any way to price one shop differently from
 * another. See packages/db/src/schema/plans.ts.
 */
export default async function AdminPricingPage() {
  await requireSuperAdmin();
  const plans = await listPlans();

  return (
    <PageBody className="mx-auto max-w-3xl p-6 sm:p-8">
      <PageHeader
        title="Plans and pricing"
        description="One plan per kind of business. Changes apply everywhere the moment you save."
      />

      <Alert variant="info" icon={Info} title="Who this affects">
        Changing a price does not re-bill anyone. Businesses already paid keep the month they
        bought; the new amount applies to the next payment anybody starts. Changing the trial
        length affects new signups only.
      </Alert>

      <div className="space-y-5">
        {plans.map((plan) => (
          <PlanEditor key={plan.businessType} plan={plan} />
        ))}
      </div>
    </PageBody>
  );
}

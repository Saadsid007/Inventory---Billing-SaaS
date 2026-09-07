import { listSevaServices } from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { ServicesView } from './services-view';

export const metadata: Metadata = { title: 'Services & rates' };

export default async function SevaServicesPage() {
  const ctx = await requireBusiness();
  const services = await listSevaServices(ctx, { includeInactive: true });

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Services & rates"
        description="The work you do and what you charge for it. Enter the government fee separately, so you can see what you actually earn."
      />
      <ServicesView services={services} />
    </PageBody>
  );
}

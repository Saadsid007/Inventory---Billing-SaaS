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
        description="Aap kya kaam karte hain aur kitna lete hain. Sarkari fees alag likhiye — usse pata chalta hai ki aapki apni kamai kitni hai."
      />
      <ServicesView services={services} />
    </PageBody>
  );
}

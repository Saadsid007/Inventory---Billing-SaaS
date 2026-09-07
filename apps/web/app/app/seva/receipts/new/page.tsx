import { listParties, listSevaServices } from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { ReceiptForm } from './receipt-form';

export const metadata: Metadata = { title: 'New receipt' };

export default async function NewReceiptPage() {
  const ctx = await requireBusiness();

  const [services, parties] = await Promise.all([
    listSevaServices(ctx),
    listParties(ctx, { type: 'customer', limit: 500 }),
  ]);

  return (
    <PageBody className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        breadcrumb={
          <Link
            href="/app/seva/receipts"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All receipts
          </Link>
        }
        title="New receipt"
        description="Kaam chuniye, paisa likhiye, ho gaya."
      />
      <ReceiptForm
        services={services}
        parties={parties.map((p) => ({ id: p.id, name: p.name, phone: p.phone }))}
      />
    </PageBody>
  );
}

import { listPartyBalances } from '@billwise/db';
import { PageBody, PageHeader } from '@billwise/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { CustomerDialog } from './customer-dialog';
import { CustomersView } from './customers-view';

export const metadata: Metadata = { title: 'Customers' };

/**
 * Customers for Seva counter.
 *
 * Provides a clean overview of customer balances, contact details, quick creation,
 * and direct links to full customer detail profile pages.
 */
export default async function SevaCustomersPage() {
  const ctx = await requireBusiness();
  const rows = await listPartyBalances(ctx);

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Customers"
        description="Who owes you money, the number to ring them on, and direct customer profile history."
        actions={<CustomerDialog trigger="button" />}
      />

      <CustomersView rows={rows} />
    </PageBody>
  );
}

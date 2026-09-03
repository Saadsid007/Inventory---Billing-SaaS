import { listSalesReturns } from '@billwise/db';
import {
  Alert,
  EmptyState,
  PageBody,
  PageHeader,
  StatCard,
} from '@billwise/ui';
import { IndianRupee, Info, Undo2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { ReturnsView } from './returns-view';

export const metadata: Metadata = { title: 'Returns' };

export default async function ReturnsPage() {
  const ctx = await requireBusiness();
  const returns = await listSalesReturns(ctx);

  const total = returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const items = returns.reduce((sum, r) => sum + Number(r.qtyTotal), 0);

  return (
    <PageBody>
      <PageHeader
        title="Returns"
        description="Goods customers brought back. Recorded against the bill they were sold on."
      />

      {returns.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Credited back"
            value={`₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            hint={`${returns.length} ${returns.length === 1 ? 'return' : 'returns'}`}
            icon={IndianRupee}
            tone="warning"
          />
          <StatCard
            label="Items returned"
            value={String(items)}
            hint="Total quantity across all returns"
            icon={Undo2}
          />
        </div>
      )}

      {returns.length === 0 ? (
        <EmptyState
          icon={Undo2}
          title="Nothing has come back yet"
          description="To record a return, open the bill it was sold on and use Record a return. Stock goes back up and the customer owes that much less."
        />
      ) : (
        <ReturnsView returns={returns} />
      )}

      <Alert variant="info" icon={Info} title="This is a record, not a GST credit note">
        It puts stock back and reduces what the customer owes.{' '}
        <Link href="/app/reports" className="font-medium underline underline-offset-4">
          Your reports
        </Link>{' '}
        show it too. A numbered credit note for GSTR-1 is a separate document and is still to
        come.
      </Alert>
    </PageBody>
  );
}

import { listSalesReturns } from '@billwise/db';
import {
  Alert,
  EmptyState,
  PageBody,
  PageHeader,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { Info, IndianRupee, Undo2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Returns' };

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

/**
 * The returns register.
 *
 * Returns are recorded on the bill they came from, so this page lists rather
 * than creates. It is the answer to "what came back this month", which is a
 * question about the shop, not about one customer.
 */
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
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Customer</TH>
              <TH>Against bill</TH>
              <TH>Product name</TH>
              <TH>Reason</TH>
              <TH numeric>Quantity</TH>
              <TH numeric>Credited</TH>
            </TR>
          </THead>
          <TBody>
            {returns.map((r) => (
              <TR key={r.id}>
                <TD className="tabular whitespace-nowrap">{shortDate(r.returnDate)}</TD>
                <TD>{r.partyName ?? 'Walk-in'}</TD>
                <TD className="tabular text-muted-foreground">{r.invoiceNo ?? '-'}</TD>
                <TD className="font-medium text-foreground">
                  <span>{r.productNames ?? '-'}</span>
                  {r.itemCount > 1 && (
                    <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                      ({r.itemCount} items)
                    </span>
                  )}
                </TD>
                <TD className="text-muted-foreground">{r.reason ?? '-'}</TD>
                <TD numeric>{r.qtyTotal}</TD>
                <TD numeric className="font-medium">
                  ₹{r.totalAmount}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
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

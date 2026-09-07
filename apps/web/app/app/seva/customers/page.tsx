import { listPartyBalances } from '@billwise/db';
import {
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
  tableLinkClass,
} from '@billwise/ui';
import { Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Customers' };

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/**
 * Customers, for a counter.
 *
 * The shop's version carries opening balance, invoiced, received, paid out and
 * returned. A CSC needs two of those: who owes money, and what number to ring.
 * The rest is a column somebody has to read past.
 *
 * Debtors sort to the top, because that is the only reason this page gets
 * opened.
 */
export default async function SevaCustomersPage() {
  const ctx = await requireBusiness();
  const rows = await listPartyBalances(ctx);

  const owing = rows.filter((r) => Number(r.outstanding) > 0);
  const total = owing.reduce((sum, r) => sum + Number(r.outstanding), 0);

  return (
    <PageBody className="space-y-5">
      <PageHeader
        title="Customers"
        description="Who owes you money, and the number to ring them on."
      />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <StatCard
          label="Total outstanding"
          value={inr(total.toFixed(2))}
          hint={`Across ${owing.length} ${owing.length === 1 ? 'customer' : 'customers'}`}
          icon={Wallet}
          tone={total > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Customers"
          value={String(rows.length)}
          hint="Everyone on your records"
          icon={Users}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add a name and mobile number while making a receipt, and the customer appears here on their own."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Mobile</TH>
              <TH numeric>Billed</TH>
              <TH numeric>Received</TH>
              <TH numeric>Outstanding</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.partyId}>
                <TD>
                  <Link href={`/app/seva/customers/${row.partyId}`} className={tableLinkClass}>
                    {row.name}
                  </Link>
                </TD>
                <TD className="tabular text-muted-foreground">{row.phone ?? '—'}</TD>
                <TD numeric>{inr(row.invoicedTotal)}</TD>
                <TD numeric className="text-muted-foreground">
                  {inr(row.paidIn)}
                </TD>
                <TD
                  numeric
                  className={
                    Number(row.outstanding) > 0
                      ? 'font-medium text-warning'
                      : 'text-muted-foreground'
                  }
                >
                  {Number(row.outstanding) > 0 ? inr(row.outstanding) : 'Settled'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </PageBody>
  );
}

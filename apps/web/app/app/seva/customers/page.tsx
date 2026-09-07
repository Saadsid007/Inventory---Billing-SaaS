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
        description="Kiska paisa baaki hai, aur kis number pe call karna hai."
      />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <StatCard
          label="Kul baaki"
          value={inr(total.toFixed(2))}
          hint={`${owing.length} ${owing.length === 1 ? 'customer' : 'customers'} se`}
          icon={Wallet}
          tone={total > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Customers"
          value={String(rows.length)}
          hint="Jo bhi aapke record me hain"
          icon={Users}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Abhi koi customer nahi"
          description="Receipt banate waqt naam aur mobile daaliye — customer khud yahan aa jaayega."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Naam</TH>
              <TH>Mobile</TH>
              <TH numeric>Kul kaam</TH>
              <TH numeric>Mila</TH>
              <TH numeric>Baaki</TH>
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

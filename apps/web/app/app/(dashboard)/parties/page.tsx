import { listPartyBalances } from '@billwise/db';
import {
  Badge,
  Button,
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
import { UserPlus, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Parties' };

export default async function PartiesPage() {
  const ctx = await requireBusiness();
  const balances = await listPartyBalances(ctx);

  // Summed in JS only for display; each figure was already computed in Postgres
  // numeric. Two decimals in, two decimals out, so this cannot drift visibly.
  const totalOwed = balances
    .filter((b) => Number(b.outstanding) > 0)
    .reduce((a, b) => a + Number(b.outstanding), 0);

  return (
    <PageBody>
      <PageHeader
        title="Customers and suppliers"
        description="Everyone you bill or buy from, and exactly who still owes you money."
        actions={
          <Link href="/app/parties/new">
            <Button>
              <UserPlus /> Add contact
            </Button>
          </Link>
        }
      />

      {balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Total outstanding"
            value={`₹${totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            hint={`Across ${balances.filter((b) => Number(b.outstanding) > 0).length} of ${balances.length} contacts`}
            icon={Wallet}
            tone={totalOwed > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="Contacts"
            value={String(balances.length)}
            hint="Customers and suppliers together"
            icon={Users}
          />
        </div>
      )}

      {balances.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add the customers you bill and the suppliers you buy from. A walk-in cash sale does not need one. This is for the people whose khata you keep."
          action={
            <Link href="/app/parties/new">
              <Button>
                <UserPlus /> Add your first contact
              </Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Phone</TH>
              <TH numeric>Invoiced</TH>
              <TH numeric>Received</TH>
              <TH numeric>Outstanding</TH>
            </TR>
          </THead>
          <TBody>
            {balances.map((b) => {
              const outstanding = Number(b.outstanding);
              return (
                <TR key={b.partyId}>
                  <TD>
                    <Link
                      href={`/app/parties/${b.partyId}`}
                      className="font-medium underline-offset-4 hover:text-primary hover:underline"
                    >
                      {b.name}
                    </Link>
                  </TD>
                  <TD className="tabular text-muted-foreground">{b.phone ?? '-'}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.invoicedTotal}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.paidIn}</TD>
                  <TD numeric>
                    {outstanding > 0 ? (
                      <span className="font-semibold text-warning">₹{b.outstanding}</span>
                    ) : outstanding < 0 ? (
                      /* Negative means the business owes them — an advance. */
                      <Badge variant="secondary">₹{b.outstanding} advance</Badge>
                    ) : (
                      <span className="text-muted-foreground">Settled</span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </PageBody>
  );
}

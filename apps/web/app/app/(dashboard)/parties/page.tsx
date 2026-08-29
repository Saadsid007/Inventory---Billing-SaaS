import { listPartyBalances } from '@bahikhata/db';
import { Badge, EmptyState, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
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
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parties</h1>
          <p className="text-sm text-muted-foreground">
            Customers and suppliers, and who owes what.
          </p>
        </div>
        <Link
          href="/app/parties/new"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add contact
        </Link>
      </header>

      {balances.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Total outstanding</p>
          <p className="tabular mt-1 text-2xl font-semibold">₹{totalOwed.toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {balances.filter((b) => Number(b.outstanding) > 0).length} of{' '}
            {balances.length} contacts.
          </p>
        </div>
      )}

      {balances.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add the customers you bill and the suppliers you buy from. You can also create a customer inline while making an invoice."
          action={
            <Link
              href="/app/parties/new"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add your first contact
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
                      className="font-medium hover:underline"
                    >
                      {b.name}
                    </Link>
                  </TD>
                  <TD className="tabular text-muted-foreground">{b.phone ?? '—'}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.invoicedTotal}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.paidIn}</TD>
                  <TD numeric>
                    {outstanding > 0 ? (
                      <span className="font-medium">₹{b.outstanding}</span>
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
    </div>
  );
}

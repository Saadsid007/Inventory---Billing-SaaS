import {
  getSalesSummary,
  getStockSummary,
  getTaxSummary,
  listPartyBalances,
} from '@bahikhata/db';
import { todayInIndia } from '@bahikhata/core';
import { Badge, EmptyState, TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { DateRangePicker } from './date-range';
import { ExportButtons } from './export-buttons';

export const metadata: Metadata = { title: 'Reports' };

const inr = (v: string) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/** Default range: the current month to date. */
function defaultRange() {
  const today = todayInIndia();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireBusiness();
  const sp = await searchParams;
  const fallback = defaultRange();
  const range = { from: sp.from || fallback.from, to: sp.to || fallback.to };

  const [sales, tax, stock, balances] = await Promise.all([
    getSalesSummary(ctx, range),
    getTaxSummary(ctx, range),
    getStockSummary(ctx),
    listPartyBalances(ctx),
  ]);

  const totals = sales.reduce(
    (a, r) => ({
      invoices: a.invoices + r.invoiceCount,
      taxable: a.taxable + Number(r.taxableValue),
      tax: a.tax + Number(r.taxTotal),
      grand: a.grand + Number(r.grandTotal),
    }),
    { invoices: 0, taxable: 0, tax: 0, grand: 0 },
  );

  const stockValue = stock.reduce((a, r) => a + Number(r.stockValue), 0);
  const owed = balances.filter((b) => Number(b.outstanding) > 0);
  const owedTotal = owed.reduce((a, b) => a + Number(b.outstanding), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Sales, stock and outstanding — and the CSVs your accountant will ask for.
          </p>
        </div>
        <ExportButtons />
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium">Sales</h2>
          <DateRangePicker initial={range} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Figure label="Invoices" value={String(totals.invoices)} />
          <Figure label="Taxable value" value={inr(totals.taxable.toFixed(2))} />
          <Figure label="Tax collected" value={inr(totals.tax.toFixed(2))} />
          <Figure label="Total sales" value={inr(totals.grand.toFixed(2))} />
        </div>

        {sales.length === 0 ? (
          <EmptyState
            title="No sales in this range"
            description="Try a wider date range."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH numeric>Invoices</TH>
                <TH numeric>Taxable</TH>
                <TH numeric>Tax</TH>
                <TH numeric>Total</TH>
              </TR>
            </THead>
            <TBody>
              {sales.map((r) => (
                <TR key={r.date}>
                  <TD className="tabular">{r.date}</TD>
                  <TD numeric>{r.invoiceCount}</TD>
                  <TD numeric>₹{r.taxableValue}</TD>
                  <TD numeric>₹{r.taxTotal}</TD>
                  <TD numeric className="font-medium">
                    ₹{r.grandTotal}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      {tax.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-medium">Tax by rate</h2>
            <p className="text-sm text-muted-foreground">
              What a CA asks for at year end, and the basis of the GSTR-1 HSN summary.
            </p>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Rate</TH>
                <TH numeric>Taxable value</TH>
                <TH numeric>CGST</TH>
                <TH numeric>SGST</TH>
                <TH numeric>IGST</TH>
                <TH numeric>Cess</TH>
              </TR>
            </THead>
            <TBody>
              {tax.map((r) => (
                <TR key={r.taxRate}>
                  <TD className="tabular">{r.taxRate}%</TD>
                  <TD numeric>₹{r.taxableValue}</TD>
                  <TD numeric>₹{r.cgst}</TD>
                  <TD numeric>₹{r.sgst}</TD>
                  <TD numeric>₹{r.igst}</TD>
                  <TD numeric>₹{r.cess}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium">Stock</h2>
          <p className="tabular text-sm text-muted-foreground">
            Value at sale price: <span className="font-medium">{inr(stockValue.toFixed(2))}</span>
          </p>
        </div>
        {stock.length === 0 ? (
          <EmptyState title="Nothing tracked yet" description="Products with inventory tracking on will appear here." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH numeric>In stock</TH>
                <TH numeric>Alert at</TH>
                <TH numeric>Value</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {stock.slice(0, 50).map((r) => (
                <TR key={r.productId}>
                  <TD>
                    {r.name}
                    {r.sku && <span className="ml-2 text-xs text-muted-foreground">{r.sku}</span>}
                  </TD>
                  <TD numeric>
                    {r.currentStock}
                    {r.unit && <span className="ml-1 text-xs text-muted-foreground">{r.unit}</span>}
                  </TD>
                  <TD numeric className="text-muted-foreground">{r.lowStockAlert ?? '—'}</TD>
                  <TD numeric>₹{r.stockValue}</TD>
                  <TD>{r.isLow && <Badge variant="warning">Low</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium">Outstanding by party</h2>
          <p className="tabular text-sm text-muted-foreground">
            Total: <span className="font-medium">{inr(owedTotal.toFixed(2))}</span>
          </p>
        </div>
        {owed.length === 0 ? (
          <EmptyState title="Nobody owes you anything" description="Everything is settled up." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Party</TH>
                <TH>Phone</TH>
                <TH numeric>Invoiced</TH>
                <TH numeric>Received</TH>
                <TH numeric>Outstanding</TH>
              </TR>
            </THead>
            <TBody>
              {owed.map((b) => (
                <TR key={b.partyId}>
                  <TD>{b.name}</TD>
                  <TD className="tabular text-muted-foreground">{b.phone ?? '—'}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.invoicedTotal}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.paidIn}</TD>
                  <TD numeric className="font-medium">₹{b.outstanding}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

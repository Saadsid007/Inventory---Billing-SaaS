import {
  getReturnsSummary,
  getSalesSummary,
  getStockSummary,
  getTaxSummary,
  listPartyBalances,
} from '@billwise/db';
import { todayInIndia } from '@billwise/core';
import {
  Badge,
  EmptyState,
  PageBody,
  PageHeader,
  Section,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import {
  CheckCircle2,
  Package,
} from 'lucide-react';
import type { Metadata } from 'next';
import { requireBusiness } from '@/lib/auth/require-business';
import { DateRangePicker } from './date-range';
import { ExportButtons } from './export-buttons';
import { SalesReportsTabs } from './sales-reports-tabs';

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

  const [sales, tax, stock, balances, returns] = await Promise.all([
    getSalesSummary(ctx, range),
    getTaxSummary(ctx, range),
    getStockSummary(ctx),
    listPartyBalances(ctx),
    getReturnsSummary(ctx, range),
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

  const returnTotals = returns.reduce(
    (a, r) => ({
      count: a.count + r.returnCount,
      taxable: a.taxable + Number(r.taxableValue),
      tax: a.tax + Number(r.taxTotal),
      grand: a.grand + Number(r.grandTotal),
    }),
    { count: 0, taxable: 0, tax: 0, grand: 0 },
  );

  /**
   * Net of returns, which is the figure an accountant actually books.
   *
   * Gross sales on its own overstates the month by whatever came back, and
   * subtracting it by hand from two separate reports is where mistakes get
   * made.
   */
  const net = {
    taxable: totals.taxable - returnTotals.taxable,
    tax: totals.tax - returnTotals.tax,
    grand: totals.grand - returnTotals.grand,
  };

  const stockValue = stock.reduce((a, r) => a + Number(r.stockValue), 0);
  const owed = balances.filter((b) => Number(b.outstanding) > 0);
  const owedTotal = owed.reduce((a, b) => a + Number(b.outstanding), 0);

  return (
    <PageBody className="space-y-10">
      <PageHeader
        title="Reports"
        description="Sales, tax, stock and outstanding, plus the CSVs your accountant will ask for."
        actions={<ExportButtons />}
      />

      <SalesReportsTabs
        sales={sales}
        totals={totals}
        returns={returns}
        returnTotals={returnTotals}
        net={net}
        dateRangePicker={<DateRangePicker initial={range} />}
      />

      {tax.length > 0 && (
        <Section
          title="Tax by rate"
          description="What a CA asks for at year end, and the basis of the GSTR-1 HSN summary."
        >
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
        </Section>
      )}

      <Section
        title="Stock"
        actions={
          <p className="tabular text-sm text-muted-foreground">
            Value at sale price:{' '}
            <span className="font-semibold text-foreground">{inr(stockValue.toFixed(2))}</span>
          </p>
        }
      >
        {stock.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nothing tracked yet"
            description="Products with inventory tracking switched on will appear here."
          />
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
                  <TD numeric className="text-muted-foreground">{r.lowStockAlert ?? '-'}</TD>
                  <TD numeric>₹{r.stockValue}</TD>
                  <TD>
                    {r.isLow && (
                      <Badge variant="warning" dot>
                        Low
                      </Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Section>

      <Section
        title="Outstanding by customer"
        actions={
          <p className="tabular text-sm text-muted-foreground">
            Total:{' '}
            <span className="font-semibold text-foreground">{inr(owedTotal.toFixed(2))}</span>
          </p>
        }
      >
        {owed.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nobody owes you anything"
            description="Every bill you have issued has been paid in full."
          />
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
                  <TD className="tabular text-muted-foreground">{b.phone ?? '-'}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.invoicedTotal}</TD>
                  <TD numeric className="text-muted-foreground">₹{b.paidIn}</TD>
                  <TD numeric className="font-semibold text-warning">₹{b.outstanding}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Section>
    </PageBody>
  );
}

import {
  getStockSummary,
  listInvoices,
  listPartyBalances,
  listProducts,
} from '@billwise/db';
import { requireBusiness } from '@/lib/auth/require-business';
import { csvResponse, datedFilename, toCsv, type CsvColumn } from '@/lib/csv';

/**
 * CSV export. Build spec Phase 1g.
 *
 * A thin route handler (spec §2.5 hard rule 4): authorise, call a repository,
 * format. `requireBusiness()` runs here too — a GET that streams a shop's
 * entire product list is exactly the kind of endpoint that must not rely on a
 * layout guard.
 */

const EXPORTS = ['products', 'parties', 'invoices', 'stock'] as const;
type ExportKind = (typeof EXPORTS)[number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const ctx = await requireBusiness();
  const { kind } = await params;

  if (!EXPORTS.includes(kind as ExportKind)) {
    return new Response('Unknown export', { status: 404 });
  }

  switch (kind as ExportKind) {
    case 'products': {
      const rows = await listProducts(ctx, { limit: 5000, includeInactive: true });
      const columns: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Name', value: (r) => r.name },
        { header: 'SKU', value: (r) => r.sku },
        { header: 'Barcode', value: (r) => r.barcode },
        { header: 'Category', value: (r) => r.categoryName },
        { header: 'Unit', value: (r) => r.unitShortName },
        { header: 'HSN', value: (r) => r.hsnCode },
        { header: 'GST %', value: (r) => r.taxRate },
        { header: 'Sale price', value: (r) => r.salePrice },
        // listProducts already blanks this for staff, so the export inherits
        // the same rule rather than restating it.
        { header: 'Purchase price', value: (r) => r.purchasePrice },
        { header: 'Current stock', value: (r) => r.currentStock },
        { header: 'Low stock alert', value: (r) => r.lowStockAlert },
        { header: 'Active', value: (r) => (r.isActive ? 'Yes' : 'No') },
        { header: 'On catalog', value: (r) => (r.showInCatalog ? 'Yes' : 'No') },
      ];
      return csvResponse(datedFilename('products'), toCsv(rows, columns));
    }

    case 'parties': {
      const rows = await listPartyBalances(ctx);
      const columns: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Name', value: (r) => r.name },
        { header: 'Phone', value: (r) => r.phone },
        { header: 'Opening balance', value: (r) => r.openingBalance },
        { header: 'Invoiced', value: (r) => r.invoicedTotal },
        { header: 'Received', value: (r) => r.paidIn },
        { header: 'Paid out', value: (r) => r.paidOut },
        { header: 'Outstanding', value: (r) => r.outstanding },
      ];
      return csvResponse(datedFilename('outstanding'), toCsv(rows, columns));
    }

    case 'invoices': {
      const rows = await listInvoices(ctx, { limit: 5000 });
      const columns: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Number', value: (r) => r.invoiceNo },
        { header: 'Date', value: (r) => r.invoiceDate },
        { header: 'Type', value: (r) => r.kind },
        { header: 'Status', value: (r) => r.status },
        { header: 'Customer', value: (r) => r.partyName },
        { header: 'Total', value: (r) => r.grandTotal },
        { header: 'Paid', value: (r) => r.amountPaid },
        { header: 'Payment status', value: (r) => r.paymentStatus },
        { header: 'Due date', value: (r) => r.dueDate },
      ];
      return csvResponse(datedFilename('invoices'), toCsv(rows, columns));
    }

    case 'stock': {
      const rows = await getStockSummary(ctx);
      const columns: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Product', value: (r) => r.name },
        { header: 'SKU', value: (r) => r.sku },
        { header: 'Unit', value: (r) => r.unit },
        { header: 'Current stock', value: (r) => r.currentStock },
        { header: 'Low stock alert', value: (r) => r.lowStockAlert },
        { header: 'Sale price', value: (r) => r.salePrice },
        { header: 'Stock value at sale price', value: (r) => r.stockValue },
        { header: 'Low', value: (r) => (r.isLow ? 'Yes' : 'No') },
      ];
      return csvResponse(datedFilename('stock'), toCsv(rows, columns));
    }
  }
}

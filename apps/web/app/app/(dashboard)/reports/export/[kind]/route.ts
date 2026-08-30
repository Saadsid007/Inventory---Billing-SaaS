import {
  getStockSummary,
  listInvoices,
  listPartyBalances,
  listProducts,
  listReturnLinesForExport,
} from '@billwise/db';
import { INVOICE_KIND_LABELS } from '@billwise/shared';
import { requireBusiness } from '@/lib/auth/require-business';
import { csvResponse, datedFilename, indianDate, toCsv, type CsvColumn } from '@/lib/csv';

/**
 * CSV export. Build spec Phase 1g.
 *
 * A thin route handler (spec §2.5 hard rule 4): authorise, call a repository,
 * format. `requireBusiness()` runs here too — a GET that streams a shop's
 * entire product list is exactly the kind of endpoint that must not rely on a
 * layout guard.
 */

const EXPORTS = ['products', 'parties', 'invoices', 'stock', 'returns'] as const;
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
        // Text, both of them: Excel strips the leading zeros off 001 and turns
        // a date into a serial that shows as ######## in a narrow column.
        { header: 'Number', value: (r) => r.invoiceNo, text: true },
        { header: 'Date', value: (r) => indianDate(r.invoiceDate), text: true },
        { header: 'Type', value: (r) => INVOICE_KIND_LABELS[r.kind] },
        { header: 'Status', value: (r) => r.status },
        { header: 'Customer', value: (r) => r.partyName },
        { header: 'Total', value: (r) => r.grandTotal },
        { header: 'Paid', value: (r) => r.amountPaid },
        { header: 'Payment status', value: (r) => r.paymentStatus },
        { header: 'Due date', value: (r) => indianDate(r.dueDate), text: true },
      ];
      return csvResponse(datedFilename('invoices'), toCsv(rows, columns));
    }

    /**
     * Returns, one row per item, laid out like the sales-return files a CA
     * already reconciles from: HSN, rate, taxable value and the tax split, with
     * both the return date and the date of the bill it came off.
     *
     * Summary totals are no use here. Net taxable sales is worked out line by
     * line, and a return that cannot be matched to an HSN and a rate cannot be
     * subtracted from anything.
     */
    case 'returns': {
      const rows = await listReturnLinesForExport(ctx);
      const columns: CsvColumn<(typeof rows)[number]>[] = [
        { header: 'Return date', value: (r) => indianDate(r.returnDate), text: true },
        { header: 'Invoice no', value: (r) => r.invoiceNo, text: true },
        { header: 'Invoice date', value: (r) => indianDate(r.invoiceDate), text: true },
        { header: 'Customer', value: (r) => r.partyName },
        { header: 'Customer GSTIN', value: (r) => r.partyGstin, text: true },
        { header: 'Place of supply', value: (r) => r.placeOfSupply, text: true },
        { header: 'Supply type', value: (r) => (r.isInterstate ? 'Interstate' : 'Intrastate') },
        { header: 'Item', value: (r) => r.itemName },
        { header: 'HSN', value: (r) => r.hsnCode, text: true },
        { header: 'Quantity', value: (r) => r.qty },
        { header: 'Rate', value: (r) => r.rate },
        { header: 'GST %', value: (r) => r.taxRate },
        { header: 'Taxable value', value: (r) => r.taxableValue },
        { header: 'CGST', value: (r) => r.cgstAmount },
        { header: 'SGST', value: (r) => r.sgstAmount },
        { header: 'IGST', value: (r) => r.igstAmount },
        { header: 'Cess', value: (r) => r.cessAmount },
        { header: 'Total returned', value: (r) => r.amount },
        { header: 'Back in stock', value: (r) => (r.restock === 'yes' ? 'Yes' : 'No') },
        { header: 'Reason', value: (r) => r.reason },
      ];
      return csvResponse(datedFilename('sales-returns'), toCsv(rows, columns));
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

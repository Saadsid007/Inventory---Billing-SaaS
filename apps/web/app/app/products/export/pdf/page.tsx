import { getBusiness, listProducts } from '@billwise/db';
import { Button } from '@billwise/ui';
import { ArrowLeft, FileSpreadsheet, Package, Printer } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireBusiness } from '@/lib/auth/require-business';
import { PrintController } from './print-controller';

export const metadata: Metadata = { title: 'Products Catalogue & Inventory PDF' };

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ProductPdfPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; low?: string; auto?: string }>;
}) {
  const ctx = await requireBusiness();
  const { q, category, low, auto } = await searchParams;

  const [business, products] = await Promise.all([
    getBusiness(ctx),
    listProducts(ctx, {
      search: q,
      categoryId: category,
      lowStockOnly: low === '1',
      limit: 2000,
      includeInactive: true,
    }),
  ]);

  // Compute key summary statistics
  let totalStockUnits = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalRetailValue = 0;
  let totalCostValue = 0;

  for (const p of products) {
    const stock = Number(p.currentStock);
    const alert = p.lowStockAlert ? Number(p.lowStockAlert) : null;
    const sale = Number(p.salePrice) || 0;
    const cost = p.purchasePrice ? Number(p.purchasePrice) : 0;

    if (stock > 0) {
      totalStockUnits += stock;
      totalRetailValue += stock * sale;
      totalCostValue += stock * cost;
    }

    if (stock <= 0) {
      outOfStockCount++;
    } else if (alert !== null && stock <= alert) {
      lowStockCount++;
    } else {
      inStockCount++;
    }
  }

  const generatedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const filterDescription = [
    q ? `Search: "${q}"` : null,
    category ? 'Filtered by Category' : null,
    low === '1' ? 'Low Stock Only' : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const excelExportUrl = `/app/reports/export/products?${new URLSearchParams({
    ...(q && { q }),
    ...(category && { category }),
    ...(low === '1' && { low: '1' }),
  }).toString()}`;

  return (
    <div className="min-h-dvh bg-slate-100 pb-12 print:bg-white print:p-0">
      <PrintController autoPrint={auto === '1'} />

      {/* Screen Toolbar - Hidden in Print */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-xs backdrop-blur-xs print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/app/products">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <ArrowLeft className="size-3.5" /> Back to Products
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Package className="size-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-800">
              Product Catalogue & Inventory Report · {products.length} items
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a href={excelExportUrl} download>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-emerald-600/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-600 hover:text-white dark:text-emerald-300 transition-colors text-xs font-bold"
            >
              <FileSpreadsheet className="size-3.5" /> Download Excel
            </Button>
          </a>

          <Button
            size="sm"
            onClick={undefined}
            id="trigger-print-btn"
            className="gap-1.5 bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
          >
            <Printer className="size-3.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="mx-auto my-6 max-w-[210mm] border border-slate-200 bg-white p-8 shadow-md print:m-0 print:border-none print:p-5 print:shadow-none">
        {/* Business Header Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {business?.name || 'Inventory Catalogue'}
              </h1>
              {business?.gstin && (
                <p className="font-mono text-xs font-bold text-slate-700 mt-0.5">
                  GSTIN: {business.gstin}
                </p>
              )}
              {(business?.addressLine1 || business?.city) && (
                <p className="text-xs text-slate-600 mt-1 max-w-md">
                  {[
                    business.addressLine1,
                    business.addressLine2,
                    business.city,
                    business.pincode,
                    business.stateCode ? `State (${business.stateCode})` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {(business?.phone || business?.email) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {[business.phone ? `Phone: ${business.phone}` : null, business.email ? `Email: ${business.email}` : null]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}
            </div>

            {/* Document Stamp Box */}
            <div className="text-right">
              <span className="inline-block rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-black tracking-wider text-white uppercase">
                Product Catalogue
              </span>
              <p className="font-mono text-[11px] text-slate-500 mt-1.5">
                Generated: {generatedAt}
              </p>
              {filterDescription && (
                <p className="text-[10px] font-semibold text-slate-600 mt-0.5 max-w-[200px] truncate">
                  {filterDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="my-5 grid grid-cols-4 gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center print:bg-slate-50">
          <div className="border-r border-slate-200 pr-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Total Products
            </span>
            <div className="text-base font-black text-slate-900">{products.length}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {totalStockUnits.toLocaleString('en-IN')} units
            </div>
          </div>

          <div className="border-r border-slate-200 px-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Stock Status
            </span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              <span className="text-emerald-700">{inStockCount} In</span> •{' '}
              <span className="text-amber-700">{lowStockCount} Low</span> •{' '}
              <span className="text-rose-700">{outOfStockCount} Out</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {outOfStockCount > 0 ? `${outOfStockCount} unavailable` : 'Full stock available'}
            </div>
          </div>

          <div className="border-r border-slate-200 px-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Retail Valuation
            </span>
            <div className="text-base font-black text-slate-900">{inr(totalRetailValue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">At current selling prices</div>
          </div>

          <div className="pl-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Estimated Cost
            </span>
            <div className="text-base font-black text-slate-900">{inr(totalCostValue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Purchase value on shelf</div>
          </div>
        </div>

        {/* Products Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-[10px] font-bold tracking-wider text-slate-700 uppercase">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-3">Product Name & Identifiers</th>
                <th className="py-2 px-2.5">Category & HSN</th>
                <th className="py-2 px-2 text-right">Tax %</th>
                <th className="py-2 px-3 text-right">Sale Price</th>
                <th className="py-2 px-3 text-right">Stock</th>
                <th className="py-2 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((p, idx) => {
                const stock = Number(p.currentStock);
                const alert = p.lowStockAlert ? Number(p.lowStockAlert) : null;
                const isOut = stock <= 0;
                const isLow = alert !== null && stock <= alert && stock > 0;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                  >
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {p.barcode && <span>#{p.barcode}</span>}
                      </div>
                    </td>

                    <td className="py-2 px-2.5">
                      <div className="text-slate-800 font-semibold">{p.categoryName || 'General'}</div>
                      {p.hsnCode && (
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          HSN: {p.hsnCode}
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-2 text-right font-mono text-slate-700">
                      {p.taxRate ? `${p.taxRate}%` : '0%'}
                    </td>

                    <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                      {inr(Number(p.salePrice))}
                      {p.unitShortName && (
                        <span className="text-[10px] font-normal text-slate-500">
                          {' '}/ {p.unitShortName}
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                      {p.currentStock} {p.unitShortName ?? 'PCS'}
                    </td>

                    <td className="py-2 px-2 text-center">
                      {isOut ? (
                        <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-100">
                          OUT
                        </span>
                      ) : isLow ? (
                        <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-100">
                          LOW
                        </span>
                      ) : (
                        <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer with Terms & Signatory */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-semibold text-slate-700">BillWise Inventory & Billing SaaS</p>
              <p className="text-[10px] mt-0.5">
                Official document for internal records, physical auditing, and price listings.
              </p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-400 w-36 mb-1" />
              <p className="text-[10px] font-semibold text-slate-600">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

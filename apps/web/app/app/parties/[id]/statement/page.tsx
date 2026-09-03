import { getBusiness, getParty, getPartyBalance, listPartyLedger } from '@billwise/db';
import { Button } from '@billwise/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';

export const metadata: Metadata = { title: 'Party Statement Print' };

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;
  const { from, to } = await searchParams;

  const [business, party, balance, ledger] = await Promise.all([
    getBusiness(ctx),
    getParty(ctx, id),
    getPartyBalance(ctx, id),
    listPartyLedger(ctx, id),
  ]);

  if (!party) notFound();

  let running = Number(party.openingBalance);
  const allRows = ledger.map((entry) => {
    running += Number(entry.amount);
    return { ...entry, running };
  });

  const filteredRows = allRows.filter((r) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });

  const totalDebit = filteredRows.reduce(
    (sum, r) => sum + (Number(r.amount) > 0 ? Number(r.amount) : 0),
    0,
  );
  const totalCredit = filteredRows.reduce(
    (sum, r) => sum + (Number(r.amount) < 0 ? Math.abs(Number(r.amount)) : 0),
    0,
  );
  const outstanding = Number(balance?.outstanding ?? party.openingBalance);

  return (
    <div className="bg-slate-100 min-h-dvh pb-12 print:bg-white print:p-0">
      {/* Screen toolbar - hidden in print */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-xs backdrop-blur-xs print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/app/parties/${party.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="size-3.5" /> Back to contact
            </Button>
          </Link>
          <span className="text-sm font-semibold text-slate-800">
            Khata Statement · {party.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={undefined}
            className="gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <Printer className="size-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="mx-auto my-6 max-w-[210mm] border border-slate-200 bg-white p-8 shadow-md print:m-0 print:border-none print:p-6 print:shadow-none">
        {/* Business Header */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {business?.name}
              </h1>
              {business?.gstin && (
                <p className="font-mono text-xs font-bold text-slate-700 mt-0.5">
                  GSTIN: {business.gstin}
                </p>
              )}
              {(business?.addressLine1 || business?.city) && (
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {[
                    business.addressLine1,
                    business.addressLine2,
                    business.city,
                    business.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {business?.phone && (
                <p className="text-xs text-slate-600 mt-0.5">Phone: {business.phone}</p>
              )}
            </div>

            <div className="text-right">
              <span className="inline-block rounded bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                Account Statement
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              {(from || to) && (
                <p className="text-xs font-medium text-slate-700 mt-0.5">
                  Period: {from ?? 'Start'} to {to ?? 'Present'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Account Details */}
        <div className="my-6 grid grid-cols-2 gap-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Account / Customer
            </p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{party.name}</p>
            {party.phone && <p className="text-xs text-slate-700">Phone: {party.phone}</p>}
            {party.gstin && (
              <p className="font-mono text-xs text-slate-700">GSTIN: {party.gstin}</p>
            )}
            {party.addressLine1 && (
              <p className="text-xs text-slate-600 mt-0.5">
                {[party.addressLine1, party.city, party.pincode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          <div className="border-l border-slate-200 pl-6 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Opening Balance:</span>
              <span className="font-mono font-medium">{inr(Number(party.openingBalance))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Debits (Billed):</span>
              <span className="font-mono font-medium text-amber-700">+{inr(totalDebit)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Credits (Paid):</span>
              <span className="font-mono font-medium text-emerald-700">-{inr(totalCredit)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-slate-900 text-sm">
              <span>Net Balance Due:</span>
              <span className="font-mono font-black">{inr(outstanding)}</span>
            </div>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div className="overflow-hidden border border-slate-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 font-bold text-slate-800">
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Particulars / Description</th>
                <th className="p-2.5">Voucher Type</th>
                <th className="p-2.5 text-right">Debit (+)</th>
                <th className="p-2.5 text-right">Credit (-)</th>
                <th className="p-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-slate-50/70 text-slate-600 font-medium">
                <td className="p-2 tabular">-</td>
                <td className="p-2 font-semibold">Opening Balance Carried Forward</td>
                <td className="p-2 capitalize">Opening</td>
                <td className="p-2 text-right tabular">
                  {Number(party.openingBalance) >= 0 ? inr(Number(party.openingBalance)) : '-'}
                </td>
                <td className="p-2 text-right tabular">
                  {Number(party.openingBalance) < 0
                    ? inr(Math.abs(Number(party.openingBalance)))
                    : '-'}
                </td>
                <td className="p-2 text-right font-bold tabular">
                  {inr(Number(party.openingBalance))}
                </td>
              </tr>
              {filteredRows.map((entry) => {
                const amt = Number(entry.amount);
                const isDebit = amt >= 0;
                return (
                  <tr key={`${entry.kind}-${entry.id}`} className="hover:bg-slate-50">
                    <td className="p-2 tabular text-slate-600 whitespace-nowrap">{entry.date}</td>
                    <td className="p-2 font-medium text-slate-900">
                      {entry.label.replace(/_/g, ' ')}
                    </td>
                    <td className="p-2 text-slate-600 capitalize">
                      {entry.kind.replace(/_/g, ' ')}
                    </td>
                    <td className="p-2 text-right tabular font-medium text-slate-900">
                      {isDebit ? inr(amt) : '-'}
                    </td>
                    <td className="p-2 text-right tabular font-medium text-emerald-700">
                      {!isDebit ? inr(Math.abs(amt)) : '-'}
                    </td>
                    <td className="p-2 text-right tabular font-bold text-slate-900">
                      {inr(entry.running)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer with Authorized Signature */}
        <div className="mt-16 flex items-end justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <div>
            <p className="italic">Thank you for your business!</p>
            <p className="text-[10px] mt-0.5">This is a computer-generated account statement.</p>
          </div>

          <div className="text-right">
            <div className="h-12" />
            <p className="font-semibold text-slate-800 border-t border-slate-400 pt-1">
              For {business?.name}
            </p>
            <p className="text-[10px] text-slate-500">Authorized Signatory</p>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 350);
            });
          `,
        }}
      />
    </div>
  );
}

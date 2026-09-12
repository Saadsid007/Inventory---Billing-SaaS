'use client';

import { Button } from '@billwise/ui';
import { ArrowLeft, Printer, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

const STORAGE_KEY = 'billwise-print-format';

/**
 * Format switcher & print action toolbar. Screen only — `.no-print` keeps it off the PDF.
 */
export function PrintToolbar({
  invoiceId,
  current,
}: {
  invoiceId: string;
  current: 'a4' | 'thermal';
}) {
  const router = useRouter();

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, current);
  }, [current]);

  function choose(format: 'a4' | 'thermal') {
    localStorage.setItem(STORAGE_KEY, format);
    router.replace(`/app/invoices/${invoiceId}/print?format=${format}`);
  }

  return (
    <div className="no-print sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-xs backdrop-blur-md">
      {/* Format Toggle */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => choose('a4')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              current === 'a4'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ReceiptText className="size-3.5" />
            <span>Full A4 Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => choose('thermal')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              current === 'thermal'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="size-3.5" />
            <span>80mm Thermal</span>
          </button>
        </div>

        <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
          PDF format: {current === 'a4' ? 'Standard A4 GST Tax Invoice' : 'Compact POS Slip'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs"
          onClick={() => router.push(`/app/invoices/${invoiceId}`)}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Invoice</span>
        </Button>

        <Button
          size="sm"
          className="h-8 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-sm text-xs font-semibold"
          onClick={() => window.print()}
        >
          <Printer className="size-3.5" />
          <span>Print / Save as PDF</span>
        </Button>
      </div>
    </div>
  );
}

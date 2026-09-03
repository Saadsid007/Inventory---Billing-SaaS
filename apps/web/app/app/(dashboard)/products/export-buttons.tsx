'use client';

import { Button } from '@billwise/ui';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

export function ProductExportButtons({
  currentFilters,
}: {
  currentFilters?: { q?: string; category?: string; low?: boolean };
}) {
  const searchParams = useSearchParams();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Compute query string from active URL or props
  const queryString = React.useMemo(() => {
    const sp = new URLSearchParams();
    const q = currentFilters?.q ?? searchParams.get('q');
    const category = currentFilters?.category ?? searchParams.get('category');
    const low = currentFilters?.low ? '1' : searchParams.get('low');

    if (q) sp.set('q', q);
    if (category) sp.set('category', category);
    if (low === '1') sp.set('low', '1');

    return sp.toString() ? `?${sp.toString()}` : '';
  }, [currentFilters, searchParams]);

  const excelUrl = `/app/reports/export/products${queryString}`;
  const pdfUrl = `/app/products/export/pdf${queryString ? `${queryString}&auto=1` : '?auto=1'}`;

  function handlePdfExport() {
    window.open(pdfUrl, '_blank');
    setDropdownOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center gap-1.5">
      {/* Desktop / Tablet: Direct Distinct Buttons */}
      <div className="hidden sm:inline-flex items-center gap-1.5">
        {/* EXCEL EXPORT BUTTON */}
        <a href={excelUrl} download>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8.5 gap-1.5 px-3 text-xs font-bold border-emerald-600/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-2xs"
            title="Download full products spreadsheet (.xlsx / .csv)"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
            <span>Export Excel</span>
          </Button>
        </a>

        {/* PDF EXPORT BUTTON */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePdfExport}
          className="h-8.5 gap-1.5 px-3 text-xs font-bold border-rose-600/30 bg-rose-500/10 text-rose-700 hover:bg-rose-600 hover:text-white dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-2xs"
          title="Download styled A4 PDF catalogue & price list"
        >
          <FileText className="size-3.5 text-rose-600 dark:text-rose-400 group-hover:text-white" />
          <span>Export PDF</span>
        </Button>
      </div>

      {/* Mobile: Compact Dropdown Button */}
      <div className="sm:hidden relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDropdownOpen((v) => !v)}
          className="h-8.5 gap-1 px-2.5 text-xs font-bold border-border/80 bg-background shadow-2xs"
        >
          <Download className="size-3.5" />
          <span>Download</span>
          <ChevronDown className={`size-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border/90 bg-card p-1 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100">
            <a
              href={excelUrl}
              download
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <FileSpreadsheet className="size-4" />
              <span>Download Excel (.csv)</span>
            </a>
            <button
              type="button"
              onClick={handlePdfExport}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
            >
              <FileText className="size-4" />
              <span>Download PDF (A4 Sheet)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

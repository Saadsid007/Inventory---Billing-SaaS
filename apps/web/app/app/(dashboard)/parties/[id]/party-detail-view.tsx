'use client';

import type { OpenInvoice } from '@billwise/core';
import type { Party } from '@billwise/db';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  Input,
  Pagination,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import {
  ArrowLeft,
  Calendar,
  Download,
  FileSpreadsheet,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  ReceiptText,
  Search,
  User,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { PartyForm, type CustomFieldDefView } from '../party-form';
import { PaymentModal } from './payment-modal';

export type LedgerRow = {
  id: string;
  kind: 'invoice' | 'payment' | 'return' | string;
  date: string;
  label: string;
  amount: string;
  running: number;
};

const inr = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function PartyDetailView({
  party,
  outstanding,
  rows,
  openInvoices,
  customFieldDefs,
}: {
  party: Party;
  outstanding: number;
  rows: LedgerRow[];
  openInvoices: OpenInvoice[];
  customFieldDefs: readonly CustomFieldDefView[];
}) {
  const [tab, setTab] = React.useState<'ledger' | 'details'>('ledger');
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);

  // Filter state for Tab 1
  const [q, setQ] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  // Pagination state for Tab 1
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  // Sync hash (#details, #payment) with active tab and modal
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#details') {
      setTab('details');
    } else if (hash === '#payment') {
      setPaymentModalOpen(true);
      setTab('ledger');
    } else {
      setTab('ledger');
    }
  }, []);

  function switchTab(newTab: 'ledger' | 'details') {
    setTab(newTab);
    const hash = newTab === 'ledger' ? '' : `#${newTab}`;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + hash);
    }
  }

  // Filtered rows
  const filteredRows = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      if (query) {
        const matchesLabel = r.label.toLowerCase().includes(query);
        const matchesKind = r.kind.toLowerCase().includes(query);
        if (!matchesLabel && !matchesKind) return false;
      }
      return true;
    });
  }, [rows, q, fromDate, toDate]);

  React.useEffect(() => {
    setPage(1);
  }, [q, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Aggregate totals
  const totalBilled = rows.reduce(
    (sum, r) => sum + (Number(r.amount) > 0 ? Number(r.amount) : 0),
    0,
  );
  const totalPaid = rows.reduce(
    (sum, r) => sum + (Number(r.amount) < 0 ? Math.abs(Number(r.amount)) : 0),
    0,
  );

  // Download Excel / CSV handler
  function downloadCsv() {
    const headers = [
      'Date',
      'Description / Particulars',
      'Voucher Type',
      'Debit (+)',
      'Credit (-)',
      'Running Balance',
    ];

    const csvLines = [
      headers.join(','),
      `"-","Opening Balance Carried Forward","opening","${Number(party.openingBalance) >= 0 ? Number(party.openingBalance).toFixed(2) : '0.00'}","${Number(party.openingBalance) < 0 ? Math.abs(Number(party.openingBalance)).toFixed(2) : '0.00'}","${Number(party.openingBalance).toFixed(2)}"`,
      ...filteredRows.map((r) => {
        const amt = Number(r.amount);
        const isDebit = amt >= 0;
        const debit = isDebit ? amt.toFixed(2) : '0.00';
        const credit = !isDebit ? Math.abs(amt).toFixed(2) : '0.00';
        const label = `"${r.label.replace(/"/g, '""').replace(/_/g, ' ')}"`;
        return `"${r.date}",${label},"${r.kind}","${debit}","${credit}","${r.running.toFixed(2)}"`;
      }),
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = party.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `${sanitizedName}-khata-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Download PDF statement handler
  function openPrintStatement() {
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    window.open(`/app/parties/${party.id}/statement${qs}`, '_blank');
  }

  // Quick preset filters
  function applyPreset(preset: 'all' | 'this_month' | 'last_month') {
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }
    const now = new Date();
    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setFromDate(firstDay);
      setToDate(lastDay);
    }
  }

  const cleanPhone = party.phone?.replace(/\D/g, '') ?? '';

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <Link
          href="/app/parties"
          className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to all contacts
        </Link>
        <span className="tabular font-mono text-[11px]">ID: {party.id.slice(0, 8)}…</span>
      </div>

      {/* Executive Hero Header Card - Compact & Clean */}
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-3.5 sm:p-4 shadow-xs ring-1 ring-border/50">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {party.name}
              </h1>

              <Badge
                variant={party.type === 'customer' ? 'default' : 'secondary'}
                className="px-2 py-0 text-[11px] font-semibold capitalize"
              >
                {party.type}
              </Badge>

              {party.isActive ? (
                <Badge variant="success" dot className="px-1.5 py-0 text-[10px]">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Quick Contact & Tax Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {party.phone && (
                <a
                  href={`tel:${party.phone}`}
                  className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <Phone className="size-3 text-primary" /> {party.phone}
                </a>
              )}

              {cleanPhone && (
                <a
                  href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(party.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.2 font-medium text-[11px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle className="size-3 text-emerald-600" /> WhatsApp
                </a>
              )}

              {party.gstin && (
                <>
                  <span>·</span>
                  <span className="font-mono text-foreground font-semibold text-[11px]">
                    GSTIN: {party.gstin}
                  </span>
                </>
              )}

              {party.city && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <MapPin className="size-3 text-muted-foreground" />
                    {party.city}
                    {party.stateCode ? `, State ${party.stateCode}` : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Header Action Buttons - Small & Compact */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold gap-1.5"
              onClick={() => setPaymentModalOpen(true)}
            >
              <Wallet className="size-3.5" /> Record Payment
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs font-medium hover:border-primary/40 hover:bg-primary-subtle/30 gap-1.5"
              onClick={openPrintStatement}
            >
              <Printer className="size-3.5" /> Download PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs font-medium hover:border-primary/40 hover:bg-primary-subtle/30 gap-1.5"
              onClick={downloadCsv}
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* 3-Card Financial Stat Summary Grid */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatCard
          label="Net Khata Balance"
          value={inr(outstanding)}
          hint={
            outstanding > 0
              ? 'Customer owes this balance to you'
              : outstanding < 0
                ? 'Advance balance held with you'
                : 'All dues completely settled'
          }
          icon={Wallet}
          tone={outstanding > 0 ? 'warning' : outstanding < 0 ? 'info' : 'success'}
        />

        <StatCard
          label="Total Invoiced / Debits"
          value={inr(totalBilled)}
          hint="Sum of all bills and charges issued"
          icon={ReceiptText}
          tone="default"
        />

        <StatCard
          label="Total Payments Received"
          value={inr(totalPaid)}
          hint="Total credits and settlements collected"
          icon={IndianRupee}
          tone="success"
        />
      </div>

      {/* Full-width Tab Bar Strip with noticeable background color & highlighted active tab */}
      <div className="w-full rounded-xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchTab('ledger')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              tab === 'ledger'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <ReceiptText className="size-3.5" />
            <span>Khata Ledger & Bills</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                tab === 'ledger'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300/90 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {rows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('details')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              tab === 'details'
                ? 'bg-primary text-white shadow-md shadow-primary/30 ring-1 ring-primary/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <User className="size-3.5" />
            <span>Contact & GST Profile</span>
          </button>
        </div>
      </div>

      {/* TAB 1: KHATA LEDGER & TRANSACTIONS */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          {/* Compact Filter & Download Strip */}
          <FilterBar className="flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search bill # or description…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-8.5 rounded-lg border-border/80 bg-background pl-8 text-xs shadow-2xs"
                />
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8.5 w-32 rounded-lg text-xs"
                />
                <span className="text-[11px] text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8.5 w-32 rounded-lg text-xs"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                    !fromDate && !toDate
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_month')}
                  className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last_month')}
                  className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Last Month
                </button>
              </div>

              {(q || fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 px-2 text-xs"
                  onClick={() => {
                    setQ('');
                    setFromDate('');
                    setToDate('');
                  }}
                >
                  <X className="size-3" /> Clear
                </Button>
              )}
            </div>

            {/* Quick Export Shortcuts */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 rounded-lg text-xs gap-1"
                onClick={openPrintStatement}
                title="Download / Print PDF statement"
              >
                <Printer className="size-3.5" /> PDF Statement
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 rounded-lg text-xs gap-1"
                onClick={downloadCsv}
                title="Export CSV for Excel"
              >
                <Download className="size-3.5 text-emerald-600" /> Excel (.csv)
              </Button>
            </div>
          </FilterBar>

          {filteredRows.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No transactions found"
              description={
                q || fromDate || toDate
                  ? 'No entries match your search filters. Try clearing the filter.'
                  : Number(party.openingBalance) !== 0
                    ? `Opening balance of ${inr(Number(party.openingBalance))} carried forward. Invoices and payments will appear here.`
                    : 'Invoices and payments for this contact will appear here.'
              }
              action={
                (q || fromDate || toDate) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ('');
                      setFromDate('');
                      setToDate('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <Table className="rounded-none border-none shadow-none">
                <THead>
                  <TR>
                    <TH icon={Calendar} className="w-28">
                      Date
                    </TH>
                    <TH icon={ReceiptText}>Particulars / Description</TH>
                    <TH>Type</TH>
                    <TH numeric className="w-32">
                      Debit (+)
                    </TH>
                    <TH numeric className="w-32">
                      Credit (-)
                    </TH>
                    <TH numeric className="w-32">
                      Khata Balance
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {/* Opening Balance row on page 1 */}
                  {page === 1 && !q && !fromDate && (
                    <TR className="bg-muted/40 font-medium">
                      <TD className="tabular text-muted-foreground">-</TD>
                      <TD className="font-semibold text-foreground">
                        Opening Balance Carried Forward
                      </TD>
                      <TD>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          Opening
                        </Badge>
                      </TD>
                      <TD numeric className="text-muted-foreground tabular">
                        {Number(party.openingBalance) >= 0 ? inr(party.openingBalance) : '-'}
                      </TD>
                      <TD numeric className="text-muted-foreground tabular">
                        {Number(party.openingBalance) < 0
                          ? inr(Math.abs(Number(party.openingBalance)))
                          : '-'}
                      </TD>
                      <TD numeric className="font-bold text-foreground tabular">
                        {inr(party.openingBalance)}
                      </TD>
                    </TR>
                  )}

                  {paginatedRows.map((entry) => {
                    const amt = Number(entry.amount);
                    const isDebit = amt >= 0;
                    return (
                      <TR key={`${entry.kind}-${entry.id}`}>
                        <TD className="tabular whitespace-nowrap text-muted-foreground">
                          {entry.date}
                        </TD>
                        <TD className="font-medium">
                          <span className="capitalize">{entry.label.replace(/_/g, ' ')}</span>
                        </TD>
                        <TD>
                          <Badge
                            variant={isDebit ? 'outline' : 'success'}
                            className="text-[10px] capitalize"
                          >
                            {entry.kind.replace(/_/g, ' ')}
                          </Badge>
                        </TD>
                        <TD numeric className="font-bold text-amber-700 dark:text-amber-400 tabular">
                          {isDebit ? inr(amt) : '-'}
                        </TD>
                        <TD numeric className="font-bold text-emerald-600 dark:text-emerald-400 tabular">
                          {!isDebit ? inr(Math.abs(amt)) : '-'}
                        </TD>
                        <TD numeric className="font-bold tabular text-foreground">
                          {inr(entry.running)}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredRows.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[15, 30, 50]}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTACT & GST PROFILE */}
      {tab === 'details' && (
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
          <div className="mb-6 border-b border-border/60 pb-4">
            <h2 className="text-base font-bold text-foreground">Contact & GST Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update billing details, GSTIN, phone, address, and khata opening balance.
            </p>
          </div>

          <PartyForm
            partyId={party.id}
            initial={{
              type: party.type,
              name: party.name,
              phone: party.phone ?? '',
              email: party.email ?? '',
              gstin: party.gstin ?? '',
              stateCode: party.stateCode ?? '',
              addressLine1: party.addressLine1 ?? '',
              city: party.city ?? '',
              pincode: party.pincode ?? '',
              openingBalance: party.openingBalance,
              customFields: party.customFields,
            }}
            customFieldDefs={customFieldDefs}
          />
        </div>
      )}

      {/* Instant Standalone Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        partyId={party.id}
        partyName={party.name}
        openInvoices={openInvoices}
        outstanding={outstanding.toFixed(2)}
      />
    </div>
  );
}

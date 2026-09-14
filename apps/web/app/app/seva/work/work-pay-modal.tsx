'use client';

import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  whatsappShareUrl,
} from '@billwise/shared';
import { Button, Field, FormError, Input, Select, cn } from '@billwise/ui';
import {
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Printer,
  Receipt as ReceiptIcon,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { collectBalanceAction } from '../receipts/actions';
import { generateReceiptForWorkAction } from './actions';

export type WorkModalTarget = {
  id: string;
  serviceName: string;
  partyName: string | null;
  partyPhone: string | null;
  referenceNo: string | null;
  invoiceId: string | null;
  invoiceNo: string | null;
  balance: string;
};

export function WorkPayModal({
  work,
  services = [],
  initialMode = 'pay',
  onClose,
}: {
  work: WorkModalTarget;
  services?: { id: string; name: string; price?: string }[];
  initialMode?: 'pay' | 'receipt';
  onClose: () => void;
}) {
  const router = useRouter();

  // Find standard price for unbilled work if matched by service name
  const matchedService = React.useMemo(() => {
    return services.find(
      (s) => s.name.trim().toLowerCase() === work.serviceName.trim().toLowerCase(),
    );
  }, [services, work.serviceName]);

  const defaultFee = matchedService?.price ? Number(matchedService.price).toFixed(2) : '50.00';

  // Mode for unbilled work: generate receipt & payment
  // Mode for billed work: 'pay' (record payment) or 'receipt' (receipt options)
  const isBilled = Boolean(work.invoiceId);
  const [activeTab, setActiveTab] = React.useState<'pay' | 'receipt'>(
    !isBilled || initialMode === 'pay' ? 'pay' : 'receipt',
  );

  // Existing invoice payment state
  const [payAmount, setPayAmount] = React.useState(
    Number(work.balance) > 0 ? Number(work.balance).toFixed(2) : '0.00',
  );
  const [payMethod, setPayMethod] = React.useState<PaymentMethod>('cash');
  const [paidOn, setPaidOn] = React.useState(() => new Date().toISOString().slice(0, 10));

  // Unbilled work receipt generation state
  const [fee, setFee] = React.useState(defaultFee);
  const [amountReceived, setAmountReceived] = React.useState(defaultFee);
  const [genMethod, setGenMethod] = React.useState<PaymentMethod>('cash');
  const [receiptDate, setReceiptDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = React.useState('');

  // Result state after generating receipt
  const [generated, setGenerated] = React.useState<{
    invoiceId: string;
    invoiceNo: string;
    balance: string;
  } | null>(null);

  const [error, setError] = React.useState<string | undefined>();
  const [successMsg, setSuccessMsg] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Handle collecting payment on an existing invoice
  function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    if (!work.invoiceId) return;

    setError(undefined);
    setSuccessMsg(undefined);

    startTransition(async () => {
      const result = await collectBalanceAction(work.invoiceId!, {
        amount: payAmount,
        method: payMethod,
        paidOn,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccessMsg('Payment recorded successfully.');
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1200);
    });
  }

  // Handle generating receipt & initial payment for unbilled work
  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSuccessMsg(undefined);

    startTransition(async () => {
      const result = await generateReceiptForWorkAction({
        applicationId: work.id,
        rate: fee,
        amountReceived,
        method: genMethod,
        receiptDate,
        notes: note || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setGenerated(result);
      setSuccessMsg(`Receipt ${result.invoiceNo} generated.`);
      router.refresh();
    });
  }

  const currentInvoiceId = work.invoiceId ?? generated?.invoiceId;
  const currentInvoiceNo = work.invoiceNo ?? generated?.invoiceNo;
  const currentBalance = generated ? generated.balance : work.balance;

  function shareWhatsApp() {
    if (!work.partyPhone) {
      setError('No phone number saved for this customer.');
      return;
    }
    const msg = [
      `Hello ${work.partyName || ''},`,
      `Receipt no: ${currentInvoiceNo ?? ''}`,
      `Work: ${work.serviceName}`,
      Number(currentBalance) > 0
        ? `Balance outstanding: ₹${Number(currentBalance).toFixed(2)}`
        : 'Payment status: Fully Paid',
      'Thank you.',
    ].join('\n');

    const url = whatsappShareUrl(work.partyPhone, msg);
    if (url) window.open(url, 'billwise-share');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Payment and Receipt"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg space-y-4 rounded-t-2xl border bg-card p-5 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold flex items-center gap-2">
              {isBilled || generated ? (
                <>
                  <Wallet className="size-4 text-primary" /> Payment & Receipt
                </>
              ) : (
                <>
                  <ReceiptIcon className="size-4 text-primary" /> Add Payment & Generate Receipt
                </>
              )}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[work.serviceName, work.partyName || 'Walk-in customer', work.partyPhone]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab switch if receipt already exists */}
        {(isBilled || generated) && (
          <div className="flex rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('pay')}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
                activeTab === 'pay'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Wallet className="size-3.5" /> Take Payment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receipt')}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
                activeTab === 'receipt'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ReceiptIcon className="size-3.5" /> Receipt Options
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <FormError>{error}</FormError>

        {/* SECTION 1: Unbilled Work (Generate Receipt & Payment) */}
        {!isBilled && !generated && (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work / Service:</span>
                <span className="font-semibold text-foreground">{work.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">
                  {work.partyName || 'Walk-in customer'}
                </span>
              </div>
              {work.referenceNo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref No:</span>
                  <span className="tabular text-foreground">{work.referenceNo}</span>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Total Fee (₹)" htmlFor="gen-rate" required hint="Total price charged">
                <Input
                  id="gen-rate"
                  inputMode="decimal"
                  autoFocus
                  value={fee}
                  onChange={(e) => {
                    setFee(e.target.value);
                    setAmountReceived(e.target.value);
                  }}
                  className="tabular"
                />
              </Field>

              <Field
                label="Amount Paid Now (₹)"
                htmlFor="gen-received"
                required
                hint="0 if uncollected"
              >
                <Input
                  id="gen-received"
                  inputMode="decimal"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="tabular"
                />
              </Field>

              <Field label="Paid by" htmlFor="gen-method">
                <Select
                  id="gen-method"
                  value={genMethod}
                  onChange={(e) => setGenMethod(e.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Date" htmlFor="gen-date">
                <Input
                  id="gen-date"
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes" htmlFor="gen-note" hint="Optional note on cash memo">
              <Input
                id="gen-note"
                placeholder="e.g. advance paid, photo copy pending"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? 'Generating…' : 'Generate Receipt & Save Payment'}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* SECTION 2: Existing Invoice - Payment Tab */}
        {(isBilled || generated) && activeTab === 'pay' && (
          <form onSubmit={handleCollect} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-warning">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-wider uppercase">
                  Outstanding Balance
                </p>
                <p className="tabular text-xl font-bold">
                  ₹{Number(currentBalance).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.65rem] font-medium text-muted-foreground">Receipt No</p>
                <p className="text-xs font-semibold text-foreground">{currentInvoiceNo}</p>
              </div>
            </div>

            {Number(currentBalance) > 0 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Amount to pay" htmlFor="pay-amt" required>
                    <Input
                      id="pay-amt"
                      inputMode="decimal"
                      autoFocus
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="tabular"
                    />
                  </Field>

                  <Field label="Paid by" htmlFor="pay-method">
                    <Select
                      id="pay-method"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Date" htmlFor="pay-date">
                    <Input
                      id="pay-date"
                      type="date"
                      value={paidOn}
                      onChange={(e) => setPaidOn(e.target.value)}
                    />
                  </Field>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={pending} className="flex-1">
                    {pending ? 'Recording…' : 'Record Payment'}
                  </Button>
                  <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-success flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="size-4" /> This receipt is fully paid
                </p>
                <p className="text-xs text-muted-foreground">
                  Nothing left to collect. You can print or view the receipt anytime.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('receipt')}
                  >
                    View Receipt Options
                  </Button>
                  <Button type="button" size="sm" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* SECTION 3: Receipt Tab (Quick Print, View, WhatsApp) */}
        {(isBilled || generated) && activeTab === 'receipt' && currentInvoiceId && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Receipt Number
                  </span>
                  <p className="text-base font-bold tabular">{currentInvoiceNo}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    Number(currentBalance) <= 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                  )}
                >
                  {Number(currentBalance) <= 0 ? 'Paid in full' : 'Balance due'}
                </span>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                <p>
                  <span className="font-medium text-foreground">Customer:</span>{' '}
                  {work.partyName || 'Walk-in customer'}
                  {work.partyPhone && ` (${work.partyPhone})`}
                </p>
                <p>
                  <span className="font-medium text-foreground">Work:</span> {work.serviceName}
                </p>
                {Number(currentBalance) > 0 && (
                  <p className="text-warning font-medium">
                    Outstanding: ₹{Number(currentBalance).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Receipt Actions: 1-click Print, Full Page, WhatsApp */}
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={`/app/receipts/${currentInvoiceId}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                <Printer className="size-4" /> Print Receipt Slip
              </a>

              <Link
                href={`/app/seva/receipts/${currentInvoiceId}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-4" /> Open Full Receipt
              </Link>
            </div>

            {work.partyPhone && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={shareWhatsApp}
              >
                <MessageCircle className="size-3.5" /> Share Receipt details on WhatsApp
              </Button>
            )}

            <div className="flex justify-end pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

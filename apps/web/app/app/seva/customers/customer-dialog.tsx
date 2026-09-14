'use client';

import { Button, Field, FormError, Input, Textarea } from '@billwise/ui';
import { Plus, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { createSevaCustomerAction } from './actions';

export function CustomerDialog({
  trigger = 'button',
  open: controlledOpen,
  onOpenChange,
  onCreated,
}: {
  trigger?: 'button' | 'icon' | 'empty' | 'none';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (partyId: string) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | undefined>();

  const [form, setForm] = React.useState({
    name: '',
    phone: '',
    addressLine1: '',
    city: '',
    pincode: '',
    openingBalance: '',
    note: '',
  });

  const reset = () => {
    setForm({
      name: '',
      phone: '',
      addressLine1: '',
      city: '',
      pincode: '',
      openingBalance: '',
      note: '',
    });
    setError(undefined);
  };

  const setOpen = (val: boolean) => {
    if (!isControlled) setInternalOpen(val);
    onOpenChange?.(val);
  };

  const handleOpen = () => {
    reset();
    setOpen(true);
  };

  const handleClose = () => {
    if (pending) return;
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter the customer name');
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const res = await createSevaCustomerAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }

      setOpen(false);
      reset();
      router.refresh();
      if (onCreated) {
        onCreated(res.partyId);
      }
    });
  };

  return (
    <>
      {trigger === 'button' && (
        <Button onClick={handleOpen} className="gap-1.5 shadow-xs font-medium">
          <Plus className="size-4" /> Add Customer
        </Button>
      )}

      {trigger === 'empty' && (
        <Button onClick={handleOpen} className="gap-1.5 shadow-xs font-medium">
          <UserPlus className="size-4" /> Add First Customer
        </Button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-customer-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <h2 id="dialog-customer-title" className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <UserPlus className="size-5 text-primary" />
                  Add New Customer
                </h2>
                <p className="text-xs text-muted-foreground">
                  Register a customer to track receipts, applications, and balances.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={handleClose}
                disabled={pending}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Customer Name" htmlFor="cust-name" required>
                <Input
                  id="cust-name"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  autoFocus
                  required
                  disabled={pending}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Field>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Mobile Number" htmlFor="cust-phone" hint="10-digit number for SMS / WhatsApp">
                  <Input
                    id="cust-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={form.phone}
                    disabled={pending}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </Field>

                <Field label="Previous Due (₹)" htmlFor="cust-balance" hint="Optional opening balance">
                  <Input
                    id="cust-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.openingBalance}
                    disabled={pending}
                    onChange={(e) => setForm((prev) => ({ ...prev, openingBalance: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Address / Village / Landmark" htmlFor="cust-addr">
                <Input
                  id="cust-addr"
                  placeholder="e.g. Main Bazar, Near Panchayat Bhavan"
                  value={form.addressLine1}
                  disabled={pending}
                  onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                />
              </Field>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="City / Tehsil" htmlFor="cust-city">
                  <Input
                    id="cust-city"
                    placeholder="e.g. Rampur"
                    value={form.city}
                    disabled={pending}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </Field>

                <Field label="Pincode" htmlFor="cust-pin">
                  <Input
                    id="cust-pin"
                    placeholder="e.g. 244901"
                    maxLength={6}
                    value={form.pincode}
                    disabled={pending}
                    onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Note / Remark" htmlFor="cust-note" hint="Any internal reference or family details">
                <Textarea
                  id="cust-note"
                  rows={2}
                  placeholder="e.g. Ration card application reference, referred by Pradhan Ji"
                  value={form.note}
                  disabled={pending}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </Field>

              {error && <FormError>{error}</FormError>}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending} className="gap-1.5 font-semibold">
                  {pending ? (
                    'Saving...'
                  ) : (
                    <>
                      <Plus className="size-4" /> Save Customer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { GST_STATES } from '@billwise/shared';
import { Button, Card, Field, FormError, Input, Select } from '@billwise/ui';
import { Building2, CheckCircle2, MapPin, PhoneCall, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { saveProfileAction } from './actions';

type Values = {
  name: string;
  legalName: string;
  gstin: string;
  stateCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
};

export function ProfileSection({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
    saved?: boolean;
  }>({});
  const [pending, startTransition] = React.useTransition();

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setState({});
    startTransition(async () => {
      const result = await saveProfileAction(values);
      if (result.ok) {
        setState({ saved: true });
        router.refresh();
      } else {
        setState({
          ...(result.formError !== undefined && { formError: result.formError }),
          ...(result.fieldErrors !== undefined && { fieldErrors: result.fieldErrors }),
        });
      }
    });
  }

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <Card className="overflow-hidden border border-border/80 bg-card shadow-xs">
      {/* Executive Header */}
      <div className="border-b border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Business Profile & Tax Identity</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              This information is printed on your invoices, GST reports, thermal receipts, and
              displayed to customers across your online storefront.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="p-5 sm:p-6 space-y-6">
        <FormError>{state.formError}</FormError>

        {/* Section 1: Business Names & GST */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Identity & Legal Registration</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Trade / Business Name" htmlFor="p-name" error={err('name')} required>
              <Input
                id="p-name"
                value={values.name}
                onChange={set('name')}
                placeholder="e.g. Sharma Kirana & General Store"
                className="h-9.5 text-xs font-medium"
              />
            </Field>

            <Field
              label="Legal Name (As on PAN/GST)"
              htmlFor="p-legalName"
              error={err('legalName')}
              hint="If different from your trading display name"
            >
              <Input
                id="p-legalName"
                value={values.legalName}
                onChange={set('legalName')}
                placeholder="e.g. Sharma Traders Private Limited"
                className="h-9.5 text-xs font-medium"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="GSTIN"
              htmlFor="p-gstin"
              error={err('gstin')}
              hint="15-digit GST identification number (leave blank if unregistered)"
            >
              <Input
                id="p-gstin"
                value={values.gstin}
                onChange={set('gstin')}
                className="h-9.5 font-mono uppercase text-xs font-semibold"
                maxLength={15}
                placeholder="27AABCU9603R1ZM"
              />
            </Field>

            <Field
              label="Registered State"
              htmlFor="p-stateCode"
              error={err('stateCode')}
              hint="Decides CGST+SGST vs IGST on invoices"
              required
            >
              <Select
                id="p-stateCode"
                value={values.stateCode}
                onChange={set('stateCode')}
                className="h-9.5 text-xs font-medium"
              >
                <option value="">Select a state…</option>
                {GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    State {s.code} — {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {/* Section 2: Contact & Communication */}
        <div className="space-y-4 border-t border-border/60 pt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <PhoneCall className="size-3.5 text-primary" />
            <span>Contact & Communication</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone / Mobile" htmlFor="p-phone" error={err('phone')}>
              <Input
                id="p-phone"
                type="tel"
                value={values.phone}
                onChange={set('phone')}
                placeholder="+91 98765 43210"
                className="h-9.5 text-xs font-medium"
              />
            </Field>

            <Field label="Email Address" htmlFor="p-email" error={err('email')}>
              <Input
                id="p-email"
                type="email"
                value={values.email}
                onChange={set('email')}
                placeholder="billing@yourstore.com"
                className="h-9.5 text-xs font-medium"
              />
            </Field>
          </div>
        </div>

        {/* Section 3: Registered Address */}
        <div className="space-y-4 border-t border-border/60 pt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <MapPin className="size-3.5 text-primary" />
            <span>Registered Business Address</span>
          </div>

          <div className="space-y-3">
            <Field label="Address Line 1" htmlFor="p-addressLine1" error={err('addressLine1')}>
              <Input
                id="p-addressLine1"
                value={values.addressLine1}
                onChange={set('addressLine1')}
                placeholder="Shop No., Street, Market / Road"
                className="h-9.5 text-xs font-medium"
              />
            </Field>

            <Field label="Address Line 2 (Optional)" htmlFor="p-addressLine2" error={err('addressLine2')}>
              <Input
                id="p-addressLine2"
                value={values.addressLine2}
                onChange={set('addressLine2')}
                placeholder="Landmark, Area, Sector"
                className="h-9.5 text-xs font-medium"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City / Town" htmlFor="p-city" error={err('city')}>
                <Input
                  id="p-city"
                  value={values.city}
                  onChange={set('city')}
                  placeholder="e.g. Mumbai"
                  className="h-9.5 text-xs font-medium"
                />
              </Field>

              <Field label="PIN Code" htmlFor="p-pincode" error={err('pincode')}>
                <Input
                  id="p-pincode"
                  inputMode="numeric"
                  value={values.pincode}
                  onChange={set('pincode')}
                  placeholder="e.g. 400001"
                  className="h-9.5 text-xs font-medium"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <div>
            {state.saved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Changes saved successfully
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="h-9 bg-primary text-primary-foreground font-bold shadow-xs text-xs px-5"
          >
            {pending ? 'Saving…' : 'Save Business Profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

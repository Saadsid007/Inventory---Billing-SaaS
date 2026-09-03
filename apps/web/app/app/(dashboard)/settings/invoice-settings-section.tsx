'use client';

import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  type DropdownOption,
  Field,
  FormError,
  Input,
  Textarea,
} from '@billwise/ui';
import {
  CheckCircle2,
  FileText,
  Globe2,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { saveSettingsAction } from './actions';

type Values = {
  defaultTaxMode: 'inclusive' | 'exclusive';
  invoiceTerms: string;
  invoiceFooter: string;
  showCatalogPrices: boolean;
  catalogEnabled: boolean;
  catalogWhatsapp: string;
};

const TAX_MODE_OPTIONS: readonly DropdownOption<'exclusive' | 'inclusive'>[] = [
  {
    value: 'exclusive',
    label: 'Tax Added On Top (Exclusive)',
    description: 'Item prices are entered without tax; GST is computed and added.',
  },
  {
    value: 'inclusive',
    label: 'Tax Included in Price (Inclusive / MRP)',
    description: 'Item rates already include GST; tax is back-calculated.',
  },
];

export function InvoiceSettingsSection({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [state, setState] = React.useState<{
    formError?: string;
    fieldErrors?: Record<string, string>;
    saved?: boolean;
  }>({});
  const [pending, startTransition] = React.useTransition();

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setState({});
    startTransition(async () => {
      const result = await saveSettingsAction(values);
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
      {/* Header */}
      <div className="border-b border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <FileText className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Invoicing & Catalog Preferences</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Configure standard tax computation modes, default legal terms printed on bills, and
              manage your public customer storefront settings.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="p-5 sm:p-6 space-y-6">
        <FormError>{state.formError}</FormError>

        {/* Section 1: Billing & Taxes */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Receipt className="size-3.5 text-primary" />
            <span>Invoice Price & Tax Defaults</span>
          </div>

          <Field
            label="Default Price Entry Mode"
            htmlFor="s-taxMode"
            error={err('defaultTaxMode')}
            hint="Whether the product rate typed during billing already includes GST or adds it on top"
          >
            <Dropdown
              id="s-taxMode"
              value={values.defaultTaxMode}
              onChange={(mode) => setValues((v) => ({ ...v, defaultTaxMode: mode }))}
              options={TAX_MODE_OPTIONS}
            />
          </Field>

          <Field
            label="Default Terms & Conditions"
            htmlFor="s-terms"
            error={err('invoiceTerms')}
            hint="Printed in the footer block of every generated A4 tax invoice and delivery challan"
          >
            <Textarea
              id="s-terms"
              rows={3}
              value={values.invoiceTerms}
              onChange={(e) => setValues((v) => ({ ...v, invoiceTerms: e.target.value }))}
              placeholder="e.g. 1. Goods once sold will not be taken back without original bill. 2. Subject to local jurisdiction."
              className="text-xs"
            />
          </Field>

          <Field
            label="Invoice Custom Footer Note"
            htmlFor="s-footer"
            error={err('invoiceFooter')}
            hint="A friendly closing note (e.g. Thank you for your business! Visit again.)"
          >
            <Input
              id="s-footer"
              value={values.invoiceFooter}
              onChange={(e) => setValues((v) => ({ ...v, invoiceFooter: e.target.value }))}
              placeholder="Thank you for shopping with us!"
              className="h-9.5 text-xs font-medium"
            />
          </Field>
        </div>

        {/* Section 2: Online Catalog & Storefront */}
        <div className="space-y-4 border-t border-border/60 pt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Globe2 className="size-3.5 text-primary" />
            <span>Public Storefront & Digital Catalog</span>
          </div>

          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
            <Checkbox
              id="s-cat-enable"
              label="Publish my public web storefront"
              hint="When disabled, your public catalog URL immediately returns 404 Not Found"
              checked={values.catalogEnabled}
              onCheckedChange={(checked) => setValues((v) => ({ ...v, catalogEnabled: checked }))}
            />

            <Checkbox
              id="s-cat-prices"
              label="Show product prices on public catalog"
              hint="Disable this if you operate as a B2B distributor or wholesaler requiring quote requests"
              checked={values.showCatalogPrices}
              onCheckedChange={(checked) => setValues((v) => ({ ...v, showCatalogPrices: checked }))}
            />

            <Field
              label="Storefront WhatsApp Enquiries Number"
              htmlFor="s-whatsapp"
              error={err('catalogWhatsapp')}
              hint="Optional override. If left blank, your business phone number is used for WhatsApp chat"
            >
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="s-whatsapp"
                  type="tel"
                  value={values.catalogWhatsapp}
                  onChange={(e) => setValues((v) => ({ ...v, catalogWhatsapp: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="h-9.5 pl-8 text-xs font-medium"
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <div>
            {state.saved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Settings saved successfully
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="h-9 bg-primary text-primary-foreground font-bold shadow-xs text-xs px-5"
          >
            {pending ? 'Saving…' : 'Save Invoicing Settings'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

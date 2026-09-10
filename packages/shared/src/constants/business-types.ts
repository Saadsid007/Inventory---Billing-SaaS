/**
 * What kind of business this is, and what that changes.
 *
 * ## Why a profile and not a pile of `if` statements
 *
 * A Jan Seva Kendra and a kirana store share every table in this database:
 * both bill a customer, take part payment, and carry an outstanding balance.
 * What differs is vocabulary and which screens make sense — a CSC has no stock
 * to track and no HSN to declare, and a kirana store has no government fee to
 * pass on.
 *
 * Encoding that as conditionals spread through the app is how a product ends up
 * unable to add a third kind of business without a rewrite. So each type is one
 * entry here, and the screens read from it. Adding a medical store or a salon
 * later should be this object plus its own routes — never a change to billing,
 * tax or payments.
 *
 * The build spec's own warning, on the marketing page: "building per-vertical
 * code would cost a rewrite."
 */

export const BUSINESS_TYPES = ['retail', 'jan_seva', 'medical'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type BusinessProfile = {
  /** Shown on the signup picker. */
  label: string;
  /** One line under the label, in the language the owner would use. */
  description: string;
  /** Where this type lands after login. */
  home: string;
  /**
   * The words this trade uses. A CSC owner does not "add a product" or "make an
   * invoice"; they add a service and give a receipt. Getting the nouns wrong is
   * the fastest way to make software feel like it was built for someone else.
   */
  terms: {
    item: string;
    itemPlural: string;
    document: string;
    documentPlural: string;
    /** What `purchase_price` means here. For a CSC it is the government fee. */
    cost: string;
  };
  features: {
    /** Stock ledger, low-stock alerts, stock in/out. */
    inventory: boolean;
    /** HSN codes and GST fields on the billing form. */
    gstFields: boolean;
    /** Applications with a status that runs for days — PAN, Aadhaar, certificates. */
    applications: boolean;
  };
  /** Default document kind for a new bill. */
  defaultInvoiceKind: 'tax_invoice' | 'cash_memo';
};

export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
  retail: {
    label: 'Shop or business',
    description:
      'Kirana, general store, electronics, garments, hardware — anything where you sell goods and track stock.',
    home: '/app',
    terms: {
      item: 'Product',
      itemPlural: 'Products',
      document: 'Invoice',
      documentPlural: 'Invoices',
      cost: 'Purchase price',
    },
    features: { inventory: true, gstFields: true, applications: true },
    defaultInvoiceKind: 'tax_invoice',
  },

  jan_seva: {
    label: 'Jan Seva Kendra / CSC',
    description:
      'Aadhaar, PAN, certificates, forms and online work. No stock to keep — you charge for the work.',
    home: '/app/seva',
    terms: {
      item: 'Service',
      itemPlural: 'Services',
      document: 'Receipt',
      documentPlural: 'Receipts',
      // The government fee genuinely is their cost, which is why it maps onto
      // `purchase_price` and every margin figure keeps working untouched.
      cost: 'Government fee',
    },
    features: { inventory: false, gstFields: false, applications: true },
    // Most CSCs are under the GST threshold. One that is registered switches to
    // tax invoices simply by saving a GSTIN in settings.
    defaultInvoiceKind: 'cash_memo',
  },

  /**
   * A chemist.
   *
   * ## Why this shares the shop's screens rather than getting its own section
   *
   * Because it genuinely is a shop: it holds stock, that stock goes down when
   * something is sold, it is GST registered, and it keeps a running balance for
   * the regulars. `home` is `/app` for that reason, and everything under it —
   * billing, stock in/out, the catalog, the reports — works untouched.
   *
   * What changes is the vocabulary. A chemist does not "add a product", they
   * add a medicine, and a screen that says otherwise is a screen built for
   * somebody else. That is the whole difference, and it is the right size of
   * difference: `jan_seva` earned its own routes by having no stock at all.
   *
   * ## What is deliberately not claimed
   *
   * Batch numbers, expiry dates and schedule H registers are what a pharmacy
   * eventually needs, and none of them exist yet. Nothing on the pricing page
   * or in the plan features mentions them. Selling a chemist an expiry tracker
   * that is not built is how a shop discovers on day three that it has to keep
   * the paper register anyway.
   */
  medical: {
    label: 'Medical store / pharmacy',
    description:
      'Chemist, medical store, surgical supplies — you sell medicines and keep stock, with GST on every bill.',
    home: '/app',
    terms: {
      item: 'Medicine',
      itemPlural: 'Medicines',
      document: 'Invoice',
      documentPlural: 'Invoices',
      cost: 'Purchase price',
    },
    features: { inventory: true, gstFields: true, applications: false },
    // A medical store is registered in practice — the turnover threshold is far
    // below what one takes — so tax invoice is the honest default.
    defaultInvoiceKind: 'tax_invoice',
  },
};

export function businessProfile(type: string | null | undefined): BusinessProfile {
  // Unknown or missing falls back to retail: every business that existed before
  // this column did was a shop, and a null must never mean "no screens".
  return BUSINESS_PROFILES[(type ?? 'retail') as BusinessType] ?? BUSINESS_PROFILES.retail;
}

export function isBusinessType(value: string): value is BusinessType {
  return (BUSINESS_TYPES as readonly string[]).includes(value);
}

/**
 * How a Jan Seva job moves. Build spec Phase 2 in spirit: a document that is
 * not finished the day it is created needs a state, or the shopkeeper keeps it
 * in a diary and the software is beside the point.
 *
 * `rejected` is a real outcome, not an error — a form comes back for a wrong
 * document often enough that hiding it would make the list lie.
 */
export const APPLICATION_STATUSES = [
  'applied',
  'in_process',
  'ready',
  'delivered',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  in_process: 'In process',
  ready: 'Ready to collect',
  delivered: 'Delivered',
  rejected: 'Rejected',
};

/** Still the shop's problem. Drives the dashboard's "work in hand" count. */
export const OPEN_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'applied',
  'in_process',
  'ready',
];

/**
 * Domain enums. Single source of truth — `packages/db` builds its pgEnum
 * columns from these arrays so the TypeScript union and the Postgres type can
 * never drift apart.
 */

export const INVOICE_KINDS = [
  'tax_invoice',
  'bill_of_supply',
  'cash_memo',
  'estimate',
  'delivery_challan',
] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  tax_invoice: 'Tax Invoice',
  bill_of_supply: 'Bill of Supply',
  cash_memo: 'Cash Memo',
  estimate: 'Estimate',
  delivery_challan: 'Delivery Challan',
};

/** Kinds that carry GST amounts. The rest always total zero tax (spec §5.2). */
export const TAXABLE_INVOICE_KINDS: readonly InvoiceKind[] = ['tax_invoice'];

/** Kinds that do not affect stock or the party ledger. */
export const NON_ACCOUNTING_INVOICE_KINDS: readonly InvoiceKind[] = [
  'estimate',
  'delivery_challan',
];

export const INVOICE_STATUSES = ['draft', 'issued', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'upi', 'bank', 'card', 'cheque', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank Transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

export const PAYMENT_DIRECTIONS = ['in', 'out'] as const;
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];

export const TAX_MODES = ['inclusive', 'exclusive'] as const;
export type TaxMode = (typeof TAX_MODES)[number];

export const PARTY_TYPES = ['customer', 'supplier', 'both'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const PRODUCT_TYPES = ['simple', 'variant', 'batch', 'serial'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const STOCK_REASONS = [
  'opening',
  'sale',
  'stock_in',
  'stock_out',
  'adjustment',
  'sale_cancelled',
  'sale_return',
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export const CUSTOM_FIELD_ENTITIES = ['product', 'party'] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'select', 'checkbox'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const INVOICE_AUDIT_ACTIONS = ['created', 'issued', 'edited', 'cancelled'] as const;
export type InvoiceAuditAction = (typeof INVOICE_AUDIT_ACTIONS)[number];

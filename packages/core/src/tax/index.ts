// Tax engine — build spec §5.3. Pure functions: line totals, CGST/SGST/IGST
// split, cess, inclusive mode and invoice-level rupee rounding.
export { computeInvoice, computeLine } from './engine';
export type {
  InvoiceTaxInput,
  InvoiceTaxResult,
  TaxLineInput,
  TaxLineResult,
} from './types';

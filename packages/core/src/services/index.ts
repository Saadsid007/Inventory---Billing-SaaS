/**
 * Orchestration. Build spec §2.5.
 *
 * These compose the pure engines — tax, place of supply, financial year — into
 * the shape a repository can store. They remain pure: no database, no clock,
 * no config. Anything that needs those is passed in or done by the caller.
 */
export { buildInvoice, type BuildInvoiceInput, type BuiltInvoice } from './build-invoice';
export {
  allocatePayment,
  type Allocation,
  type AllocationPart,
  type OpenInvoice,
  type PaymentAllocation,
  type Tender,
} from './allocate-payment';

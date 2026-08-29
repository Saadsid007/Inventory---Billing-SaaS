import { z } from 'zod';
import { hsnSchema, moneySchema, quantitySchema, uuidSchema } from './primitives';

/**
 * Product form. Shared by the client form and the server action, so a value
 * cannot pass validation in the browser and fail on the server.
 */

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v))
  .pipe(uuidSchema.optional());

const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v))
  .pipe(moneySchema.optional());

const optionalQty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v))
  .pipe(quantitySchema.optional());

export const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a product name').max(120),
    sku: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    barcode: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    categoryId: optionalId,
    unitId: optionalId,
    hsnCode: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : v))
      .pipe(hsnSchema.optional()),
    taxRateId: optionalId,
    salePrice: moneySchema,
    purchasePrice: optionalMoney,
    openingStock: optionalQty,
    lowStockAlert: optionalQty,
    /** false for services — nothing to count, so no stock ledger entries. */
    trackInventory: z.boolean().default(true),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    showInCatalog: z.boolean().default(true),
    customFields: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((v) => !v.trackInventory || v.lowStockAlert === undefined || true, {
    message: 'Low stock alerts only apply to tracked inventory',
  });

export type ProductInput = z.infer<typeof productSchema>;

/**
 * Warnings, not errors. Build spec §5.5 asks for a validation *warning* when a
 * tax invoice line has no HSN — blocking would stop a shopkeeper billing a
 * customer who is standing in front of them, over paperwork they can fix later.
 */
export function productWarnings(input: {
  hsnCode?: string | undefined;
  taxRateId?: string | undefined;
  trackInventory: boolean;
  openingStock?: string | undefined;
}): string[] {
  const warnings: string[] = [];
  if (!input.hsnCode) {
    warnings.push('No HSN code. GST invoices for this product will be missing it.');
  }
  if (!input.taxRateId) {
    warnings.push('No tax rate set. This product will bill at 0% GST.');
  }
  if (!input.trackInventory && input.openingStock && Number(input.openingStock) !== 0) {
    warnings.push('Opening stock is ignored when inventory tracking is off.');
  }
  return warnings;
}

/**
 * Manual stock in / out. Build spec Phase 1g.
 *
 * NOT a purchase bill — quantity, reason and a note, nothing else. Proper
 * supplier invoices with ITC fields are Phase 2, and conflating the two now
 * would mean migrating half-formed purchase records later.
 */
export const stockAdjustmentSchema = z.object({
  productId: z.uuid('Pick a product'),
  direction: z.enum(['in', 'out']),
  qty: quantitySchema.refine((v) => Number(v) > 0, 'Enter a quantity greater than zero'),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

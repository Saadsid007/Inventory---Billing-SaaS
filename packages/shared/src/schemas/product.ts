import { z } from 'zod';
import { DRUG_SCHEDULES } from '../constants/enums';
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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v));

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
    subcategoryId: optionalId,
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

    /*
     * Pharmacy detail. Optional for every trade, filled in by none but the
     * chemist — the form only renders these when `features.pharmacyFields` is
     * on, and a shop that never sees the fields simply never sends them.
     */
    saltComposition: optionalText(200),
    genericName: optionalText(120),
    manufacturer: optionalText(120),
    packSize: optionalText(60),
    drugSchedule: z
      .enum(DRUG_SCHEDULES)
      .optional()
      // 'none' is the picker's placeholder, not a value worth storing.
      .transform((v) => (v === 'none' || v === undefined ? undefined : v)),

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
    warnings.push(
      'No HSN code. GST bills for this item will go out without one. Add it in the ' +
        'HSN / SAC code box above if you are registered.',
    );
  }
  if (!input.taxRateId) {
    warnings.push('No GST rate set, so this item will be billed at 0%. Pick one above.');
  }
  if (!input.trackInventory && input.openingStock && Number(input.openingStock) !== 0) {
    warnings.push(
      'Opening stock is ignored while inventory tracking is off. Switch tracking on below ' +
        'if you want stock counted.',
    );
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

/**
 * A batch, as entered on the medicine's page or received on a purchase bill.
 *
 * `quantity` is optional and defaults to nothing: a lot can be created before
 * its stock arrives, and the stock itself is recorded as a movement rather than
 * set here. See `addBatchAction`.
 *
 * Expiry is the only field with a real rule — a batch dated in the past is
 * almost always a typo in the year, and accepting it silently puts stock on the
 * shelf that the expiry report will flag as already dead.
 */
export const batchSchema = z.object({
  productId: uuidSchema,
  batchNo: z.string().trim().min(1, 'Enter the batch number').max(60),
  expiryDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v))
    .pipe(z.iso.date('Enter a valid expiry date').optional()),
  mfgDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v))
    .pipe(z.iso.date('Enter a valid manufacturing date').optional()),
  mrp: optionalMoney,
  purchasePrice: optionalMoney,
  quantity: optionalQty,
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export type BatchFormInput = z.infer<typeof batchSchema>;

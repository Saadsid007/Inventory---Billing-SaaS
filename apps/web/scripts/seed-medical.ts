/**
 * Stock a medical store's shelves, with batches and expiry dates.
 *
 * Run with:
 *   MEDICAL_EMAIL=someone@example.com pnpm --filter @billwise/web seed:medical
 *
 * ## What this is for
 *
 * Batch tracking is impossible to judge on an empty account. The expiry screen
 * with nothing on it looks the same whether it works or not, and FEFO picking
 * cannot be seen at all until a medicine has three lots with different dates.
 * So this creates exactly that: real medicines, several lots each, some fresh,
 * some inside the warning window, some already dead.
 *
 * ## Safety
 *
 * It targets a business by owner email, refuses to touch one that is not
 * `type = 'medical'`, and refuses to run if that business already has batches
 * unless `MEDICAL_RESET=1` is set. This is pointed at real accounts, so it must
 * never be able to overwrite work somebody did.
 *
 * ## What it does not invent
 *
 * Stock. Every quantity arrives through `adjustStock`, which is the same ledger
 * path the app uses — so `sum(batches) == current_stock` holds here exactly as
 * it does in production, and the seeded data is a real test of that rather than
 * a set of numbers written straight into the columns.
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../../.env', quiet: true });

import {
  adjustStock,
  createBatch,
  countBatches,
  createProduct,
  findBatchDiscrepancies,
  findUserForLogin,
  listMemberships,
  listTaxRates,
  listUnits,
} from '@billwise/db';
import type { TenantCtx } from '@billwise/shared';

/** A date `days` from today, as the database reckons today in IST. */
function dayOffset(days: number): string {
  return new Date(Date.now() + 5.5 * 3_600_000 + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** The last day of the month `months` from now — how an expiry is really read. */
function expiryInMonths(months: number): string {
  const now = new Date(Date.now() + 5.5 * 3_600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months + 1, 0))
    .toISOString()
    .slice(0, 10);
}

type Medicine = {
  name: string;
  salt: string;
  generic: string;
  maker: string;
  pack: string;
  schedule?: string;
  hsn: string;
  mrp: number;
  cost: number;
  /** Months from now that each lot expires. Negative is already expired. */
  lots: number[];
};

/**
 * A believable counter's worth of stock.
 *
 * Ordinary things a chemist actually turns over — not an exotic catalogue.
 * Schedule H on the ones that really are, because that badge is the sort of
 * detail that makes an owner trust the rest of the screen.
 */
const MEDICINES: Medicine[] = [
  { name: 'Dolo 650', salt: 'Paracetamol 650mg', generic: 'Paracetamol', maker: 'Micro Labs',
    pack: 'Strip of 15 tablets', hsn: '3004', mrp: 34, cost: 24, lots: [26, 14, 2] },
  { name: 'Crocin Advance', salt: 'Paracetamol 500mg', generic: 'Paracetamol', maker: 'GSK',
    pack: 'Strip of 15 tablets', hsn: '3004', mrp: 30, cost: 21, lots: [19, -2] },
  { name: 'Augmentin 625 Duo', salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    generic: 'Amoxicillin + Clavulanic Acid', maker: 'GSK', pack: 'Strip of 10 tablets',
    schedule: 'H', hsn: '3004', mrp: 223, cost: 168, lots: [22, 5] },
  { name: 'Azithral 500', salt: 'Azithromycin 500mg', generic: 'Azithromycin', maker: 'Alembic',
    pack: 'Strip of 5 tablets', schedule: 'H', hsn: '3004', mrp: 132, cost: 98, lots: [30, 1] },
  { name: 'Pan 40', salt: 'Pantoprazole 40mg', generic: 'Pantoprazole', maker: 'Alkem',
    pack: 'Strip of 15 tablets', schedule: 'H', hsn: '3004', mrp: 178, cost: 131, lots: [24, 9] },
  { name: 'Allegra 120', salt: 'Fexofenadine 120mg', generic: 'Fexofenadine', maker: 'Sanofi',
    pack: 'Strip of 10 tablets', hsn: '3004', mrp: 219, cost: 164, lots: [17] },
  { name: 'Telma 40', salt: 'Telmisartan 40mg', generic: 'Telmisartan', maker: 'Glenmark',
    pack: 'Strip of 15 tablets', schedule: 'H', hsn: '3004', mrp: 156, cost: 112, lots: [28, 11] },
  { name: 'Glycomet GP 1', salt: 'Metformin 500mg + Glimepiride 1mg', generic: 'Metformin + Glimepiride',
    maker: 'USV', pack: 'Strip of 15 tablets', schedule: 'H', hsn: '3004', mrp: 142, cost: 104,
    lots: [21, 3] },
  { name: 'Shelcal 500', salt: 'Calcium Carbonate 500mg + Vitamin D3 250 IU',
    generic: 'Calcium + Vitamin D3', maker: 'Torrent', pack: 'Strip of 15 tablets', hsn: '3004',
    mrp: 121, cost: 88, lots: [33, 16] },
  { name: 'Benadryl Cough Syrup', salt: 'Diphenhydramine 14.08mg + Ammonium Chloride 138mg',
    generic: 'Diphenhydramine', maker: 'Johnson & Johnson', pack: '100ml bottle', hsn: '3004',
    mrp: 145, cost: 108, lots: [15, -4] },
  { name: 'Betadine Ointment', salt: 'Povidone Iodine 5%', generic: 'Povidone Iodine',
    maker: 'Win-Medicare', pack: '20g tube', hsn: '3004', mrp: 118, cost: 86, lots: [29] },
  { name: 'Volini Spray', salt: 'Diclofenac Diethylamine 1.16%', generic: 'Diclofenac',
    maker: 'Sun Pharma', pack: '60g spray', hsn: '3004', mrp: 289, cost: 214, lots: [23, 7] },
  { name: 'Digene Gel', salt: 'Magnesium Hydroxide + Simethicone', generic: 'Antacid',
    maker: 'Abbott', pack: '200ml bottle', hsn: '3004', mrp: 152, cost: 113, lots: [18] },
  { name: 'Dettol Antiseptic', salt: 'Chloroxylenol 4.8%', generic: 'Chloroxylenol',
    maker: 'Reckitt', pack: '110ml bottle', hsn: '3808', mrp: 85, cost: 62, lots: [34] },
  { name: 'Accu-Chek Active Strips', salt: '—', generic: 'Glucose test strip', maker: 'Roche',
    pack: 'Box of 50 strips', hsn: '3822', mrp: 1150, cost: 940, lots: [20, 6] },
  { name: 'Omez 20', salt: 'Omeprazole 20mg', generic: 'Omeprazole', maker: 'Dr Reddy’s',
    pack: 'Strip of 20 capsules', schedule: 'H', hsn: '3004', mrp: 98, cost: 70, lots: [25, -1] },
];

async function main() {
  const email = process.env['MEDICAL_EMAIL'];
  if (!email) {
    console.error('Set MEDICAL_EMAIL to the owner of the medical store you want to fill.');
    process.exit(1);
  }

  const user = await findUserForLogin(email);
  if (!user) {
    console.error(`No user with email ${email}.`);
    process.exit(1);
  }

  const memberships = await listMemberships(user.id);
  const membership = memberships[0];
  if (!membership) {
    console.error(`${email} owns no business.`);
    process.exit(1);
  }

  const ctx: TenantCtx = {
    businessId: membership.businessId,
    userId: user.id,
    role: membership.role,
  };

  if (membership.type !== 'medical') {
    console.error(
      `${membership.businessName} is a '${membership.type}' business, not a medical store. Refusing: ` +
        'this script writes batches, which no other kind of business uses.',
    );
    process.exit(1);
  }

  /*
   * Refuse to run twice.
   *
   * `createBatch` is an upsert and `adjustStock` is not, so a second run would
   * quietly double every quantity on the shelf — the least obvious kind of
   * wrong, because nothing errors and the totals still reconcile. This is
   * pointed at real accounts, so the default has to be "do nothing".
   */
  const existing = await findBatchDiscrepancies(ctx);
  const [{ count }] = await countBatches(ctx);
  if (count > 0 && process.env['MEDICAL_RESET'] !== '1') {
    console.error(
      `${membership.businessName} already has ${count} batches. Refusing to run: a second ` +
        'pass would double the stock on every one. Set MEDICAL_RESET=1 if that is really what ' +
        'you want.',
    );
    process.exit(1);
  }
  if (existing.length > 0) {
    console.error(
      `Refusing to run: ${existing.length} product(s) already have batches that do not ` +
        'reconcile against their stock. Fix that before adding more.',
    );
    process.exit(1);
  }

  const [units, taxRates] = await Promise.all([listUnits(ctx), listTaxRates(ctx)]);
  const pcs = units.find((u) => u.shortName?.toUpperCase() === 'PCS') ?? units[0];
  // Medicine is 12% GST in the ordinary case.
  const gst12 = taxRates.find((t) => Number(t.rate) === 12) ?? taxRates[0];

  console.warn(`Filling ${membership.businessName} (${email})…`);

  let created = 0;
  let lotsMade = 0;

  for (const med of MEDICINES) {
    const product = await createProduct(ctx, {
      name: med.name,
      salePrice: med.mrp.toFixed(2),
      purchasePrice: med.cost.toFixed(2),
      hsnCode: med.hsn,
      unitId: pcs?.id ?? null,
      taxRateId: gst12?.id ?? null,
      trackInventory: true,
      lowStockAlert: '10',
      saltComposition: med.salt,
      genericName: med.generic,
      manufacturer: med.maker,
      packSize: med.pack,
      drugSchedule: med.schedule ?? null,
      // Stock is held per lot for this trade.
      type: 'batch',
      // Opening stock deliberately zero: every unit arrives on a batch below,
      // so the rollup is built entirely out of batch movements and the
      // invariant is a real test rather than an accident.
      openingStock: '0',
    });
    if (!product) continue;
    created++;

    for (const [index, months] of med.lots.entries()) {
      const batch = await createBatch(ctx, {
        productId: product.id,
        // The shape a manufacturer actually prints.
        batchNo: `${med.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}${
          2400 + index * 37 + med.lots.length
        }`,
        expiryDate: expiryInMonths(months),
        // Roughly two years of shelf life is the norm.
        mfgDate: dayOffset(-(730 - months * 30)),
        // Older lots carry an older, slightly lower printed MRP.
        mrp: (med.mrp - (med.lots.length - index - 1) * 2).toFixed(2),
        purchasePrice: med.cost.toFixed(2),
      });
      lotsMade++;

      // Through the ledger, never straight into the column.
      const qty = months < 0 ? 4 + (index % 3) : 12 + ((index * 7) % 26);
      await adjustStock(ctx, {
        productId: product.id,
        batchId: batch.id,
        qtyChange: String(qty),
        reason: 'purchase',
        note: 'Opening stock from distributor',
      });
    }
  }

  // Proof rather than a claim: the invariant this whole feature rests on,
  // checked against what was just written.
  const drift = await findBatchDiscrepancies(ctx);

  console.warn(`\n${created} medicines, ${lotsMade} batches.`);
  console.warn(
    'Expiry mix: some lots are already past their date and some fall inside the ' +
      '90-day warning window, so both tabs on /app/expiry have something in them.',
  );
  console.warn(
    drift.length === 0
      ? 'Batch quantities reconcile against every product rollup.'
      : `WARNING: ${drift.length} product(s) whose batches do not add up.`,
  );
  console.warn('\nDone. Open /app/products and /app/expiry.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

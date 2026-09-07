/**
 * Fill one Jan Seva Kendra with three months of counter work.
 *
 * Run with:
 *   JANSEVA_EMAIL=someone@example.com pnpm --filter @billwise/web seed:janseva
 *
 * ## Why this is separate from seed-demo.ts
 *
 * A CSC's day has a different shape from a shop's. There is no stock, the
 * amounts are ₹20 to ₹800 rather than ₹200 to ₹60,000, half the transactions
 * are part-paid because the customer pays the rest on collection, and — the
 * part no shop has — a third of the work stays open for a fortnight waiting on
 * a government portal. Bending the retail generator to produce that would have
 * left both harder to read.
 *
 * What it shares is the write path: the same chunked `writeDemoLedger`, and the
 * same rule that no arithmetic is invented here. Totals come from
 * `buildInvoice` and numbers from `formatInvoiceNumber`, exactly as the real
 * billing screen produces them.
 *
 * ## Safety
 *
 * It targets a business by owner email and REFUSES to run if that business
 * already has invoices. This one is pointed at a real account rather than a
 * throwaway `@demo.billwise.in` address, so it must never be able to overwrite
 * work somebody actually did.
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../../.env', quiet: true });

import { buildInvoice, financialYear, formatInvoiceNumber } from '@billwise/core';
import {
  type DemoLedger,
  createParty,
  createProduct,
  findUserForLogin,
  listMemberships,
  listTaxRates,
  listUnits,
  resetBusinessData,
  updateBusinessProfile,
  updateSettings,
  writeDemoLedger,
} from '@billwise/db';
import type { ApplicationStatus, PaymentMethod } from '@billwise/shared';
import { randomUUID } from 'node:crypto';

// --------------------------------------------------------------- window ----

/**
 * Ninety-eight days ending today.
 *
 * Counted from the clock rather than written as fixed dates: a hardcoded
 * window is correct on the day it is written and wrong every day after, and
 * "Collected today ₹0" on a freshly seeded account looks like the dashboard is
 * broken rather than like the data being three weeks old.
 *
 * Built in UTC because `iso()` formats with `toISOString`. A date carrying a
 * +05:30 offset lands on the previous calendar day on any machine west of
 * India, shifting the whole run by one.
 */
const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/** Exclusive: tomorrow, so today's dashboard has today's work on it. */
const END = new Date(todayUtc().getTime() + 86_400_000);
const START = new Date(END.getTime() - 98 * 86_400_000);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
/** An IST hour, stored as the UTC instant it actually is. */
const atHour = (day: Date, h: number, m: number) =>
  new Date(day.getTime() + (h - 5.5) * 3_600_000 + m * 60_000);

// ---------------------------------------------------------------- random ---

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rand = ReturnType<typeof rng>;
const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const chance = (r: Rand, p: number) => r() < p;

// -------------------------------------------------------------- services ---

type Service = {
  name: string;
  sku: string;
  /** What the government takes. Stored as purchase price — it genuinely is cost. */
  govtFee: number;
  /** What the customer pays in total. */
  price: number;
  /** True when the work runs for days and belongs on the work register. */
  tracked: boolean;
  /** Roughly how often this comes up. */
  weight: number;
  /** Days it usually takes, for the promised date. */
  days?: [number, number];
};

const SERVICES: Service[] = [
  // --- Aadhaar. The bread and butter of every CSC. ---
  { name: 'Aadhaar — new enrolment', sku: 'ADH-NEW', govtFee: 0, price: 100, tracked: true, weight: 5, days: [10, 21] },
  { name: 'Aadhaar — name / address update', sku: 'ADH-DEMO', govtFee: 50, price: 150, tracked: true, weight: 12, days: [7, 15] },
  { name: 'Aadhaar — mobile number update', sku: 'ADH-MOB', govtFee: 50, price: 150, tracked: true, weight: 10, days: [5, 12] },
  { name: 'Aadhaar — biometric update', sku: 'ADH-BIO', govtFee: 100, price: 200, tracked: true, weight: 6, days: [7, 15] },
  { name: 'Aadhaar print (PVC card)', sku: 'ADH-PVC', govtFee: 50, price: 120, tracked: false, weight: 8 },

  // --- PAN ---
  { name: 'PAN card — new', sku: 'PAN-NEW', govtFee: 107, price: 250, tracked: true, weight: 7, days: [12, 25] },
  { name: 'PAN card — correction', sku: 'PAN-COR', govtFee: 107, price: 250, tracked: true, weight: 4, days: [12, 25] },

  // --- Certificates. UP issues these through the e-district portal. ---
  { name: 'Aay praman patra (income certificate)', sku: 'CRT-INC', govtFee: 30, price: 120, tracked: true, weight: 9, days: [7, 20] },
  { name: 'Jati praman patra (caste certificate)', sku: 'CRT-CST', govtFee: 30, price: 120, tracked: true, weight: 7, days: [7, 20] },
  { name: 'Niwas praman patra (domicile)', sku: 'CRT-DOM', govtFee: 30, price: 120, tracked: true, weight: 7, days: [7, 20] },
  { name: 'Janm praman patra (birth certificate)', sku: 'CRT-BRT', govtFee: 20, price: 150, tracked: true, weight: 5, days: [10, 25] },
  { name: 'Mrityu praman patra (death certificate)', sku: 'CRT-DTH', govtFee: 20, price: 150, tracked: true, weight: 2, days: [10, 25] },

  // --- Schemes ---
  { name: 'Ayushman Bharat card', sku: 'SCH-AYU', govtFee: 0, price: 100, tracked: true, weight: 8, days: [3, 10] },
  { name: 'e-Shram card', sku: 'SCH-ESH', govtFee: 0, price: 50, tracked: false, weight: 7 },
  { name: 'PM Kisan registration', sku: 'SCH-PMK', govtFee: 0, price: 100, tracked: true, weight: 4, days: [7, 21] },
  { name: 'Vridha pension form', sku: 'SCH-VPN', govtFee: 0, price: 150, tracked: true, weight: 3, days: [15, 40] },
  { name: 'Vidhwa pension form', sku: 'SCH-WPN', govtFee: 0, price: 150, tracked: true, weight: 2, days: [15, 40] },
  { name: 'Ration card — new / correction', sku: 'RAT-NEW', govtFee: 45, price: 200, tracked: true, weight: 5, days: [15, 35] },

  // --- Voter ---
  { name: 'Voter ID — new', sku: 'VTR-NEW', govtFee: 0, price: 100, tracked: true, weight: 4, days: [20, 45] },
  { name: 'Voter ID — correction', sku: 'VTR-COR', govtFee: 0, price: 80, tracked: true, weight: 3, days: [20, 45] },

  // --- Transport & travel ---
  { name: 'Driving licence — learner form', sku: 'DL-LRN', govtFee: 0, price: 250, tracked: true, weight: 4, days: [7, 20] },
  { name: 'Vehicle RC transfer form', sku: 'RC-TRF', govtFee: 0, price: 300, tracked: true, weight: 2, days: [15, 30] },
  { name: 'Passport application form', sku: 'PSP-APP', govtFee: 0, price: 200, tracked: false, weight: 3 },
  { name: 'Railway ticket booking', sku: 'TKT-RLY', govtFee: 0, price: 60, tracked: false, weight: 9 },
  { name: 'Bus ticket booking', sku: 'TKT-BUS', govtFee: 0, price: 50, tracked: false, weight: 4 },

  // --- Business & tax ---
  { name: 'GST registration', sku: 'BIZ-GST', govtFee: 0, price: 800, tracked: true, weight: 1, days: [7, 20] },
  { name: 'Udyam / MSME registration', sku: 'BIZ-UDM', govtFee: 0, price: 300, tracked: false, weight: 2 },
  { name: 'Income tax return (ITR) filing', sku: 'BIZ-ITR', govtFee: 0, price: 500, tracked: false, weight: 3 },

  // --- Counter work. Small, instant, and constant. ---
  { name: 'Online form filling (government job)', sku: 'FRM-JOB', govtFee: 0, price: 150, tracked: false, weight: 8 },
  { name: 'Scholarship form', sku: 'FRM-SCH', govtFee: 0, price: 100, tracked: false, weight: 4 },
  { name: 'Photocopy (per page)', sku: 'MSC-XER', govtFee: 0, price: 2, tracked: false, weight: 20 },
  { name: 'Print out (per page)', sku: 'MSC-PRN', govtFee: 0, price: 5, tracked: false, weight: 16 },
  { name: 'Colour print (per page)', sku: 'MSC-CPR', govtFee: 0, price: 10, tracked: false, weight: 8 },
  { name: 'Lamination', sku: 'MSC-LAM', govtFee: 0, price: 30, tracked: false, weight: 10 },
  { name: 'Passport size photo (8 copies)', sku: 'MSC-PHT', govtFee: 0, price: 60, tracked: false, weight: 9 },
  { name: 'Electricity bill payment', sku: 'MSC-BIJ', govtFee: 0, price: 20, tracked: false, weight: 12 },
  { name: 'Mobile / DTH recharge', sku: 'MSC-RCH', govtFee: 0, price: 10, tracked: false, weight: 11 },
];

// -------------------------------------------------------------- customers --

const FIRST = [
  'Ramesh', 'Suresh', 'Anil', 'Sunita', 'Kavita', 'Mohd Irfan', 'Shabana', 'Deepak',
  'Priya', 'Sanjay', 'Ravi', 'Geeta', 'Manoj', 'Pooja', 'Arun', 'Rekha', 'Vijay',
  'Sarita', 'Naseem', 'Rajesh', 'Meena', 'Vikas', 'Asha', 'Dinesh', 'Nazia',
  'Pramod', 'Shanti', 'Ajay', 'Farhana', 'Om Prakash', 'Lalita', 'Satish',
  'Rukhsana', 'Brijesh', 'Kamla', 'Israr', 'Neelam', 'Jitendra', 'Fatima', 'Mahesh',
];
const LAST = [
  'Kumar', 'Verma', 'Yadav', 'Devi', 'Singh', 'Ansari', 'Tiwari', 'Gupta', 'Sharma',
  'Pal', 'Maurya', 'Nishad', 'Khatoon', 'Prajapati', 'Kushwaha', 'Saini', 'Rastogi',
];

const REASONS_REJECTED = [
  'Documents did not match, applied again',
  'Portal rejected — address proof unclear',
  'Rejected: name spelling mismatch with Aadhaar',
];

const DOCS = [
  'Aadhaar copy, 2 photos',
  'Aadhaar copy',
  'Aadhaar + bank passbook copy',
  'Aadhaar, ration card copy',
  'Aadhaar copy, 4 photos, marksheet',
  'Aadhaar + electricity bill',
  'Old card, Aadhaar copy',
];

const METHODS: PaymentMethod[] = ['cash', 'cash', 'cash', 'cash', 'upi', 'upi', 'upi'];

// -------------------------------------------------------------- generation -

type LiveService = Service & { id: string };
type LiveParty = { id: string; name: string; phone: string };

function weighted(r: Rand, pool: LiveService[]): LiveService {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let n = r() * total;
  for (const p of pool) {
    n -= p.weight;
    if (n <= 0) return p;
  }
  return pool[pool.length - 1]!;
}

async function main() {
  const email = (process.env['JANSEVA_EMAIL'] ?? '').trim().toLowerCase();
  if (!email) {
    console.error('\nSet JANSEVA_EMAIL to the owner of the Jan Seva business.\n');
    process.exit(1);
  }

  const user = await findUserForLogin(email);
  if (!user) {
    console.error(`\nNo account for ${email}. Sign up first, choosing "Jan Seva Kendra".\n`);
    process.exit(1);
  }

  const [membership] = await listMemberships(user.id);
  if (!membership) {
    console.error(`\n${email} has no business.\n`);
    process.exit(1);
  }
  if (membership.type !== 'jan_seva') {
    console.error(
      `\n${membership.businessName} is a "${membership.type}" business, not jan_seva.\n` +
        'Change its type first, or this data would land on the wrong screens.\n',
    );
    process.exit(1);
  }

  const ctx = { businessId: membership.businessId, userId: user.id, role: 'owner' as const };
  const log = (m: string) => console.warn(`  ${m}`);

  /*
   * The one guard that matters: this points at a real account rather than a
   * throwaway address, so it must never quietly write over work somebody did.
   *
   * Clearing is possible, but only when asked for by name. `resetBusinessData`
   * is scoped to this one businessId and cannot reach another tenant.
   */
  const { listInvoices } = await import('@billwise/db');
  const existing = await listInvoices(ctx, { limit: 1 });
  if (existing.length > 0) {
    if (process.env['JANSEVA_RESET'] !== '1') {
      console.error(
        `\n${membership.businessName} already has receipts.\n\n` +
          'Refusing to pile seed data on top of work somebody may actually have done.\n' +
          'To clear THIS ONE business and start over, re-run with JANSEVA_RESET=1.\n',
      );
      process.exit(1);
    }
    log('JANSEVA_RESET=1 — clearing this business first');
    await resetBusinessData(ctx);
  }

  const r = rng(20260901);
  console.warn(`\n${membership.businessName} (${email})`);

  // 1. Profile. The phone matters most — it is what the WhatsApp share uses.
  await updateBusinessProfile(ctx, {
    legalName: membership.businessName,
    stateCode: '09',
    addressLine1: 'Shop 3, Near Block Office',
    addressLine2: 'Civil Lines',
    city: 'Kanpur',
    pincode: '208001',
    phone: '9838001122',
    email,
  });
  await updateSettings(ctx, {
    defaultTaxMode: 'exclusive',
    invoiceTerms:
      'Sarkari fees alag hai, wo receipt me shaamil hai.\nKaam poora hone par baaki paisa dena hoga.',
    invoiceFooter: 'We will send you a message as soon as your work is ready.',
    catalogEnabled: true,
    showCatalogPrices: true,
    catalogWhatsapp: '9838001122',
  });
  log('profile and settings set');

  // 2. Services. Government fee goes in as purchase price — it is the cost —
  //    so every margin figure in the product keeps working untouched.
  const unitRows = await listUnits(ctx);
  const pcs = unitRows.find((u) => u.shortName === 'PCS')?.id ?? null;
  const rateRows = await listTaxRates(ctx);
  const zeroRate = rateRows.find((t) => Number(t.rate) === 0)?.id ?? null;

  const services: LiveService[] = [];
  for (const s of SERVICES) {
    const row = await createProduct(ctx, {
      name: s.name,
      sku: s.sku,
      unitId: pcs,
      taxRateId: zeroRate,
      salePrice: s.price.toFixed(2),
      purchasePrice: s.govtFee > 0 ? s.govtFee.toFixed(2) : null,
      // Nothing here sits on a shelf.
      trackInventory: false,
      showInCatalog: true,
    });
    if (row) services.push({ ...s, id: row.id });
  }
  log(`${services.length} services`);

  // 3. Customers. Everyone has a phone — that is how a CSC contacts anybody,
  //    and it is what makes the "your work is ready" message work.
  const parties: LiveParty[] = [];
  const seenNames = new Set<string>();
  for (let i = 0; i < 46; i++) {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    const phone = `9${int(r, 100000000, 999999999)}`;
    const row = await createParty(ctx, {
      type: 'customer',
      name,
      phone,
      stateCode: '09',
      city: pick(r, ['Kanpur', 'Kanpur Dehat', 'Unnao', 'Bilhaur', 'Ghatampur']),
    });
    if (row) parties.push({ id: row.id, name, phone });
  }
  log(`${parties.length} customers`);

  // 4. Three months at the counter.
  const ledger: DemoLedger = {
    series: [],
    invoices: [],
    lines: [],
    payments: [],
    movements: [],
    returns: [],
    returnLines: [],
    audit: [],
    views: [],
    subscriptions: [],
    applications: [],
    stock: [],
  };

  const fy = financialYear(iso(START));
  const shape = { prefix: 'JSK-', padding: 4 };
  let nextNumber = 1;
  let collected = 0;
  let owed = 0;

  for (let day = new Date(START); day < END; day = addDays(day, 1)) {
    const dow = day.getUTCDay();
    // Sunday is quiet; the first week of the month is busy because that is when
    // pension and scheme paperwork lands.
    let factor = dow === 0 ? 0.35 : 1;
    if (day.getUTCDate() <= 7) factor *= 1.3;
    const count = Math.max(1, Math.round(int(r, 12, 26) * factor * (0.8 + r() * 0.4)));

    for (let i = 0; i < count; i++) {
      const party = pick(r, parties);
      const lineCount = chance(r, 0.75) ? 1 : int(r, 2, 3);

      const chosen: { service: LiveService; qty: number }[] = [];
      const used = new Set<string>();
      for (let l = 0; l < lineCount; l++) {
        const service = weighted(r, services);
        if (used.has(service.id)) continue;
        used.add(service.id);
        // Photocopies and prints go by the page; everything else is one job.
        const bulk = service.price <= 10;
        chosen.push({ service, qty: bulk ? int(r, 2, 40) : 1 });
      }
      if (chosen.length === 0) continue;

      const invoiceDate = iso(day);
      const built = buildInvoice({
        // Not GST registered, so a plain cash memo — the default for this trade.
        kind: 'cash_memo',
        invoiceDate,
        taxMode: 'exclusive',
        supplierStateCode: '09',
        partyStateCode: '09',
        lines: chosen.map((c) => ({
          productId: c.service.id,
          name: c.service.name,
          unit: 'PCS',
          qty: c.qty.toFixed(3),
          rate: c.service.price.toFixed(2),
          taxRate: '0',
        })),
      });

      const invoiceId = randomUUID();
      const invoiceNo = formatInvoiceNumber(shape, nextNumber);
      nextNumber += 1;
      const createdAt = atHour(day, int(r, 9, 19), int(r, 0, 59));
      const grand = Number(built.grandTotal);

      /*
       * Payment. Small counter work is settled on the spot. Work that has to go
       * to a government portal is usually half now and half on collection —
       * which is the single most common thing a CSC owner needs the software to
       * remember.
       */
      const hasTracked = chosen.some((c) => c.service.tracked);
      let paid = grand;
      const paymentRows: { amount: number; on: Date; method: PaymentMethod }[] = [];

      if (hasTracked && chance(r, 0.62)) {
        // Round the advance to a note the customer would actually hand over.
        const advance = Math.min(grand, Math.max(50, Math.round((grand * (0.3 + r() * 0.3)) / 10) * 10));
        paid = advance;
        paymentRows.push({ amount: advance, on: createdAt, method: pick(r, METHODS) });
      } else {
        paymentRows.push({ amount: grand, on: createdAt, method: pick(r, METHODS) });
      }

      const paymentStatus = paid <= 0 ? 'unpaid' : paid >= grand ? 'paid' : 'partial';
      collected += paid;
      owed += grand - paid;

      ledger.invoices.push({
        id: invoiceId,
        kind: 'cash_memo',
        status: 'issued',
        fy,
        invoiceNo,
        invoiceDate,
        partyId: party.id,
        partyName: party.name,
        partyPhone: party.phone,
        partyAddress: 'Kanpur, 09',
        supplierStateCode: '09',
        placeOfSupply: built.placeOfSupply,
        isInterstate: built.isInterstate,
        taxMode: 'exclusive',
        subtotal: built.subtotal,
        discountTotal: built.discountTotal,
        cgstTotal: built.cgstTotal,
        sgstTotal: built.sgstTotal,
        igstTotal: built.igstTotal,
        cessTotal: built.cessTotal,
        otherCharges: built.otherCharges,
        roundOff: built.roundOff,
        grandTotal: built.grandTotal,
        amountPaid: paid.toFixed(2),
        paymentStatus,
        createdBy: ctx.userId,
        createdAt,
        updatedAt: createdAt,
      });

      built.lines.forEach((line, index) => {
        ledger.lines.push({
          id: randomUUID(),
          invoiceId,
          lineNo: index + 1,
          productId: line.productId,
          name: line.name,
          unit: line.unit,
          qty: line.qty,
          rate: line.rate,
          discountPct: line.discountPct,
          discountAmount: line.discountAmount,
          taxableValue: line.taxableValue,
          taxRate: line.taxRate,
          cessRate: line.cessRate,
          cgstAmount: line.cgstAmount,
          sgstAmount: line.sgstAmount,
          igstAmount: line.igstAmount,
          cessAmount: line.cessAmount,
          lineTotal: line.lineTotal,
        });
      });

      for (const p of paymentRows) {
        ledger.payments.push({
          id: randomUUID(),
          partyId: party.id,
          invoiceId,
          amount: p.amount.toFixed(2),
          direction: 'in',
          method: p.method,
          paidOn: iso(p.on),
          createdBy: ctx.userId,
          createdAt: p.on,
        });
      }

      ledger.audit.push(
        { invoiceId, action: 'created', changedBy: ctx.userId, snapshot: null, createdAt },
        { invoiceId, action: 'issued', changedBy: ctx.userId, snapshot: { invoiceNo }, createdAt },
      );

      /*
       * The work register. One row per tracked service on the bill — a family
       * doing three Aadhaar updates on one receipt is three separate jobs, each
       * with its own acknowledgement number, finishing on different days.
       */
      for (const c of chosen) {
        if (!c.service.tracked) continue;

        const [lo, hi] = c.service.days ?? [7, 20];
        const promised = addDays(day, int(r, lo, hi));
        const daysSince = Math.round((END.getTime() - day.getTime()) / 86_400_000);

        let status: ApplicationStatus;
        let deliveredOn: string | null = null;

        if (chance(r, 0.04)) {
          status = 'rejected';
        } else if (daysSince > 35) {
          // Old work is nearly all finished and handed over.
          status = chance(r, 0.94) ? 'delivered' : 'ready';
          if (status === 'delivered') {
            deliveredOn = iso(addDays(promised, int(r, 0, 6)));
          }
        } else if (daysSince > 18) {
          status = pick(r, ['delivered', 'delivered', 'ready', 'in_process'] as const);
          if (status === 'delivered') deliveredOn = iso(addDays(promised, int(r, 0, 4)));
        } else {
          status = pick(r, ['applied', 'applied', 'in_process', 'in_process', 'ready'] as const);
        }

        const at = atHour(day, int(r, 9, 19), int(r, 0, 59));
        ledger.applications.push({
          id: randomUUID(),
          partyId: party.id,
          partyName: party.name,
          partyPhone: party.phone,
          invoiceId,
          serviceId: c.service.id,
          serviceName: c.service.name,
          status,
          // A government acknowledgement number. Deliberately never an Aadhaar
          // number — see the note on the service_applications table.
          referenceNo: chance(r, 0.85)
            ? `${c.service.sku.slice(0, 3)}${int(r, 1000000000, 9999999999)}`
            : null,
          appliedOn: invoiceDate,
          expectedOn: iso(promised),
          deliveredOn,
          documentsHeld: chance(r, 0.8) ? pick(r, DOCS) : null,
          note: status === 'rejected' ? pick(r, REASONS_REJECTED) : null,
          createdBy: ctx.userId,
          createdAt: at,
          updatedAt: at,
        });
      }
    }
  }

  ledger.series.push({
    kind: 'cash_memo',
    fy,
    prefix: shape.prefix,
    padding: shape.padding,
    nextNumber,
  });

  await writeDemoLedger(ctx, ledger);

  const open = ledger.applications.filter(
    (a) => a.status === 'applied' || a.status === 'in_process' || a.status === 'ready',
  ).length;
  const ready = ledger.applications.filter((a) => a.status === 'ready').length;

  log(`${ledger.invoices.length} receipts · ${ledger.lines.length} lines · ${ledger.payments.length} payments`);
  log(`${ledger.applications.length} jobs on the register — ${open} still open, ${ready} ready to collect`);
  log(`collected ₹${Math.round(collected).toLocaleString('en-IN')} · outstanding ₹${Math.round(owed).toLocaleString('en-IN')}`);
  console.warn('\nDone. Open /app/seva\n');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nSeed failed:', error);
    process.exit(1);
  });

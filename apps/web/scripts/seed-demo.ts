/**
 * Demo tenants: three shops with three months of real trading history.
 *
 * Run with:  pnpm --filter @billwise/web seed:demo
 *
 * ## What this is for
 *
 * An empty app demos badly. Every screen that matters here — the dashboard
 * chart, reports, the khata, stock alerts, GST summaries, returns — only says
 * anything once there is a run of trade behind it. So this builds three
 * complete businesses of different kinds, each with its own products, its own
 * customers and roughly ninety days of bills, payments and returns.
 *
 * ## The rules it keeps
 *
 * 1. **Nothing is invented.** Every rupee and every tax split comes from
 *    `buildInvoice` in `@billwise/core`, the same function the invoice form
 *    calls. Numbers come from `formatInvoiceNumber`. A demo whose arithmetic
 *    could differ from the product's would be actively misleading.
 *
 * 2. **Stock is never negative.** The generator tracks what is on the shelf and
 *    writes a `stock_in` movement when a product runs low, exactly as a shop
 *    would receive goods. The final `current_stock` is the sum of the ledger,
 *    not a guess.
 *
 * 3. **It only ever touches its own accounts.** Every demo owner is on
 *    `@demo.billwise.in`, and the wipe step refuses anything else. This script
 *    cannot delete a real shop's data even if someone edits the list at the top
 *    carelessly.
 *
 * 4. **It is deterministic.** A fixed seed per shop, so re-running produces the
 *    same history rather than a different one every time.
 *
 * Note that the production and local databases are currently the same Neon
 * database, so this writes to whatever `DATABASE_URL` points at. That is
 * intentional here — these accounts are meant to be logged into on the live
 * site — but check the variable before running it anywhere else.
 */

import { config as loadEnv } from 'dotenv';

// Before any import that reads env at module load.
loadEnv({ path: '../../.env', quiet: true });

import {
  buildInvoice,
  financialYear,
  formatInvoiceNumber,
  gstinCheckDigit,
} from '@billwise/core';
import {
  activateDemoBusiness,
  createCategory,
  createParty,
  createProduct,
  type DemoLedger,
  listTaxRates,
  listUnits,
  registerOwner,
  updateBusinessProfile,
  updateSettings,
  wipeDemoBusinesses,
  writeDemoLedger,
} from '@billwise/db';
import { MONTHLY_PRICE_INR, type PaymentMethod, type TaxMode } from '@billwise/shared';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';

// --------------------------------------------------------------- window ----

/**
 * Three months of trade, up to and including today.
 *
 * Built in UTC, not from an offset literal. `iso()` below formats with
 * `toISOString`, which is UTC — so a date written as `+05:30` lands on the
 * previous calendar day on any machine west of India, and the whole run
 * silently shifts back by one. Keeping both ends in UTC makes the date on the
 * invoice the date that was intended, wherever this is run.
 */
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const START = utc(2026, 6, 1);
/** Exclusive. Set to tomorrow, so today's dashboard has today's bills on it. */
const END = utc(2026, 8, 31);

/** Everyone signed up a fortnight before they started billing. */
const SIGNUP = new Date(Date.UTC(2026, 4, 18, 5, 0));

/** The shared password. Demo accounts only — see the note printed at the end. */
const DEMO_PASSWORD = 'Billwise@2026';

// ---------------------------------------------------------------- random ---

/**
 * mulberry32. A tiny seeded PRNG.
 *
 * `Math.random()` would make every run produce a different history, which means
 * a bug you saw once you can never reproduce, and a screenshot that never
 * matches the database again.
 */
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

const int = (r: Rand, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const chance = (r: Rand, p: number) => r() < p;

// ----------------------------------------------------------------- dates ---

const iso = (d: Date) => d.toISOString().slice(0, 10);

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/**
 * A timestamp during shop hours on a given day, so the ledger reads plausibly.
 *
 * The hour is Indian time, converted to the UTC instant that is actually
 * stored. Using `setHours` would use whatever timezone this script happens to
 * run in, and a 9pm sale would land on the following day on a UTC machine.
 */
function atHour(day: Date, hour: number, minute: number): Date {
  return new Date(day.getTime() + (hour - 5.5) * 3_600_000 + minute * 60_000);
}

// ----------------------------------------------------------------- GSTIN ---

/**
 * A GSTIN with a correct check digit.
 *
 * `validateGstin` in core rejects a bad one, so a demo shop with a made-up
 * number would show a validation error on its own settings page — the first
 * thing anyone looking at the demo would find.
 */
function gstin(stateCode: string, pan: string, entity = '1'): string {
  const first14 = `${stateCode}${pan}${entity}Z`;
  return first14 + gstinCheckDigit(first14);
}

// ------------------------------------------------------------ shop shapes --

type SeedProduct = {
  name: string;
  sku: string;
  hsn: string;
  /** GST slab as a percentage string. Matched against the global tax_rates rows. */
  tax: string;
  unit: string;
  sale: number;
  cost: number;
  opening: number;
  low: number;
  category: string;
  /** Rough share of bills this product turns up on. Higher = a staple. */
  weight: number;
};

type SeedParty = {
  name: string;
  type: 'customer' | 'supplier' | 'both';
  phone: string;
  city: string;
  stateCode: string;
  gstin?: string;
  opening?: number;
  /** Buys on credit and in bulk. Drives the khata and the outstanding report. */
  wholesale?: boolean;
};

type Shop = {
  seed: number;
  owner: { name: string; email: string; phone: string };
  business: {
    name: string;
    legalName: string;
    stateCode: string;
    gstin: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    pincode: string;
    phone: string;
    email: string;
  };
  settings: {
    taxMode: TaxMode;
    terms: string;
    footer: string;
    whatsapp: string;
  };
  seriesPrefix: string;
  categories: string[];
  products: SeedProduct[];
  parties: SeedParty[];
  /** Bills on a normal weekday. Weekends and month-ends move around it. */
  billsPerDay: [number, number];
  linesPerBill: [number, number];
  qtyPerLine: [number, number];
  /** How often a bill goes out on credit rather than being settled at the counter. */
  creditRate: number;
  methods: PaymentMethod[];
  /**
   * Why things come back, in this trade.
   *
   * Per shop rather than shared: "size did not fit" against a bag of atta, or
   * "expired" against a pair of trousers, is the sort of detail that makes a
   * demo look generated the moment anyone reads it. `damaged` reasons are the
   * ones that do not go back on the shelf.
   */
  returnReasons: { restock: string[]; damaged: string[] };
};

const SHOPS: Shop[] = [
  // ---------------------------------------------------- 1. kirana, Kanpur --
  {
    seed: 20260601,
    owner: {
      name: 'Rakesh Sharma',
      email: 'rakesh@demo.billwise.in',
      phone: '9839112204',
    },
    business: {
      name: 'Sharma Kirana & General Store',
      legalName: 'Sharma Kirana And General Store',
      stateCode: '09',
      gstin: gstin('09', 'AACPS4571K'),
      addressLine1: 'Shop 14, Naveen Market',
      addressLine2: 'Near Ghanta Ghar',
      city: 'Kanpur',
      pincode: '208001',
      phone: '9839112204',
      email: 'sharmakirana@demo.billwise.in',
    },
    settings: {
      taxMode: 'inclusive',
      terms: 'Goods once sold will not be taken back without the bill.\nPlease check the items before leaving the counter.',
      footer: 'Thank you for shopping with us. Home delivery available on orders above ₹500.',
      whatsapp: '9839112204',
    },
    seriesPrefix: 'SKS-',
    categories: [
      'Atta, Rice & Dal',
      'Oil & Ghee',
      'Masala & Spices',
      'Biscuits & Snacks',
      'Beverages',
      'Household',
      'Personal Care',
    ],
    products: [
      { name: 'Aashirvaad Shudh Chakki Atta 5 kg', sku: 'ATA-AAS-5', hsn: '1101', tax: '5', unit: 'PKT', sale: 285, cost: 252, opening: 140, low: 25, category: 'Atta, Rice & Dal', weight: 9 },
      { name: 'Fortune Chakki Fresh Atta 10 kg', sku: 'ATA-FOR-10', hsn: '1101', tax: '5', unit: 'PKT', sale: 520, cost: 468, opening: 70, low: 12, category: 'Atta, Rice & Dal', weight: 5 },
      { name: 'India Gate Basmati Rice 5 kg', sku: 'RIC-IGB-5', hsn: '1006', tax: '5', unit: 'PKT', sale: 690, cost: 615, opening: 55, low: 10, category: 'Atta, Rice & Dal', weight: 4 },
      { name: 'Sonamasuri Rice (loose)', sku: 'RIC-SON-L', hsn: '1006', tax: '5', unit: 'KGS', sale: 62, cost: 54, opening: 400, low: 60, category: 'Atta, Rice & Dal', weight: 7 },
      { name: 'Toor Dal (Arhar)', sku: 'DAL-TOO-L', hsn: '0713', tax: '0', unit: 'KGS', sale: 168, cost: 148, opening: 220, low: 40, category: 'Atta, Rice & Dal', weight: 8 },
      { name: 'Moong Dal Dhuli', sku: 'DAL-MOO-L', hsn: '0713', tax: '0', unit: 'KGS', sale: 142, cost: 124, opening: 160, low: 30, category: 'Atta, Rice & Dal', weight: 5 },
      { name: 'Chana Dal', sku: 'DAL-CHA-L', hsn: '0713', tax: '0', unit: 'KGS', sale: 96, cost: 84, opening: 180, low: 30, category: 'Atta, Rice & Dal', weight: 5 },
      { name: 'Rajma Chitra', sku: 'DAL-RAJ-L', hsn: '0713', tax: '0', unit: 'KGS', sale: 158, cost: 138, opening: 90, low: 20, category: 'Atta, Rice & Dal', weight: 3 },
      { name: 'Fortune Sunflower Refined Oil 1 L', sku: 'OIL-FOR-1', hsn: '1512', tax: '5', unit: 'LTR', sale: 158, cost: 141, opening: 200, low: 40, category: 'Oil & Ghee', weight: 9 },
      { name: 'Saffola Gold Oil 5 L Jar', sku: 'OIL-SAF-5', hsn: '1512', tax: '5', unit: 'PCS', sale: 895, cost: 812, opening: 45, low: 8, category: 'Oil & Ghee', weight: 3 },
      { name: 'Dhara Mustard Oil 1 L', sku: 'OIL-DHA-1', hsn: '1514', tax: '5', unit: 'LTR', sale: 172, cost: 154, opening: 150, low: 30, category: 'Oil & Ghee', weight: 6 },
      { name: 'Amul Pure Ghee 1 L', sku: 'GHE-AMU-1', hsn: '0405', tax: '5', unit: 'LTR', sale: 645, cost: 592, opening: 60, low: 12, category: 'Oil & Ghee', weight: 4 },
      { name: 'Tata Salt 1 kg', sku: 'MAS-TSL-1', hsn: '2501', tax: '5', unit: 'PKT', sale: 28, cost: 24, opening: 300, low: 50, category: 'Masala & Spices', weight: 10 },
      { name: 'Everest Garam Masala 100 g', sku: 'MAS-EGM-100', hsn: '0910', tax: '5', unit: 'PKT', sale: 78, cost: 66, opening: 180, low: 30, category: 'Masala & Spices', weight: 6 },
      { name: 'MDH Deggi Mirch 100 g', sku: 'MAS-MDM-100', hsn: '0904', tax: '5', unit: 'PKT', sale: 92, cost: 79, opening: 140, low: 25, category: 'Masala & Spices', weight: 5 },
      { name: 'Catch Haldi Powder 200 g', sku: 'MAS-CHP-200', hsn: '0910', tax: '5', unit: 'PKT', sale: 64, cost: 54, opening: 160, low: 30, category: 'Masala & Spices', weight: 5 },
      { name: 'Parle-G Gold Biscuit 200 g', sku: 'BIS-PGG-200', hsn: '1905', tax: '5', unit: 'PKT', sale: 40, cost: 33, opening: 400, low: 60, category: 'Biscuits & Snacks', weight: 9 },
      { name: 'Britannia Good Day Cashew 200 g', sku: 'BIS-BGD-200', hsn: '1905', tax: '5', unit: 'PKT', sale: 55, cost: 46, opening: 320, low: 50, category: 'Biscuits & Snacks', weight: 7 },
      { name: 'Haldiram Aloo Bhujia 400 g', sku: 'SNK-HAB-400', hsn: '2106', tax: '5', unit: 'PKT', sale: 105, cost: 89, opening: 220, low: 40, category: 'Biscuits & Snacks', weight: 6 },
      { name: 'Lays Classic Salted 52 g', sku: 'SNK-LAY-52', hsn: '2005', tax: '5', unit: 'PKT', sale: 20, cost: 16, opening: 500, low: 80, category: 'Biscuits & Snacks', weight: 8 },
      { name: 'Tata Tea Premium 500 g', sku: 'BEV-TTP-500', hsn: '0902', tax: '5', unit: 'PKT', sale: 285, cost: 254, opening: 150, low: 25, category: 'Beverages', weight: 7 },
      { name: 'Nescafe Classic 50 g', sku: 'BEV-NES-50', hsn: '2101', tax: '5', unit: 'PCS', sale: 175, cost: 152, opening: 110, low: 20, category: 'Beverages', weight: 4 },
      { name: 'Bournvita 500 g', sku: 'BEV-BOU-500', hsn: '1806', tax: '5', unit: 'PCS', sale: 245, cost: 214, opening: 95, low: 18, category: 'Beverages', weight: 4 },
      { name: 'Thums Up 750 ml', sku: 'BEV-THU-750', hsn: '2202', tax: '40', unit: 'PCS', sale: 45, cost: 36, opening: 240, low: 40, category: 'Beverages', weight: 6 },
      { name: 'Surf Excel Easy Wash 1 kg', sku: 'HOU-SEE-1', hsn: '3402', tax: '5', unit: 'PKT', sale: 145, cost: 126, opening: 180, low: 30, category: 'Household', weight: 7 },
      { name: 'Vim Dishwash Bar 300 g', sku: 'HOU-VIM-300', hsn: '3401', tax: '5', unit: 'PCS', sale: 32, cost: 26, opening: 350, low: 60, category: 'Household', weight: 7 },
      { name: 'Harpic Power Plus 500 ml', sku: 'HOU-HAR-500', hsn: '3402', tax: '18', unit: 'PCS', sale: 98, cost: 82, opening: 140, low: 25, category: 'Household', weight: 4 },
      { name: 'Colgate Strong Teeth 200 g', sku: 'PER-COL-200', hsn: '3306', tax: '5', unit: 'PCS', sale: 118, cost: 99, opening: 200, low: 35, category: 'Personal Care', weight: 6 },
      { name: 'Dove Cream Beauty Bar 100 g', sku: 'PER-DOV-100', hsn: '3401', tax: '5', unit: 'PCS', sale: 68, cost: 57, opening: 260, low: 45, category: 'Personal Care', weight: 6 },
      { name: 'Clinic Plus Shampoo 340 ml', sku: 'PER-CLP-340', hsn: '3305', tax: '5', unit: 'PCS', sale: 210, cost: 181, opening: 130, low: 25, category: 'Personal Care', weight: 4 },
    ],
    parties: [
      { name: 'Walk-in Customer', type: 'customer', phone: '', city: 'Kanpur', stateCode: '09' },
      { name: 'Anil Gupta', type: 'customer', phone: '9415223301', city: 'Kanpur', stateCode: '09' },
      { name: 'Sunita Devi', type: 'customer', phone: '9838445512', city: 'Kanpur', stateCode: '09' },
      { name: 'Mohd Irfan', type: 'customer', phone: '9721338890', city: 'Kanpur', stateCode: '09' },
      { name: 'Priya Awasthi', type: 'customer', phone: '9793001126', city: 'Kanpur', stateCode: '09' },
      { name: 'Ramesh Yadav', type: 'customer', phone: '9451227744', city: 'Kanpur', stateCode: '09', opening: 1250 },
      { name: 'Kavita Singh', type: 'customer', phone: '9889112233', city: 'Kanpur', stateCode: '09' },
      { name: 'Deepak Tiwari', type: 'customer', phone: '9305667788', city: 'Unnao', stateCode: '09' },
      { name: 'Shabana Khatoon', type: 'customer', phone: '9598223311', city: 'Kanpur', stateCode: '09' },
      { name: 'Sanjay Verma', type: 'customer', phone: '9455889900', city: 'Kanpur', stateCode: '09' },
      { name: 'Nutan Sweets & Caterers', type: 'customer', phone: '9839554400', city: 'Kanpur', stateCode: '09', gstin: gstin('09', 'AAGFN2214H'), wholesale: true, opening: 8400 },
      { name: 'Shri Ram Tiffin Service', type: 'customer', phone: '9415667712', city: 'Kanpur', stateCode: '09', gstin: gstin('09', 'AAHFS9903J'), wholesale: true },
      { name: 'Bal Vidya Mandir Hostel', type: 'customer', phone: '9336441122', city: 'Kanpur', stateCode: '09', gstin: gstin('09', 'AAATB1187M'), wholesale: true, opening: 15600 },
      { name: 'Krishna Dhaba', type: 'customer', phone: '9838772210', city: 'Kanpur', stateCode: '09', wholesale: true },
      { name: 'Agarwal Wholesale Traders', type: 'supplier', phone: '9839001188', city: 'Kanpur', stateCode: '09', gstin: gstin('09', 'AAECA5512P') },
      { name: 'Balaji Distributors', type: 'supplier', phone: '9415889977', city: 'Lucknow', stateCode: '09', gstin: gstin('09', 'AABCB7741L') },
      { name: 'Hindustan Unilever Depot', type: 'supplier', phone: '9820114455', city: 'Mumbai', stateCode: '27', gstin: gstin('27', 'AAACH1024K') },
    ],
    billsPerDay: [7, 13],
    linesPerBill: [1, 6],
    qtyPerLine: [1, 4],
    creditRate: 0.14,
    methods: ['cash', 'cash', 'cash', 'upi', 'upi', 'upi', 'card'],
    returnReasons: {
      restock: [
        'Extra item billed by mistake',
        'Customer changed their mind',
        'Wrong brand picked up',
        'Ordered on phone, not needed now',
      ],
      damaged: ['Packet torn, leaking', 'Near expiry, customer refused', 'Damaged in the crate'],
    },
  },

  // ----------------------------------------------- 2. electronics, Delhi --
  {
    seed: 20260602,
    owner: {
      name: 'Nitin Verma',
      email: 'nitin@demo.billwise.in',
      phone: '9811332255',
    },
    business: {
      name: 'Verma Electronics & Mobile Point',
      legalName: 'Verma Electronics And Mobile Point',
      stateCode: '07',
      gstin: gstin('07', 'AAFPV3390D'),
      addressLine1: 'G-22, Gaffar Market',
      addressLine2: 'Karol Bagh',
      city: 'New Delhi',
      pincode: '110005',
      phone: '9811332255',
      email: 'vermaelectronics@demo.billwise.in',
    },
    settings: {
      taxMode: 'exclusive',
      terms: 'Warranty is as per the manufacturer and is handled at their service centre.\nNo replacement for physical or liquid damage.\nPlease retain this bill for any warranty claim.',
      footer: 'Subject to Delhi jurisdiction. E&OE.',
      whatsapp: '9811332255',
    },
    seriesPrefix: 'VEM-',
    categories: [
      'Mobile Phones',
      'Audio',
      'Chargers & Cables',
      'Power Banks',
      'Smart Watches',
      'Accessories',
      'Home Appliances',
    ],
    products: [
      { name: 'Redmi 14C 6GB 128GB Midnight Black', sku: 'MOB-RD14C-6128', hsn: '8517', tax: '18', unit: 'PCS', sale: 9499, cost: 8650, opening: 30, low: 5, category: 'Mobile Phones', weight: 5 },
      { name: 'Realme Narzo 70 5G 8GB 128GB', sku: 'MOB-RN70-8128', hsn: '8517', tax: '18', unit: 'PCS', sale: 15999, cost: 14700, opening: 22, low: 4, category: 'Mobile Phones', weight: 4 },
      { name: 'Samsung Galaxy M15 5G 6GB 128GB', sku: 'MOB-SGM15-6128', hsn: '8517', tax: '18', unit: 'PCS', sale: 13499, cost: 12400, opening: 25, low: 4, category: 'Mobile Phones', weight: 4 },
      { name: 'Vivo T3x 5G 8GB 128GB', sku: 'MOB-VT3X-8128', hsn: '8517', tax: '18', unit: 'PCS', sale: 14999, cost: 13800, opening: 18, low: 3, category: 'Mobile Phones', weight: 3 },
      { name: 'Nokia 106 Keypad Phone', sku: 'MOB-NK106', hsn: '8517', tax: '18', unit: 'PCS', sale: 1499, cost: 1240, opening: 60, low: 10, category: 'Mobile Phones', weight: 6 },
      { name: 'boAt Airdopes 141 TWS Earbuds', sku: 'AUD-BAD141', hsn: '8518', tax: '18', unit: 'PCS', sale: 1299, cost: 940, opening: 90, low: 15, category: 'Audio', weight: 9 },
      { name: 'Boult Z40 Pro TWS Earbuds', sku: 'AUD-BZ40P', hsn: '8518', tax: '18', unit: 'PCS', sale: 1499, cost: 1080, opening: 70, low: 12, category: 'Audio', weight: 7 },
      { name: 'JBL Go 3 Bluetooth Speaker', sku: 'AUD-JBLG3', hsn: '8518', tax: '18', unit: 'PCS', sale: 3299, cost: 2740, opening: 40, low: 8, category: 'Audio', weight: 5 },
      { name: 'boAt Rockerz 255 Pro Neckband', sku: 'AUD-BRZ255', hsn: '8518', tax: '18', unit: 'PCS', sale: 1199, cost: 890, opening: 80, low: 15, category: 'Audio', weight: 6 },
      { name: 'Zebronics Wired Earphone ZEB-Calyx', sku: 'AUD-ZCAL', hsn: '8518', tax: '18', unit: 'PCS', sale: 249, cost: 165, opening: 200, low: 30, category: 'Audio', weight: 8 },
      { name: 'Samsung 25W Type-C Charger', sku: 'CHG-SAM25', hsn: '8504', tax: '18', unit: 'PCS', sale: 1399, cost: 1090, opening: 100, low: 20, category: 'Chargers & Cables', weight: 8 },
      { name: 'Mi 33W SonicCharge Adapter', sku: 'CHG-MI33', hsn: '8504', tax: '18', unit: 'PCS', sale: 999, cost: 760, opening: 110, low: 20, category: 'Chargers & Cables', weight: 8 },
      { name: 'Type-C to Type-C Cable 1 m 60W', sku: 'CBL-CC60', hsn: '8544', tax: '18', unit: 'PCS', sale: 349, cost: 210, opening: 250, low: 40, category: 'Chargers & Cables', weight: 10 },
      { name: 'Micro USB Cable 1 m', sku: 'CBL-MU1', hsn: '8544', tax: '18', unit: 'PCS', sale: 149, cost: 78, opening: 300, low: 50, category: 'Chargers & Cables', weight: 9 },
      { name: 'Car Charger Dual Port 20W', sku: 'CHG-CAR20', hsn: '8504', tax: '18', unit: 'PCS', sale: 599, cost: 395, opening: 90, low: 15, category: 'Chargers & Cables', weight: 5 },
      { name: 'Mi Power Bank 3i 10000 mAh', sku: 'PWB-MI10K', hsn: '8507', tax: '18', unit: 'PCS', sale: 1799, cost: 1480, opening: 55, low: 10, category: 'Power Banks', weight: 6 },
      { name: 'Ambrane 20000 mAh Power Bank', sku: 'PWB-AMB20K', hsn: '8507', tax: '18', unit: 'PCS', sale: 2499, cost: 2010, opening: 35, low: 6, category: 'Power Banks', weight: 4 },
      { name: 'Noise ColorFit Pro 5 Smart Watch', sku: 'WCH-NCF5', hsn: '9102', tax: '18', unit: 'PCS', sale: 3499, cost: 2790, opening: 45, low: 8, category: 'Smart Watches', weight: 5 },
      { name: 'Fire-Boltt Ninja Call Pro Plus', sku: 'WCH-FBNCP', hsn: '9102', tax: '18', unit: 'PCS', sale: 1999, cost: 1520, opening: 60, low: 10, category: 'Smart Watches', weight: 5 },
      { name: 'Tempered Glass Screen Guard', sku: 'ACC-TGSG', hsn: '7007', tax: '18', unit: 'PCS', sale: 199, cost: 62, opening: 500, low: 80, category: 'Accessories', weight: 12 },
      { name: 'Silicone Back Cover (assorted)', sku: 'ACC-SBC', hsn: '3926', tax: '18', unit: 'PCS', sale: 249, cost: 88, opening: 400, low: 60, category: 'Accessories', weight: 11 },
      { name: 'Mobile Holder Car Mount', sku: 'ACC-MHCM', hsn: '3926', tax: '18', unit: 'PCS', sale: 449, cost: 245, opening: 120, low: 20, category: 'Accessories', weight: 5 },
      { name: 'OTG Adapter Type-C', sku: 'ACC-OTGC', hsn: '8536', tax: '18', unit: 'PCS', sale: 199, cost: 85, opening: 220, low: 40, category: 'Accessories', weight: 6 },
      { name: 'SanDisk 64GB Class 10 Memory Card', sku: 'ACC-SD64', hsn: '8523', tax: '18', unit: 'PCS', sale: 649, cost: 480, opening: 140, low: 25, category: 'Accessories', weight: 7 },
      { name: 'Bajaj Rex 500W Mixer Grinder', sku: 'APP-BJRX', hsn: '8509', tax: '18', unit: 'PCS', sale: 3299, cost: 2680, opening: 25, low: 5, category: 'Home Appliances', weight: 3 },
      { name: 'Philips HD4938 Induction Cooktop', sku: 'APP-PHIC', hsn: '8516', tax: '18', unit: 'PCS', sale: 2799, cost: 2310, opening: 20, low: 4, category: 'Home Appliances', weight: 3 },
      { name: 'Usha Table Fan 400 mm', sku: 'APP-USTF', hsn: '8414', tax: '18', unit: 'PCS', sale: 2199, cost: 1790, opening: 30, low: 6, category: 'Home Appliances', weight: 3 },
      { name: 'Extension Board 4 Socket 2 m', sku: 'APP-EXT4', hsn: '8536', tax: '18', unit: 'PCS', sale: 549, cost: 360, opening: 150, low: 25, category: 'Home Appliances', weight: 6 },
    ],
    parties: [
      { name: 'Walk-in Customer', type: 'customer', phone: '', city: 'New Delhi', stateCode: '07' },
      { name: 'Aditya Malhotra', type: 'customer', phone: '9910223344', city: 'New Delhi', stateCode: '07' },
      { name: 'Farhan Qureshi', type: 'customer', phone: '9873112200', city: 'New Delhi', stateCode: '07' },
      { name: 'Neha Chopra', type: 'customer', phone: '9818445566', city: 'New Delhi', stateCode: '07' },
      { name: 'Vikas Rathi', type: 'customer', phone: '9971228833', city: 'New Delhi', stateCode: '07' },
      { name: 'Simran Kaur', type: 'customer', phone: '9899007711', city: 'New Delhi', stateCode: '07' },
      { name: 'Rohit Sethi', type: 'customer', phone: '9953664422', city: 'New Delhi', stateCode: '07' },
      { name: 'Digital Zone Retail', type: 'customer', phone: '9811556677', city: 'New Delhi', stateCode: '07', gstin: gstin('07', 'AAFCD8812R'), wholesale: true, opening: 42500 },
      { name: 'Gurgaon Mobile Hub', type: 'customer', phone: '9812334455', city: 'Gurugram', stateCode: '06', gstin: gstin('06', 'AAGCG1190N'), wholesale: true, opening: 18900 },
      { name: 'Noida Gadget Corner', type: 'customer', phone: '9911778822', city: 'Noida', stateCode: '09', gstin: gstin('09', 'AABCN6634T'), wholesale: true },
      { name: 'Jaipur Telecom Mart', type: 'customer', phone: '9829445511', city: 'Jaipur', stateCode: '08', gstin: gstin('08', 'AACCJ2276F'), wholesale: true, opening: 31200 },
      { name: 'Sunrise Public School', type: 'customer', phone: '9868112233', city: 'New Delhi', stateCode: '07', gstin: gstin('07', 'AAATS4419Q'), wholesale: true },
      { name: 'Kapoor Telecom Distributors', type: 'supplier', phone: '9810012345', city: 'New Delhi', stateCode: '07', gstin: gstin('07', 'AAECK3345B') },
      { name: 'Shree Mobile Wholesale', type: 'supplier', phone: '9820556677', city: 'Mumbai', stateCode: '27', gstin: gstin('27', 'AAFCS7719W') },
    ],
    billsPerDay: [3, 7],
    linesPerBill: [1, 4],
    qtyPerLine: [1, 3],
    creditRate: 0.26,
    methods: ['upi', 'upi', 'card', 'card', 'cash', 'bank'],
    returnReasons: {
      restock: [
        'Customer wanted a different model',
        'Colour not available, exchanged',
        'Extra piece billed by mistake',
        'Cancelled before delivery',
      ],
      damaged: [
        'Dead on arrival, sent to service centre',
        'Screen cracked inside the box',
        'Charging fault reported the same day',
      ],
    },
  },

  // -------------------------------------------------- 3. garments, Pune ---
  {
    seed: 20260603,
    owner: {
      name: 'Anjali Deshmukh',
      email: 'anjali@demo.billwise.in',
      phone: '9822114477',
    },
    business: {
      name: 'Anjali Fashion & Garments',
      legalName: 'Anjali Fashion And Garments',
      stateCode: '27',
      gstin: gstin('27', 'AALPD2287E'),
      addressLine1: '3rd Lane, Laxmi Road',
      addressLine2: 'Budhwar Peth',
      city: 'Pune',
      pincode: '411002',
      phone: '9822114477',
      email: 'anjalifashion@demo.billwise.in',
    },
    settings: {
      taxMode: 'exclusive',
      terms: 'Exchange within 7 days with the original bill and tags intact.\nNo exchange on stitched, altered or discounted items.',
      footer: 'Alterations done in-house. Bulk and wedding orders welcome.',
      whatsapp: '9822114477',
    },
    seriesPrefix: 'AFG-',
    categories: [
      'Sarees',
      'Kurtis & Suits',
      'Mens Shirts',
      'Mens Trousers',
      'Kids Wear',
      'Dupatta & Stoles',
      'Innerwear',
    ],
    products: [
      { name: 'Banarasi Silk Saree with Blouse Piece', sku: 'SAR-BAN-01', hsn: '5407', tax: '5', unit: 'PCS', sale: 3450, cost: 2680, opening: 40, low: 8, category: 'Sarees', weight: 5 },
      { name: 'Paithani Semi-Silk Saree', sku: 'SAR-PAI-01', hsn: '5407', tax: '5', unit: 'PCS', sale: 4890, cost: 3900, opening: 25, low: 5, category: 'Sarees', weight: 3 },
      { name: 'Cotton Handloom Saree', sku: 'SAR-COT-01', hsn: '5208', tax: '5', unit: 'PCS', sale: 1250, cost: 890, opening: 70, low: 12, category: 'Sarees', weight: 7 },
      { name: 'Georgette Printed Saree', sku: 'SAR-GEO-01', hsn: '5407', tax: '5', unit: 'PCS', sale: 1650, cost: 1180, opening: 60, low: 10, category: 'Sarees', weight: 6 },
      { name: 'Chiffon Daily Wear Saree', sku: 'SAR-CHF-01', hsn: '5407', tax: '5', unit: 'PCS', sale: 890, cost: 610, opening: 90, low: 15, category: 'Sarees', weight: 7 },
      { name: 'Rayon Straight Kurti (M)', sku: 'KUR-RAY-M', hsn: '6106', tax: '5', unit: 'PCS', sale: 749, cost: 480, opening: 120, low: 20, category: 'Kurtis & Suits', weight: 9 },
      { name: 'Rayon Straight Kurti (L)', sku: 'KUR-RAY-L', hsn: '6106', tax: '5', unit: 'PCS', sale: 749, cost: 480, opening: 120, low: 20, category: 'Kurtis & Suits', weight: 9 },
      { name: 'Cotton Anarkali Kurti (XL)', sku: 'KUR-ANA-XL', hsn: '6106', tax: '5', unit: 'PCS', sale: 1149, cost: 760, opening: 80, low: 15, category: 'Kurtis & Suits', weight: 6 },
      { name: 'Unstitched Cotton Suit Set', sku: 'SUT-UNC-01', hsn: '5208', tax: '5', unit: 'PCS', sale: 1290, cost: 880, opening: 75, low: 12, category: 'Kurtis & Suits', weight: 6 },
      { name: 'Palazzo Pant Rayon (Free Size)', sku: 'KUR-PLZ-FS', hsn: '6104', tax: '5', unit: 'PCS', sale: 449, cost: 268, opening: 160, low: 25, category: 'Kurtis & Suits', weight: 8 },
      { name: 'Mens Formal Shirt Cotton (40)', sku: 'SHT-FRM-40', hsn: '6205', tax: '5', unit: 'PCS', sale: 899, cost: 590, opening: 100, low: 18, category: 'Mens Shirts', weight: 8 },
      { name: 'Mens Formal Shirt Cotton (42)', sku: 'SHT-FRM-42', hsn: '6205', tax: '5', unit: 'PCS', sale: 899, cost: 590, opening: 100, low: 18, category: 'Mens Shirts', weight: 8 },
      { name: 'Mens Casual Check Shirt (M)', sku: 'SHT-CAS-M', hsn: '6205', tax: '5', unit: 'PCS', sale: 749, cost: 470, opening: 110, low: 20, category: 'Mens Shirts', weight: 7 },
      { name: 'Mens Cotton Trouser (32)', sku: 'TRO-COT-32', hsn: '6203', tax: '5', unit: 'PCS', sale: 1099, cost: 720, opening: 85, low: 15, category: 'Mens Trousers', weight: 6 },
      { name: 'Mens Cotton Trouser (34)', sku: 'TRO-COT-34', hsn: '6203', tax: '5', unit: 'PCS', sale: 1099, cost: 720, opening: 85, low: 15, category: 'Mens Trousers', weight: 6 },
      { name: 'Mens Denim Jeans Slim Fit (32)', sku: 'TRO-DEN-32', hsn: '6203', tax: '5', unit: 'PCS', sale: 1399, cost: 940, opening: 70, low: 12, category: 'Mens Trousers', weight: 6 },
      { name: 'Kids Frock Cotton (4-5 yrs)', sku: 'KID-FRK-45', hsn: '6209', tax: '5', unit: 'PCS', sale: 549, cost: 330, opening: 90, low: 15, category: 'Kids Wear', weight: 6 },
      { name: 'Kids T-Shirt & Shorts Set', sku: 'KID-TSS-01', hsn: '6209', tax: '5', unit: 'PCS', sale: 449, cost: 262, opening: 120, low: 20, category: 'Kids Wear', weight: 7 },
      { name: 'Kids School Uniform Shirt', sku: 'KID-UNI-SH', hsn: '6205', tax: '5', unit: 'PCS', sale: 379, cost: 215, opening: 200, low: 35, category: 'Kids Wear', weight: 8 },
      { name: 'Chanderi Dupatta', sku: 'DUP-CHA-01', hsn: '6214', tax: '5', unit: 'PCS', sale: 549, cost: 320, opening: 130, low: 22, category: 'Dupatta & Stoles', weight: 7 },
      { name: 'Phulkari Dupatta', sku: 'DUP-PHU-01', hsn: '6214', tax: '5', unit: 'PCS', sale: 899, cost: 560, opening: 70, low: 12, category: 'Dupatta & Stoles', weight: 5 },
      { name: 'Woollen Stole', sku: 'DUP-WST-01', hsn: '6214', tax: '5', unit: 'PCS', sale: 649, cost: 390, opening: 60, low: 10, category: 'Dupatta & Stoles', weight: 4 },
      { name: 'Cotton Vest Pack of 3', sku: 'INR-VST-3', hsn: '6109', tax: '5', unit: 'PKT', sale: 399, cost: 232, opening: 180, low: 30, category: 'Innerwear', weight: 8 },
      { name: 'Ladies Cotton Legging (Free Size)', sku: 'INR-LEG-FS', hsn: '6104', tax: '5', unit: 'PCS', sale: 349, cost: 195, opening: 220, low: 35, category: 'Innerwear', weight: 9 },
      { name: 'Handkerchief Cotton Pack of 6', sku: 'INR-HKF-6', hsn: '6213', tax: '5', unit: 'PKT', sale: 199, cost: 108, opening: 200, low: 35, category: 'Innerwear', weight: 6 },
      { name: 'Designer Lehenga Choli Set', sku: 'SAR-LEH-01', hsn: '6204', tax: '5', unit: 'PCS', sale: 8990, cost: 7100, opening: 15, low: 3, category: 'Sarees', weight: 2 },
      { name: 'Nehru Jacket Silk Blend', sku: 'SHT-NJK-01', hsn: '6203', tax: '5', unit: 'PCS', sale: 1799, cost: 1180, opening: 45, low: 8, category: 'Mens Shirts', weight: 4 },
      { name: 'Saree Fall & Pico (service)', sku: 'SRV-FLP', hsn: '9988', tax: '18', unit: 'PCS', sale: 120, cost: 0, opening: 0, low: 0, category: 'Sarees', weight: 5 },
    ],
    parties: [
      { name: 'Walk-in Customer', type: 'customer', phone: '', city: 'Pune', stateCode: '27' },
      { name: 'Shweta Joshi', type: 'customer', phone: '9890112233', city: 'Pune', stateCode: '27' },
      { name: 'Manisha Patil', type: 'customer', phone: '9764223344', city: 'Pune', stateCode: '27' },
      { name: 'Sneha Kulkarni', type: 'customer', phone: '9822556677', city: 'Pune', stateCode: '27' },
      { name: 'Rupali Shinde', type: 'customer', phone: '9730114455', city: 'Pimpri', stateCode: '27' },
      { name: 'Amol Jadhav', type: 'customer', phone: '9028447711', city: 'Pune', stateCode: '27' },
      { name: 'Pooja Bhosale', type: 'customer', phone: '9096223311', city: 'Pune', stateCode: '27' },
      { name: 'Vaishali Pawar', type: 'customer', phone: '9850667788', city: 'Pune', stateCode: '27', opening: 2400 },
      { name: 'Shagun Boutique', type: 'customer', phone: '9822998877', city: 'Pune', stateCode: '27', gstin: gstin('27', 'AAGFS3341C'), wholesale: true, opening: 22800 },
      { name: 'Trendz Collection Nashik', type: 'customer', phone: '9860114422', city: 'Nashik', stateCode: '27', gstin: gstin('27', 'AABCT5590G'), wholesale: true },
      { name: 'Rangoli Fashion Hub', type: 'customer', phone: '9922334455', city: 'Solapur', stateCode: '27', gstin: gstin('27', 'AACFR8823H'), wholesale: true, opening: 9750 },
      { name: 'Sunrise Uniforms Bengaluru', type: 'customer', phone: '9845112233', city: 'Bengaluru', stateCode: '29', gstin: gstin('29', 'AAECS4417M'), wholesale: true, opening: 36400 },
      { name: 'Surat Textile Mills', type: 'supplier', phone: '9825001122', city: 'Surat', stateCode: '24', gstin: gstin('24', 'AAACS9911V') },
      { name: 'Ichalkaranji Handloom Co-op', type: 'supplier', phone: '9975334455', city: 'Ichalkaranji', stateCode: '27', gstin: gstin('27', 'AAAAI2278R') },
    ],
    billsPerDay: [4, 9],
    linesPerBill: [1, 5],
    qtyPerLine: [1, 3],
    creditRate: 0.2,
    methods: ['upi', 'upi', 'cash', 'cash', 'card', 'bank'],
    returnReasons: {
      restock: [
        'Size did not fit',
        'Colour did not match the set',
        'Customer changed their mind',
        'Exchanged for another piece',
      ],
      damaged: ['Stitching came apart', 'Colour bled in the first wash', 'Torn at the seam'],
    },
  },
];

// ------------------------------------------------------------ generation ---

type LiveProduct = SeedProduct & {
  id: string;
  taxRateId: string | null;
  unitId: string | null;
  /** What is on the shelf right now, as the simulation walks forward. */
  onHand: number;
  /** Sum of every movement written, so the final rollup is the ledger's own total. */
  delta: number;
};

type LiveParty = SeedParty & { id: string };

/** Pick a product, weighted so staples appear far more often than big-ticket items. */
function weightedProduct(r: Rand, pool: LiveProduct[]): LiveProduct {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let n = r() * total;
  for (const p of pool) {
    n -= p.weight;
    if (n <= 0) return p;
  }
  return pool[pool.length - 1]!;
}

/**
 * How busy a given day is.
 *
 * Sundays are quieter, Saturdays busier, and the first week of the month is
 * strong because that is when salaries land. Flat traffic would make every
 * chart in the app a straight line, which tells nobody anything.
 */
function dayBusyness(day: Date, r: Rand): number {
  const dow = day.getUTCDay();
  const dom = day.getUTCDate();
  let f = 1;
  if (dow === 0) f *= 0.55;
  if (dow === 6) f *= 1.35;
  if (dom <= 7) f *= 1.25;
  if (dom >= 26) f *= 0.85;
  return f * (0.75 + r() * 0.5);
}

async function seedShop(shop: Shop): Promise<void> {
  const r = rng(shop.seed);
  const log = (msg: string) => console.warn(`  ${msg}`);

  // 1. The account, through the ordinary signup path.
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const reg = await registerOwner({
    name: shop.owner.name,
    email: shop.owner.email,
    phone: shop.owner.phone,
    passwordHash,
    businessName: shop.business.name,
    stateCode: shop.business.stateCode,
  });

  const ctx = { businessId: reg.businessId, userId: reg.userId, role: 'owner' as const };
  log(`account created — ${shop.owner.email} (/store/${reg.slug})`);

  // 2. Profile, settings and a paid subscription.
  await updateBusinessProfile(ctx, {
    legalName: shop.business.legalName,
    gstin: shop.business.gstin,
    stateCode: shop.business.stateCode,
    addressLine1: shop.business.addressLine1,
    addressLine2: shop.business.addressLine2,
    city: shop.business.city,
    pincode: shop.business.pincode,
    phone: shop.business.phone,
    email: shop.business.email,
  });
  await updateSettings(ctx, {
    defaultTaxMode: shop.settings.taxMode,
    invoiceTerms: shop.settings.terms,
    invoiceFooter: shop.settings.footer,
    catalogEnabled: true,
    showCatalogPrices: true,
    catalogWhatsapp: shop.settings.whatsapp,
  });
  await activateDemoBusiness(ctx, {
    createdAt: SIGNUP,
    trialEndsAt: addDays(SIGNUP, 10),
    paidUntil: addDays(END, 21),
    approvedAt: addDays(SIGNUP, 10),
  });

  // 3. Masters. Units were seeded by signup; tax rates are global rows.
  const unitRows = await listUnits(ctx);
  const unitByShort = new Map(unitRows.map((u) => [u.shortName, u.id]));

  const rateRows = await listTaxRates(ctx);
  const rateByPct = new Map(rateRows.map((t) => [Number(t.rate).toString(), t.id]));

  const categoryIds = new Map<string, string>();
  for (const name of shop.categories) {
    const row = await createCategory(ctx, name);
    if (row) categoryIds.set(name, row.id);
  }

  // 4. Products.
  const productList: LiveProduct[] = [];
  for (const p of shop.products) {
    const row = await createProduct(ctx, {
      name: p.name,
      sku: p.sku,
      categoryId: categoryIds.get(p.category) ?? null,
      unitId: unitByShort.get(p.unit) ?? null,
      hsnCode: p.hsn,
      taxRateId: rateByPct.get(p.tax) ?? null,
      salePrice: p.sale.toFixed(2),
      purchasePrice: p.cost > 0 ? p.cost.toFixed(2) : null,
      openingStock: p.opening.toFixed(3),
      lowStockAlert: p.low > 0 ? p.low.toFixed(3) : null,
      // A "service" line (saree fall & pico) carries no stock. Without one of
      // these the stock screens never show the case at all.
      trackInventory: p.cost > 0,
      showInCatalog: true,
    });
    if (!row) continue;
    productList.push({
      ...p,
      id: row.id,
      taxRateId: rateByPct.get(p.tax) ?? null,
      unitId: unitByShort.get(p.unit) ?? null,
      onHand: p.opening,
      delta: 0,
    });
  }
  log(`${productList.length} products`);

  // 5. Parties.
  const partyList: LiveParty[] = [];
  for (const p of shop.parties) {
    const row = await createParty(ctx, {
      type: p.type,
      name: p.name,
      phone: p.phone || null,
      gstin: p.gstin ?? null,
      stateCode: p.stateCode,
      city: p.city,
      openingBalance: (p.opening ?? 0).toFixed(2),
    });
    if (row) partyList.push({ ...p, id: row.id });
  }
  const customers = partyList.filter((p) => p.type !== 'supplier');
  const retailCustomers = customers.filter((p) => !p.wholesale);
  const wholesaleCustomers = customers.filter((p) => p.wholesale);
  const suppliers = partyList.filter((p) => p.type === 'supplier');
  log(`${partyList.length} parties`);

  // 6. Ninety days of trade.
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
    stock: [],
  };

  const fy = financialYear(iso(START));
  // One counter per kind, exactly like `invoice_series`. Estimates must not
  // share the tax-invoice run — a gap in a GST series is a compliance problem,
  // and a quotation eating a number is how you get one.
  const shapes = {
    tax_invoice: { prefix: shop.seriesPrefix, padding: 4 },
    estimate: { prefix: `${shop.seriesPrefix}EST-`, padding: 3 },
  } as const;
  const counters: Record<'tax_invoice' | 'estimate', number> = { tax_invoice: 1, estimate: 1 };

  /** Issued invoices worth a later payment or a return. */
  type Issued = {
    id: string;
    date: Date;
    partyId: string;
    grandTotal: number;
    outstanding: number;
    isInterstate: boolean;
    lines: { id: string; productId: string; name: string; hsn: string; qty: number; rate: number; taxable: number; taxRate: number; cgst: number; sgst: number; igst: number }[];
  };
  const issued: Issued[] = [];

  for (let day = new Date(START); day < END; day = addDays(day, 1)) {
    const busy = dayBusyness(day, r);
    const base = int(r, shop.billsPerDay[0], shop.billsPerDay[1]);
    const count = Math.max(1, Math.round(base * busy));

    for (let i = 0; i < count; i++) {
      // Wholesale buyers are a minority of bills but most of the money — which
      // is the whole reason the khata and the outstanding report exist.
      const wholesale = wholesaleCustomers.length > 0 && chance(r, 0.16);
      const party = wholesale ? pick(r, wholesaleCustomers) : pick(r, retailCustomers);

      const lineCount = wholesale
        ? int(r, 2, shop.linesPerBill[1] + 2)
        : int(r, shop.linesPerBill[0], shop.linesPerBill[1]);

      const chosen = new Set<string>();
      const built: {
        product: LiveProduct;
        qty: number;
        discountPct: string;
      }[] = [];

      for (let l = 0; l < lineCount; l++) {
        const product = weightedProduct(r, productList);
        if (chosen.has(product.id)) continue;
        chosen.add(product.id);

        const qty = wholesale
          ? int(r, shop.qtyPerLine[1] * 3, shop.qtyPerLine[1] * 10)
          : int(r, shop.qtyPerLine[0], shop.qtyPerLine[1]);

        // Restock before selling, so the ledger never goes negative. A shop
        // receives goods when it is running low; so does this.
        if (product.cost > 0 && product.onHand < qty + product.low) {
          const topUp = Math.max(product.opening, qty + product.low * 2);
          const at = atHour(day, 8, int(r, 0, 55));
          ledger.movements.push({
            id: randomUUID(),
            productId: product.id,
            qtyChange: topUp.toFixed(3),
            reason: 'stock_in',
            refType: 'purchase',
            note: `Stock received — ${pick(r, suppliers)?.name ?? 'supplier'}`,
            createdBy: ctx.userId,
            createdAt: at,
          });
          product.onHand += topUp;
          product.delta += topUp;
        }

        const discountPct = wholesale
          ? pick(r, ['0', '2.5', '5', '7.5'])
          : chance(r, 0.18)
            ? pick(r, ['0', '5', '10'])
            : '0';

        built.push({ product, qty, discountPct });
      }

      if (built.length === 0) continue;

      // Estimates happen, and they must not move stock or the ledger. Keeping a
      // few in the data is the only way that path ever gets looked at.
      const kind = chance(r, 0.03) ? 'estimate' : 'tax_invoice';

      const invoiceDate = iso(day);
      const result = buildInvoice({
        kind,
        invoiceDate,
        taxMode: shop.settings.taxMode,
        supplierStateCode: shop.business.stateCode,
        partyStateCode: party.stateCode,
        partyGstin: party.gstin ?? null,
        otherCharges: wholesale && chance(r, 0.3) ? String(int(r, 100, 600)) : undefined,
        lines: built.map((b) => ({
          productId: b.product.id,
          name: b.product.name,
          hsnCode: b.product.hsn,
          unit: b.product.unit,
          qty: b.qty.toFixed(3),
          rate: b.product.sale.toFixed(2),
          discountPct: b.discountPct,
          taxRate: b.product.tax,
          cessRate: '0',
        })),
      });

      const invoiceId = randomUUID();
      const cancelled = kind === 'tax_invoice' && chance(r, 0.012);
      const invoiceNo = formatInvoiceNumber(shapes[kind], counters[kind]);
      counters[kind] += 1;

      const createdAt = atHour(day, int(r, 9, 20), int(r, 0, 59));
      const onCredit = !cancelled && (wholesale || chance(r, shop.creditRate));
      const grand = Number(result.grandTotal);

      // Money in. Counter sales settle at once; credit sales settle later, or
      // partly, or not at all — which is what fills the khata.
      let paid = 0;
      const paymentRows: { amount: number; on: Date; method: PaymentMethod }[] = [];

      if (!cancelled && kind !== 'estimate') {
        if (!onCredit) {
          paid = grand;
          paymentRows.push({ amount: grand, on: createdAt, method: pick(r, shop.methods) });
        } else {
          const roll = r();
          const daysLate = int(r, 3, 32);
          const settledOn = addDays(day, daysLate);
          // Anything that would settle after the window simply has not been
          // paid yet — the same reason a real ledger has open bills on it.
          if (settledOn < END) {
            if (roll < 0.55) {
              paid = grand;
              paymentRows.push({
                amount: grand,
                on: atHour(settledOn, int(r, 10, 19), int(r, 0, 59)),
                method: pick(r, ['upi', 'bank', 'cheque', 'cash'] as const),
              });
            } else if (roll < 0.78) {
              const part = Math.round(grand * (0.3 + r() * 0.4));
              paid = part;
              paymentRows.push({
                amount: part,
                on: atHour(settledOn, int(r, 10, 19), int(r, 0, 59)),
                method: pick(r, ['upi', 'bank', 'cash'] as const),
              });
            }
          }
        }
      }

      const paymentStatus = paid <= 0 ? 'unpaid' : paid >= grand ? 'paid' : 'partial';

      ledger.invoices.push({
        id: invoiceId,
        kind,
        status: cancelled ? 'cancelled' : 'issued',
        fy,
        invoiceNo,
        invoiceDate,
        dueDate: onCredit ? iso(addDays(day, 15)) : null,
        partyId: party.id,
        partyName: party.name,
        partyGstin: party.gstin ?? null,
        partyPhone: party.phone || null,
        partyAddress: `${party.city}, ${party.stateCode}`,
        supplierStateCode: shop.business.stateCode,
        placeOfSupply: result.placeOfSupply,
        isInterstate: result.isInterstate,
        taxMode: shop.settings.taxMode,
        subtotal: result.subtotal,
        discountTotal: result.discountTotal,
        cgstTotal: result.cgstTotal,
        sgstTotal: result.sgstTotal,
        igstTotal: result.igstTotal,
        cessTotal: result.cessTotal,
        otherCharges: result.otherCharges,
        roundOff: result.roundOff,
        grandTotal: result.grandTotal,
        amountPaid: paid.toFixed(2),
        paymentStatus,
        terms: shop.settings.terms,
        notes: wholesale && chance(r, 0.25) ? 'Delivered to godown. Transport paid by buyer.' : null,
        cancelledAt: cancelled ? atHour(addDays(day, 1), 11, 15) : null,
        cancelReason: cancelled ? pick(r, ['Wrong party selected', 'Customer cancelled the order', 'Billed twice by mistake']) : null,
        createdBy: ctx.userId,
        createdAt,
        updatedAt: createdAt,
      });

      const issuedLines: Issued['lines'] = [];

      result.lines.forEach((line, index) => {
        const lineId = randomUUID();
        ledger.lines.push({
          id: lineId,
          invoiceId,
          lineNo: index + 1,
          productId: line.productId,
          name: line.name,
          hsnCode: line.hsnCode,
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

        issuedLines.push({
          id: lineId,
          productId: line.productId!,
          name: line.name,
          hsn: line.hsnCode ?? '',
          qty: Number(line.qty),
          rate: Number(line.rate),
          taxable: Number(line.taxableValue),
          taxRate: Number(line.taxRate),
          cgst: Number(line.cgstAmount),
          sgst: Number(line.sgstAmount),
          igst: Number(line.igstAmount),
        });
      });

      // Stock. Estimates move nothing; a cancellation writes the opposite
      // movement rather than deleting the original.
      if (kind !== 'estimate') {
        for (const b of built) {
          if (b.product.cost <= 0) continue;
          ledger.movements.push({
            id: randomUUID(),
            productId: b.product.id,
            qtyChange: (-b.qty).toFixed(3),
            reason: 'sale',
            refType: 'invoice',
            refId: invoiceId,
            createdBy: ctx.userId,
            createdAt,
          });
          b.product.onHand -= b.qty;
          b.product.delta -= b.qty;

          if (cancelled) {
            const back = atHour(addDays(day, 1), 11, 15);
            ledger.movements.push({
              id: randomUUID(),
              productId: b.product.id,
              qtyChange: b.qty.toFixed(3),
              reason: 'sale_cancelled',
              refType: 'invoice',
              refId: invoiceId,
              createdBy: ctx.userId,
              createdAt: back,
            });
            b.product.onHand += b.qty;
            b.product.delta += b.qty;
          }
        }
      }

      for (const p of paymentRows) {
        ledger.payments.push({
          id: randomUUID(),
          partyId: party.id,
          invoiceId,
          amount: p.amount.toFixed(2),
          direction: 'in',
          method: p.method,
          reference: p.method === 'cheque' ? `CHQ ${int(r, 100000, 999999)}` : null,
          paidOn: iso(p.on),
          createdBy: ctx.userId,
          createdAt: p.on,
        });
      }

      ledger.audit.push(
        { invoiceId, action: 'created', changedBy: ctx.userId, snapshot: null, createdAt },
        { invoiceId, action: 'issued', changedBy: ctx.userId, snapshot: { invoiceNo }, createdAt },
      );
      if (cancelled) {
        ledger.audit.push({
          invoiceId,
          action: 'cancelled',
          changedBy: ctx.userId,
          snapshot: { reason: 'demo' },
          createdAt: atHour(addDays(day, 1), 11, 15),
        });
      }

      if (!cancelled && kind === 'tax_invoice') {
        issued.push({
          id: invoiceId,
          date: day,
          partyId: party.id,
          grandTotal: grand,
          outstanding: grand - paid,
          isInterstate: result.isInterstate,
          lines: issuedLines,
        });
      }
    }

    // A handful of catalog visitors each day, so the catalog analytics panel
    // has a shape rather than a flat zero.
    const visits = int(r, 0, 14);
    for (let v = 0; v < visits; v++) {
      ledger.views.push({
        productId: chance(r, 0.7) ? pick(r, productList).id : null,
        viewedAt: atHour(day, int(r, 8, 23), int(r, 0, 59)),
        referrer: pick(r, ['whatsapp', 'direct', 'instagram', 'google', null]),
      });
    }
  }

  // 7. Returns. Roughly one bill in forty comes partly back.
  for (const inv of issued) {
    if (!chance(r, 0.025)) continue;
    const returnDay = addDays(inv.date, int(r, 2, 20));
    if (returnDay >= END) continue;

    const line = pick(r, inv.lines);
    if (!line || line.qty < 1) continue;
    const qty = Math.max(1, Math.floor(line.qty * (r() < 0.6 ? 0.5 : 1)));
    if (qty > line.qty) continue;

    // Tax comes back in the same proportion the goods did. Recomputing it from
    // the rate instead would drift by a paisa against what was charged.
    const share = qty / line.qty;
    const part = (v: number) => (v * share).toFixed(2);
    const amount = (line.taxable + line.cgst + line.sgst + line.igst) * share;
    const restock = chance(r, 0.8);
    const returnId = randomUUID();
    const at = atHour(returnDay, int(r, 11, 18), int(r, 0, 59));

    ledger.returns.push({
      id: returnId,
      invoiceId: inv.id,
      partyId: inv.partyId,
      returnDate: iso(returnDay),
      totalAmount: amount.toFixed(2),
      reason: pick(r, restock ? shop.returnReasons.restock : shop.returnReasons.damaged),
      note: restock ? null : 'Not fit for resale — kept aside.',
      createdBy: ctx.userId,
      createdAt: at,
    });

    ledger.returnLines.push({
      id: randomUUID(),
      returnId,
      productId: line.productId,
      invoiceLineId: line.id,
      name: line.name,
      qty: qty.toFixed(3),
      rate: line.rate.toFixed(2),
      amount: amount.toFixed(2),
      hsnCode: line.hsn || null,
      taxRate: line.taxRate.toFixed(2),
      taxableValue: part(line.taxable),
      cgstAmount: part(line.cgst),
      sgstAmount: part(line.sgst),
      igstAmount: part(line.igst),
      cessAmount: '0.00',
      restock: restock ? 'yes' : 'no',
    });

    if (restock) {
      const product = productList.find((p) => p.id === line.productId);
      if (product && product.cost > 0) {
        ledger.movements.push({
          id: randomUUID(),
          productId: product.id,
          qtyChange: qty.toFixed(3),
          reason: 'sale_return',
          refType: 'sales_return',
          refId: returnId,
          createdBy: ctx.userId,
          createdAt: at,
        });
        product.delta += qty;
        product.onHand += qty;
      }
    }
  }

  // 7b. Leave a few products genuinely short.
  //
  // The restock rule above tops a product up the moment it gets near its alert
  // level, which is tidy and completely unrealistic: it means the low-stock
  // panel, the alert badge and the reorder report are all permanently empty,
  // and nobody demoing the app would ever see them work. So a handful of lines
  // get written off near the end of the period — expiry, damage, a stock take
  // that came up short — which is how a real shelf ends up bare.
  const shortlist = productList.filter((p) => p.cost > 0 && p.onHand > 0);
  for (let i = 0; i < Math.min(5, shortlist.length); i++) {
    const product = shortlist[int(r, 0, shortlist.length - 1)]!;
    if (product.onHand <= 0) continue;
    // The last one is emptied completely; the rest land just under the alert.
    const target = i === 0 ? 0 : Math.max(0, Math.floor(product.low * (0.3 + r() * 0.5)));
    const drop = product.onHand - target;
    if (drop <= 0) continue;

    const day = addDays(END, -int(r, 1, 6));
    const at = atHour(day, int(r, 17, 20), int(r, 0, 59));
    ledger.movements.push({
      id: randomUUID(),
      productId: product.id,
      qtyChange: (-drop).toFixed(3),
      reason: i === 0 ? 'stock_out' : 'adjustment',
      refType: 'stock_take',
      note: pick(r, [
        'Damaged in storage — written off',
        'Stock take: short on count',
        'Expired, removed from shelf',
        'Sample given out, not billed',
      ]),
      createdBy: ctx.userId,
      createdAt: at,
    });
    product.onHand -= drop;
    product.delta -= drop;
  }

  // 8. Housekeeping rows: the number series must continue where the data
  //    stopped, or the shop's next real invoice would collide with a demo one.
  for (const kind of ['tax_invoice', 'estimate'] as const) {
    ledger.series.push({
      kind,
      fy,
      prefix: shapes[kind].prefix,
      padding: shapes[kind].padding,
      nextNumber: counters[kind],
    });
  }

  // 9. What this shop has paid us. Three monthly renewals since the trial.
  for (let m = 0; m < 3; m++) {
    const on = addDays(SIGNUP, 10 + m * 30);
    ledger.subscriptions.push({
      id: randomUUID(),
      provider: 'razorpay',
      providerRef: `qr_demo_${shop.seed}_${m}`,
      paymentRef: `pay_demo_${shop.seed}_${m}`,
      amount: MONTHLY_PRICE_INR,
      currency: 'INR',
      status: 'paid',
      method: 'upi',
      months: '1',
      paidAt: on,
      createdAt: on,
    });
  }

  // 10. The cached rollup, from the ledger's own arithmetic.
  ledger.stock = productList
    .filter((p) => p.cost > 0)
    .map((p) => ({ productId: p.id, currentStock: (p.opening + p.delta).toFixed(3) }));

  const negative = ledger.stock.filter((s) => Number(s.currentStock) < 0);
  if (negative.length > 0) {
    throw new Error(`Generated negative stock for ${negative.length} product(s) — restock logic is wrong.`);
  }

  await writeDemoLedger(ctx, ledger);

  const outstanding = issued.reduce((s, i) => s + i.outstanding, 0);
  const turnover = issued.reduce((s, i) => s + i.grandTotal, 0);
  log(
    `${ledger.invoices.length} invoices · ${ledger.lines.length} lines · ` +
      `${ledger.payments.length} payments · ${ledger.returns.length} returns · ` +
      `${ledger.movements.length} stock movements`,
  );
  log(`turnover ₹${Math.round(turnover).toLocaleString('en-IN')} · outstanding ₹${Math.round(outstanding).toLocaleString('en-IN')}`);
}

// -------------------------------------------------------------- entrypoint -

async function main() {
  const emails = SHOPS.map((s) => s.owner.email);

  console.warn('Clearing any previous demo data…');
  const removed = await wipeDemoBusinesses(emails);
  console.warn(removed > 0 ? `Removed ${removed} existing demo business(es).` : 'Nothing to remove.');

  for (const shop of SHOPS) {
    console.warn(`\n${shop.business.name}`);
    await seedShop(shop);
  }

  console.warn('\nDone. Log in with any of these:\n');
  for (const shop of SHOPS) {
    console.warn(`  ${shop.owner.email}   ${DEMO_PASSWORD}   (${shop.business.name})`);
  }
  console.warn(
    '\nAll three are on a paid plan valid past the seeded period, so none of them ' +
      'will hit the trial or payment-due wall while you are showing them.',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nSeed failed:', error);
    process.exit(1);
  });

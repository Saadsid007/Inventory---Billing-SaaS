# Inventory & Billing SaaS — Build Spec

> **Product name: Bahikhata.** Package scope is `@bahikhata/*`. Repo root is this directory.

> Multi-tenant inventory + billing SaaS for Indian small businesses, with a public product catalog per business.
> This document is the single source of truth for the build. Follow phases in order. Do not skip ahead.

---

## 0. Rules for the coding agent

Read this section before writing any code.

1. **Build strictly phase by phase.** Do not implement Phase 2 features while building Phase 1, even if they seem trivial.
2. **Never trust `businessId` from the client.** Always derive it from the authenticated session on the server.
3. **All money is `numeric(12,2)`.** Never use JavaScript `number` for currency math. Use `decimal.js` or integer paise internally.
4. **Every business-owned table has `business_id`.** No exceptions.
5. **Ask before inventing.** If a requirement here is ambiguous, stop and ask rather than guessing at business logic — especially tax logic.
6. **No `<form>` submit-based flows in client components.** Use server actions or explicit `onClick` handlers.
7. Write migrations, never edit the DB manually.
8. **Respect the monorepo boundaries in §2.5.** `packages/core` imports no framework and no database. Business logic never lives in a route handler or a React component. If you are about to write tax or stock logic inside `apps/`, stop — it belongs in `core`.
9. **One package per change where possible.** When a feature touches schema + logic + UI, do it in that order (`db` → `core` → `apps/web`) as separate steps, not one giant edit.

---

## 1. Product summary

**Who:** Indian small businesses (retail, wholesale, small manufacturers) currently keeping records on paper or in Excel.

**Core pains solved:**
1. Bill banana + print karna (GST aur non-GST dono)
2. Stock kitna hai pata rehna
3. Kisne kitna udhaar dena hai (khata)
4. CA ko saal ke end mein data dena
5. Apna saman online dikhana (catalog + QR)

**Differentiator:** #5. Har business ko ek public, SEO-friendly catalog page + QR code milta hai jo apne aap inventory se sync hota hai. Baaki features table stakes hain.

**Business model:** Manual approval. User signup karta hai → trial mein product use karta hai → super admin approve karta hai → paid access. Payment offline/Razorpay link se, tool ke andar checkout nahi.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| DB | PostgreSQL on Neon |
| ORM | Drizzle ORM |
| Auth | NextAuth.js (credentials provider + email) |
| File storage | Supabase Storage |
| Styling | Tailwind CSS + shadcn/ui |
| PDF | `@react-pdf/renderer` or Puppeteer (choose in Phase 2, see notes) |
| Validation | Zod (shared between client + server) |
| Money math | `decimal.js` |
| Monorepo | pnpm workspaces + Turborepo |
| Node | 20 LTS |

### Storage rules
- Invoice PDFs → **private bucket**, path `{business_id}/invoices/{invoice_id}.pdf`, served via signed URL only.
- Product images for catalog → **public bucket**, path `{business_id}/products/{product_id}/{uuid}.webp`.
- Business logo → public bucket.
- Never build a storage path from unsanitised user input.

---

## 2.5 Repository structure (monorepo)

### Layout

```
bahikhata/
├── package.json                # workspace root, scripts only
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
│
├── apps/
│   ├── web/                    # FRONTEND — Next.js App Router
│   │   ├── app/
│   │   │   ├── (marketing)/    # /, /pricing
│   │   │   ├── (auth)/         # /login, /register
│   │   │   ├── store/[slug]/   # public catalog (SSR)
│   │   │   ├── app/            # dashboard (auth required)
│   │   │   ├── admin/          # super admin
│   │   │   └── api/            # thin route handlers ONLY (see rule below)
│   │   ├── components/
│   │   ├── lib/                # client-side helpers, fetchers, hooks
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                    # BACKEND — Hono server (optional, see decision below)
│       ├── src/
│       │   ├── routes/         # HTTP layer: parse → call service → respond
│       │   ├── middleware/     # auth, tenant resolution, error handler
│       │   └── index.ts
│       └── package.json
│
└── packages/
    ├── db/                     # Drizzle schema, migrations, connection, repositories
    │   ├── src/
    │   │   ├── schema/         # one file per domain: users.ts, products.ts, invoices.ts...
    │   │   ├── repositories/   # ALL queries live here, every fn takes TenantCtx
    │   │   ├── client.ts
    │   │   └── index.ts
    │   ├── drizzle/            # generated migrations
    │   └── package.json
    │
    ├── core/                   # PURE BUSINESS LOGIC — zero framework, zero DB imports
    │   ├── src/
    │   │   ├── tax/            # §5.3 tax engine
    │   │   ├── numbering/      # §5.1 invoice numbering
    │   │   ├── stock/          # §5.4 stock movement rules
    │   │   ├── gst/            # place of supply, GSTIN parse/validate, FY calc
    │   │   └── services/       # orchestration: createInvoice, issueInvoice, cancelInvoice
    │   └── package.json
    │
    ├── shared/                 # Zod schemas, TS types, enums, constants
    │   └── src/
    │       ├── schemas/        # request/response validation, shared by web + api
    │       ├── types/
    │       └── constants/      # state codes, UQC list, seed tax rates
    │
    └── ui/                     # shadcn/ui components, Tailwind preset, theme tokens
        └── src/
```

### The one decision you have to make

The split that actually matters — **business logic out of the framework** — is done by `packages/core` and `packages/db`. Where the HTTP layer lives is a smaller, reversible choice:

| Option | What it means | Cost |
|---|---|---|
| **A. `apps/web` only** (recommended for Phase 0–1) | Next.js server actions + route handlers call `packages/core` directly. `apps/api` folder exists but stays empty. | Fastest. One deploy, one auth setup, no CORS. |
| **B. `apps/web` + `apps/api`** | Hono server owns all HTTP. Next.js becomes a pure client that fetches from it. | Real work: session token sharing across two origins, CORS, two deploys, no server actions. Adds roughly 1–1.5 weeks to Phase 0–1. |

**Recommendation: start with A, keep the `apps/api` folder scaffolded and empty.** Because `core` and `db` are framework-agnostic from day one, moving to B later is writing route wrappers — not a rewrite. Choose B on day one only if you already know a mobile app or third-party API access is coming soon.

### Dependency rules (enforce these)

```
apps/web  →  packages/{ui, shared, core, db}
apps/api  →  packages/{shared, core, db}
packages/core →  packages/shared          # NOTHING else. No db, no next, no react.
packages/db   →  packages/shared
packages/ui   →  packages/shared
```

Hard rules:
1. **`packages/core` must never import from `packages/db` or any framework.** It takes plain data in, returns plain data out. This is what makes it unit-testable and portable.
2. **No SQL or Drizzle query outside `packages/db/src/repositories/`.** Apps import repository functions, never the `db` client.
3. **Every repository function's first argument is `TenantCtx`.** No exceptions, including reads.
4. Route handlers do three things only: validate input with a Zod schema from `packages/shared`, call a service from `packages/core`, format the response. No business logic in routes.

### Workspace config

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Internal packages are referenced as `"@bahikhata/core": "workspace:*"`. Use `tsup` to build packages, or keep them source-only with `transpilePackages: ['@bahikhata/ui', '@bahikhata/core', '@bahikhata/shared', '@bahikhata/db']` in `next.config.ts` (simpler — prefer this for Phase 0–1).

`turbo.json` tasks: `build`, `dev`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`.

Environment variables live in a single root `.env`, loaded by both apps. Validate them at startup with a Zod schema in `packages/shared/src/env.ts` — fail loudly on boot, never at request time.

---

## 3. Non-negotiable schema decisions

These four must be right from day one. Retrofitting them later is 10x more expensive.

1. **`business_id` on every business-owned table**, with an index. All queries scoped through a helper.
2. **Money as `numeric(12,2)`.** Quantities as `numeric(12,3)` (some businesses sell in kg/litre).
3. **Invoice lines store a snapshot** of product name, HSN, rate and tax rate at the time of billing — not just a `product_id` FK. Product ka naam ya price baad mein badla to purana invoice galat print nahi hona chahiye.
4. **Tax rates live in a table with `effective_from`.** Never hardcode GST slabs. (GST 2.0, effective 22 Sep 2025, removed the 12% and 28% slabs — such changes will happen again.)

### Tenant scoping helper

Build this in Phase 0 and use it everywhere:

```ts
// packages/shared/src/types/tenant.ts
export type TenantCtx = { businessId: string; userId: string; role: 'owner' | 'staff' };

// apps/web/lib/auth/require-business.ts   (and apps/api/src/middleware/tenant.ts)
export async function requireBusiness(): Promise<TenantCtx> {
  // read session, resolve active business, throw if none / not approved
}

// packages/db/src/repositories/products.ts
export async function listProducts(ctx: TenantCtx, filters: ProductFilters) {
  return db.select().from(products).where(eq(products.businessId, ctx.businessId));
  //                                          ^ ALWAYS from ctx, never from a request param
}
```

Rules:
- **No file outside `packages/db/src/repositories/` imports the raw `db` client.**
- Every repository function takes `TenantCtx` first, including reads.
- `businessId` is only ever read from `ctx`. If you see it come from `req.body` or a query param, that's a bug.

---

## 4. Phase 1 data model

SQL shown for clarity — implement as Drizzle schema + migration.

```sql
-- ============ TENANCY & AUTH ============

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  phone           text,
  name            text NOT NULL,
  password_hash   text NOT NULL,
  is_super_admin  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE business_status AS ENUM ('pending', 'trial', 'active', 'suspended', 'rejected');

CREATE TABLE businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES users(id),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,          -- public catalog URL
  legal_name      text,
  gstin           text,                          -- NULL = unregistered business
  state_code      text NOT NULL,                 -- 2-digit GST state code, e.g. '09' for UP
  address_line1   text,
  address_line2   text,
  city            text,
  pincode         text,
  phone           text,
  email           text,
  logo_url        text,
  status          business_status NOT NULL DEFAULT 'pending',
  approved_at     timestamptz,
  approved_by     uuid REFERENCES users(id),
  trial_ends_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'owner',    -- 'owner' | 'staff' (staff used from Phase 3)
  UNIQUE (business_id, user_id)
);

-- ============ SETTINGS (this is what makes it "general purpose") ============

CREATE TABLE business_settings (
  business_id       uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  currency          text NOT NULL DEFAULT 'INR',
  default_tax_mode  text NOT NULL DEFAULT 'exclusive',  -- 'inclusive' | 'exclusive'
  invoice_terms     text,
  invoice_footer    text,
  show_catalog_prices boolean NOT NULL DEFAULT true,
  catalog_enabled   boolean NOT NULL DEFAULT false,
  catalog_whatsapp  text,
  theme             text NOT NULL DEFAULT 'light'
);

-- Per-business master lists. This is how businesses customise without code changes.
CREATE TABLE units (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         text NOT NULL,        -- 'Piece', 'Kg', 'Metre'
  short_name   text NOT NULL,        -- 'PCS', 'KGS', 'MTR'  (GST UQC)
  UNIQUE (business_id, short_name)
);

CREATE TABLE categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         text NOT NULL,
  UNIQUE (business_id, name)
);

-- Custom fields: ONLY on products and parties. NEVER on invoices.
CREATE TABLE custom_field_defs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity       text NOT NULL,        -- 'product' | 'party'
  key          text NOT NULL,        -- machine key, slugified
  label        text NOT NULL,
  type         text NOT NULL,        -- 'text' | 'number' | 'date' | 'select' | 'checkbox'
  options      jsonb,                -- for 'select'
  required     boolean NOT NULL DEFAULT false,
  show_in_catalog boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0,
  UNIQUE (business_id, entity, key)
);

-- ============ TAX ============

CREATE TABLE tax_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid REFERENCES businesses(id) ON DELETE CASCADE, -- NULL = global/system rate
  name            text NOT NULL,          -- 'GST 18%'
  rate            numeric(5,2) NOT NULL,  -- 18.00
  cess_rate       numeric(5,2) NOT NULL DEFAULT 0,
  effective_from  date NOT NULL,
  effective_to    date,                   -- NULL = still active
  is_active       boolean NOT NULL DEFAULT true
);
-- Seed global rows: 0, 0.25, 3, 5, 18, 40 (effective_from '2025-09-22').

-- ============ PRODUCTS & STOCK ============

CREATE TABLE products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type              text NOT NULL DEFAULT 'simple',  -- 'simple' now; 'variant'|'batch'|'serial' reserved for later
  name              text NOT NULL,
  sku               text,
  barcode           text,
  category_id       uuid REFERENCES categories(id),
  unit_id           uuid REFERENCES units(id),
  hsn_code          text,
  tax_rate_id       uuid REFERENCES tax_rates(id),
  sale_price        numeric(12,2) NOT NULL DEFAULT 0,
  purchase_price    numeric(12,2),          -- hidden from 'staff' role
  opening_stock     numeric(12,3) NOT NULL DEFAULT 0,
  current_stock     numeric(12,3) NOT NULL DEFAULT 0,
  low_stock_alert   numeric(12,3),
  track_inventory   boolean NOT NULL DEFAULT true,  -- false for services
  description       text,
  image_urls        jsonb NOT NULL DEFAULT '[]',
  custom_fields     jsonb NOT NULL DEFAULT '{}',
  show_in_catalog   boolean NOT NULL DEFAULT true,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON products (business_id, is_active);
CREATE UNIQUE INDEX ON products (business_id, sku) WHERE sku IS NOT NULL;

-- Append-only ledger. current_stock is a cached rollup of this.
CREATE TABLE stock_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id),
  qty_change    numeric(12,3) NOT NULL,   -- negative for outward
  reason        text NOT NULL,            -- 'opening'|'sale'|'stock_in'|'stock_out'|'adjustment'|'sale_cancelled'
  ref_type      text,                     -- 'invoice'
  ref_id        uuid,
  note          text,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON stock_movements (business_id, product_id, created_at);

-- ============ PARTIES ============

CREATE TABLE parties (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type           text NOT NULL DEFAULT 'customer',  -- 'customer' | 'supplier' | 'both'
  name           text NOT NULL,
  phone          text,
  email          text,
  gstin          text,
  state_code     text,          -- REQUIRED for place-of-supply if gstin present
  address_line1  text,
  city           text,
  pincode        text,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,  -- positive = they owe us
  custom_fields  jsonb NOT NULL DEFAULT '{}',
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON parties (business_id, type);

-- ============ INVOICES ============

CREATE TYPE invoice_kind AS ENUM (
  'tax_invoice',      -- GST registered supplier
  'bill_of_supply',   -- composition dealer / exempt goods
  'cash_memo',        -- unregistered supplier, no GST
  'estimate',         -- quotation, non-accounting
  'delivery_challan'
);

CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid');

CREATE TABLE invoice_series (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind          invoice_kind NOT NULL,
  fy            text NOT NULL,            -- '2026-27'
  prefix        text NOT NULL DEFAULT '',
  next_number   integer NOT NULL DEFAULT 1,
  padding       integer NOT NULL DEFAULT 3,
  UNIQUE (business_id, kind, fy)
);

CREATE TABLE invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind              invoice_kind NOT NULL,
  status            invoice_status NOT NULL DEFAULT 'draft',
  fy                text NOT NULL,
  invoice_no        text,                     -- assigned only on issue
  invoice_date      date NOT NULL,
  due_date          date,

  party_id          uuid REFERENCES parties(id),
  -- snapshots (party details can change later)
  party_name        text NOT NULL,
  party_gstin       text,
  party_phone       text,
  party_address     text,

  supplier_state_code text NOT NULL,          -- snapshot of business state at time of billing
  place_of_supply     text NOT NULL,          -- 2-digit state code
  is_interstate       boolean NOT NULL,

  tax_mode          text NOT NULL DEFAULT 'exclusive',
  subtotal          numeric(12,2) NOT NULL DEFAULT 0,  -- sum of taxable values
  discount_total    numeric(12,2) NOT NULL DEFAULT 0,
  cgst_total        numeric(12,2) NOT NULL DEFAULT 0,
  sgst_total        numeric(12,2) NOT NULL DEFAULT 0,
  igst_total        numeric(12,2) NOT NULL DEFAULT 0,
  cess_total        numeric(12,2) NOT NULL DEFAULT 0,
  other_charges     numeric(12,2) NOT NULL DEFAULT 0,
  round_off         numeric(12,2) NOT NULL DEFAULT 0,
  grand_total       numeric(12,2) NOT NULL DEFAULT 0,

  amount_paid       numeric(12,2) NOT NULL DEFAULT 0,
  payment_status    payment_status NOT NULL DEFAULT 'unpaid',

  notes             text,
  terms             text,
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON invoices (business_id, kind, fy, invoice_no) WHERE invoice_no IS NOT NULL;
CREATE INDEX ON invoices (business_id, invoice_date DESC);
CREATE INDEX ON invoices (business_id, party_id);

CREATE TABLE invoice_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_no         integer NOT NULL,
  product_id      uuid REFERENCES products(id),   -- nullable: ad-hoc lines allowed
  -- SNAPSHOT FIELDS (never join to products for printing)
  name            text NOT NULL,
  hsn_code        text,
  unit            text,
  qty             numeric(12,3) NOT NULL,
  rate            numeric(12,2) NOT NULL,
  discount_pct    numeric(5,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  taxable_value   numeric(12,2) NOT NULL,
  tax_rate        numeric(5,2) NOT NULL DEFAULT 0,
  cess_rate       numeric(5,2) NOT NULL DEFAULT 0,
  cgst_amount     numeric(12,2) NOT NULL DEFAULT 0,
  sgst_amount     numeric(12,2) NOT NULL DEFAULT 0,
  igst_amount     numeric(12,2) NOT NULL DEFAULT 0,
  cess_amount     numeric(12,2) NOT NULL DEFAULT 0,
  line_total      numeric(12,2) NOT NULL
);
CREATE INDEX ON invoice_lines (invoice_id);

CREATE TABLE payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  party_id      uuid REFERENCES parties(id),
  invoice_id    uuid REFERENCES invoices(id),
  amount        numeric(12,2) NOT NULL,
  direction     text NOT NULL,        -- 'in' | 'out'
  method        text NOT NULL,        -- 'cash'|'upi'|'bank'|'card'|'cheque'|'other'
  reference     text,
  paid_on       date NOT NULL,
  note          text,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON payments (business_id, party_id, paid_on);

-- ============ CATALOG ============

CREATE TABLE catalog_views (
  id           bigserial PRIMARY KEY,
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id),
  viewed_at    timestamptz NOT NULL DEFAULT now(),
  referrer     text
);
CREATE INDEX ON catalog_views (business_id, viewed_at);

-- ============ AUDIT (minimal) ============

CREATE TABLE invoice_audit (
  id           bigserial PRIMARY KEY,
  business_id  uuid NOT NULL,
  invoice_id   uuid NOT NULL,
  action       text NOT NULL,     -- 'created'|'issued'|'edited'|'cancelled'
  changed_by   uuid,
  snapshot     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. Core logic specs

### 5.1 Invoice numbering — must be gapless

**Do not use a Postgres `SEQUENCE`.** Sequences leak numbers on transaction rollback, producing gaps. Gaps in a GST invoice series are a compliance problem.

```
BEGIN;
  SELECT * FROM invoice_series
    WHERE business_id = $1 AND kind = $2 AND fy = $3
    FOR UPDATE;                        -- row lock

  -- if no row, INSERT with next_number = 1

  invoice_no := prefix || lpad(next_number::text, padding, '0');

  UPDATE invoice_series SET next_number = next_number + 1 WHERE id = ...;
  UPDATE invoices SET invoice_no = invoice_no, status = 'issued' WHERE id = ...;
COMMIT;
```

Rules:
- Number is assigned **only on issue**, never on draft.
- Drafts have `invoice_no = NULL`.
- Cancelled invoices **keep their number**. Never reuse, never delete. Cancellation is a status change, not a delete.
- FY string is computed from `invoice_date`: April–March. `2026-04-01` → `'2026-27'`.
- `estimate` and `delivery_challan` get their own separate series.

### 5.2 Place of supply → CGST/SGST vs IGST

```
supplierState = business.state_code           (snapshot onto invoice)
placeOfSupply = party.state_code
                ?? (party.gstin ? first 2 chars of gstin : supplierState)

isInterstate = (placeOfSupply !== supplierState)

if isInterstate:  igst = taxable * rate
else:             cgst = taxable * rate / 2
                  sgst = taxable * rate / 2
```

For `cash_memo` and `bill_of_supply`, all tax amounts are 0 but `place_of_supply` is still recorded.

### 5.3 Tax calculation order (exclusive mode)

Per line:
```
gross         = qty * rate
discount      = discount_amount, or gross * discount_pct / 100
taxable_value = round(gross - discount, 2)
tax           = round(taxable_value * tax_rate / 100, 2)
                -> split into cgst/sgst, or igst
cess          = round(taxable_value * cess_rate / 100, 2)
line_total    = taxable_value + tax + cess
```

Per invoice:
```
subtotal    = sum(taxable_value)
cgst_total  = sum(cgst_amount)   ... etc
pre_round   = subtotal + cgst + sgst + igst + cess + other_charges
grand_total = round_to_nearest_rupee(pre_round)
round_off   = grand_total - pre_round        -- can be negative
```

**Inclusive mode:** `taxable_value = round(gross_inclusive * 100 / (100 + rate), 2)`, then proceed as above.

Use `decimal.js` throughout. Rounding is half-up. Never `Math.round` on floats.

### 5.4 Stock

- Every stock change writes a row to `stock_movements`.
- `products.current_stock` is a **cached rollup**, updated in the same transaction.
- Issuing an invoice → one negative movement per line with `track_inventory = true`.
- Cancelling an issued invoice → equal and opposite movements with reason `sale_cancelled`. Never delete the originals.
- Editing an issued invoice: only allow in Phase 1 if it reverses old movements and writes new ones inside one transaction. If that feels risky, disallow editing issued invoices in Phase 1 — cancel + re-create is acceptable.
- Negative stock: allowed by default (shops sell before entering purchases). Show a warning, don't block. Make it a setting later.

### 5.5 GSTR-1 field capture (Phase 1 responsibility)

**Phase 1 does not build the export.** Phase 1 must guarantee these fields are always present and correct, because they cannot be reconstructed later:

| Field | Where |
|---|---|
| Buyer GSTIN | `invoices.party_gstin` |
| Place of supply | `invoices.place_of_supply` |
| Interstate flag | `invoices.is_interstate` |
| HSN per line | `invoice_lines.hsn_code` |
| Tax rate per line | `invoice_lines.tax_rate` |
| Taxable value per line | `invoice_lines.taxable_value` |
| Tax split per line | `cgst/sgst/igst/cess_amount` |
| Document series + range | `invoice_series` + `invoices.invoice_no` |
| Cancelled docs | `invoices.status = 'cancelled'` |

Add a validation warning (not a hard block) on issue if a `tax_invoice` line has no HSN.

---

## 6. Route map

```
Public
  /                             Marketing home (SSG, SEO)
  /pricing
  /store/[slug]                 Public catalog (SSR, ISR 60s)
  /store/[slug]/[productSlug]   Product detail (SSR)
  /login
  /register

App (auth required, business approved)
  /app                          Dashboard
  /app/invoices                 List + filters
  /app/invoices/new             Create invoice
  /app/invoices/[id]            View / print / PDF
  /app/products
  /app/products/[id]
  /app/parties
  /app/parties/[id]             Ledger + outstanding
  /app/stock                    Stock in / out entries
  /app/reports                  Sales summary, stock summary, outstanding
  /app/catalog                  Catalog settings + QR download
  /app/settings                 Business profile, units, categories, custom fields, series

Pending approval
  /app/pending                  Only page reachable when status = 'pending'

Super admin
  /admin                        Stats: businesses, users, invoice count
  /admin/businesses             Approve / reject / suspend
  /admin/businesses/[id]        Metadata only — NEVER business transaction data
```

---

## 7. Phases

### Phase 0a — Monorepo scaffold (1 day) ✅ DONE

Use the separate scaffold prompt for this. Deliverable is an empty but wired-up workspace.

- [x] pnpm workspace + Turborepo + `tsconfig.base.json`
- [x] `apps/web` (Next.js App Router, Tailwind, shadcn/ui), `apps/api` (empty Hono stub)
- [x] `packages/db`, `packages/core`, `packages/shared`, `packages/ui` with working cross-imports
- [x] `packages/shared/src/env.ts` — Zod-validated env, fails on boot
- [x] ESLint rule (`no-restricted-imports`) blocking `@bahikhata/db` and framework imports inside `packages/core`
- [x] Vitest configured at root, running across packages via Turbo
- [x] Root scripts: `dev`, `build`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:studio`
- [x] One smoke test per package so CI has something to run

**Done when:** `pnpm dev` starts the Next.js app, `pnpm typecheck` passes across all packages, and `packages/core` fails lint if you try to import Drizzle into it.

---

### Phase 0b — Foundation (3–4 days)

- [ ] Neon connection in `packages/db`, Drizzle config, first migration
- [ ] `users`, `businesses`, `business_members`, `business_settings` schema in `packages/db/src/schema/`
- [ ] NextAuth with credentials provider, bcrypt password hashing (in `apps/web`)
- [ ] `TenantCtx` type in `shared`, `requireBusiness()` in `apps/web/lib/auth/`
- [ ] Repository pattern established: `packages/db/src/repositories/businesses.ts` as the reference example
- [ ] Registration flow: create user → create business (`status = 'pending'`) → redirect to `/app/pending`
- [ ] Middleware: block `/app/*` when status is `pending` or `rejected`; allow `/app/pending`
- [ ] App shell in `packages/ui`: sidebar, topbar, business switcher stub
- [ ] Light/dark theme toggle (cheap now, expensive to retrofit)

**Done when:** a user can register, sees the pending screen, and a manually-flipped DB status lets them into an empty dashboard.

---

### Phase 1 — Core billing (3–4 weeks) ← the actual MVP

**1a. Masters**
- [ ] `units`, `categories`, `tax_rates` tables + seed defaults on business creation
  - Seed units: PCS, KGS, GMS, LTR, MTR, BOX, PKT, DOZ
  - Seed tax rates: 0, 0.25, 3, 5, 18, 40 (`effective_from = '2025-09-22'`)
- [ ] Business settings page: profile, GSTIN, state, logo upload, terms

**1b. Products**
- [ ] Products CRUD + list with search, category filter, low-stock filter
- [ ] `custom_field_defs` CRUD (settings page) + dynamic rendering in the product form
- [ ] Image upload to Supabase public bucket, converted to webp, max 5 per product
- [ ] Opening stock creates a `stock_movements` row

**1c. Parties**
- [ ] Parties CRUD with custom fields
- [ ] Party detail page: transaction list + running balance + outstanding total
- [ ] Outstanding = `opening_balance + sum(issued unpaid invoices) - sum(payments in)`

**1d. Invoices — the core**
- [ ] Invoice create form: party picker (with inline create), line items with product autocomplete, live totals
- [ ] Kind selector: Tax Invoice / Bill of Supply / Cash Memo / Estimate / Delivery Challan
  - Hide GST fields entirely when the business has no GSTIN
- [ ] Place-of-supply auto-detection + manual override
- [ ] Tax engine per §5.3, as a **pure function with unit tests**
- [ ] Issue flow: transaction → assign number → write stock movements → set status
- [ ] Cancel flow: reverse stock, keep number
- [ ] Invoice list: filters by date range, party, kind, payment status
- [ ] Payment recording: amount, method, date → updates `amount_paid` + `payment_status`

**1e. Print**
- [ ] A4 print view — CSS `@media print`, no library needed
- [ ] 80mm thermal print view — separate CSS, monospace, narrow
- [ ] Print template reads only snapshot fields, never joins to `products`
- [ ] "Print" button opens the right view based on a user preference

**1f. Public catalog — the differentiator**
- [ ] `/store/[slug]` — SSR, ISR revalidate 60s
- [ ] Product grid: image, name, description, price (respecting `show_catalog_prices`)
- [ ] Stock shown as **In stock / Low stock / Out of stock** — never the exact number
- [ ] Category filter + search
- [ ] Business header: logo, name, address, phone
- [ ] "Enquire on WhatsApp" button with prefilled message including product name
- [ ] `schema.org` JSON-LD: `Store` + `Product` markup
- [ ] `generateMetadata` for OG tags per business and per product
- [ ] QR code generation (client-side, `qrcode` npm) → PNG download + printable A4 poster
- [ ] Catalog on/off toggle; page 404s when off or business isn't active
- [ ] View counter writing to `catalog_views`

**1g. Basics**
- [ ] Dashboard: today's sales, this month's sales, total outstanding, low stock count, recent invoices
- [ ] Reports: sales summary (date range), stock summary, outstanding by party
- [ ] CSV export for products, parties, invoices
- [ ] Simple Stock In / Stock Out form (this is **not** a purchase bill — just quantity + reason + note)
- [ ] Super admin: business list, approve/reject/suspend, aggregate counts only
- [ ] Marketing home page + pricing page

**Done when:** a real shopkeeper can bill for a full day, print it, see their stock go down, check who owes money, and share their catalog QR.

---

### Phase 2 — Compliance & retention (3–4 weeks)

- [ ] Purchase bills (proper supplier invoices with ITC fields)
- [ ] Credit Note / Debit Note (`invoice_kind` extension + linked original invoice)
- [ ] **GSTR-1 Excel export** — B2B, B2CL, B2CS, CDNR, CDNUR, HSN Summary, Docs Issued
  - Match the GST offline utility template column order exactly
  - Footer disclaimer: data export only, filing is the user's responsibility
  - Market it as "GSTR-1 ready export" / "CA-ready report". **Never** as "we file your returns."
- [ ] Server-side PDF generation + Supabase private bucket + signed URLs
- [ ] WhatsApp share for invoices (wa.me deep link, not the Business API)
- [ ] Payment reminder list + one-click WhatsApp reminder text
- [ ] Barcode scanning in the invoice form (USB scanner behaves as keyboard — just an input with debounce)
- [ ] Recurring/duplicate invoice ("copy this invoice")
- [ ] Full data export (ZIP of CSVs)

---

### Phase 3 — Scale (as demanded by paying users)

- [ ] Staff role: hide `purchase_price`, margins, and reports; restrict deletes
- [ ] Multi-branch / multiple GSTINs under one account
- [ ] Product variants (size/colour) — new `product_variants` table, `products.type = 'variant'`
- [ ] Batch + expiry tracking — `products.type = 'batch'`
- [ ] Catalog analytics dashboard (views, top products, enquiry clicks)
- [ ] Catalog enquiry/order form with lead capture
- [ ] Razorpay subscription automation replacing manual approval
- [ ] Custom invoice templates (2–3 designs)

---

### Explicitly out of scope

Do not build these. If asked, push back and cite this section.

| Feature | Why |
|---|---|
| Offline PWA with sync | Sync conflict resolution is its own multi-week project |
| e-Invoice (IRN) / e-Way bill | Threshold is ₹5 cr turnover; target users are far below it |
| Direct GST portal filing (GSP) | Requires licensing, cost, and accepts legal liability |
| Full double-entry accounting | Different product. Tally's territory |
| Serial/IMEI tracking | Niche; defer until a paying customer demands it |
| In-app payment gateway checkout | Manual/link-based billing is fine at this stage |
| System-wide audit log | `invoice_audit` only |
| Mobile native apps | Responsive web first |

---

## 8. Testing requirements

Non-negotiable unit tests before Phase 1 is called done:

1. **Tax engine** — intrastate vs interstate, inclusive vs exclusive, line discount, invoice-level rounding, 0% rate, cess.
2. **Invoice numbering** — concurrent issue attempts produce no duplicates and no gaps (test with parallel transactions).
3. **Tenant isolation** — a user from business A cannot read or mutate any row belonging to business B, via any route. Write this as an integration test that hits real route handlers.
4. **Stock reconciliation** — `sum(stock_movements.qty_change) === products.current_stock` for every product after a randomised sequence of operations.

---

## 9. Suggested build order for the agent

Feed one section at a time. Do not paste this whole file as a single prompt.

Each step names the package it lands in. Do not start a step until the previous one typechecks and its tests pass.

```
 1. Phase 0a — monorepo scaffold                        → root + all packages
 2. Phase 0b — auth, tenancy, business approval          → db, web
 3. §4 schema → Drizzle schema + migration (review before applying)
                                                         → packages/db/src/schema
 4. §5.3 tax engine, pure fns + full test suite          → packages/core/src/tax
 5. §5.2 place of supply + GSTIN/FY helpers + tests      → packages/core/src/gst
 6. §5.1 invoice numbering + concurrency test            → packages/core/src/numbering
                                                            + packages/db (locking repo fn)
 7. Repositories for products, parties, invoices         → packages/db/src/repositories
 8. Phase 1a + 1b — masters, products                    → web
 9. Phase 1c — parties + ledger                          → core (balance calc), web
10. Phase 1d — invoices (split over several sessions)    → core/services, web
11. Phase 1e — A4 + 80mm print views                     → web, ui
12. Phase 1f — public catalog + QR                       → web
13. Phase 1g — dashboard, reports, admin, marketing      → web
```

Steps 4–6 are the highest-leverage work in this entire project. They are pure functions with no database and no UI, so they can be tested exhaustively in minutes. Everything downstream assumes they are correct — if the tax engine is wrong, every invoice ever issued is wrong, and you will not find out until a CA calls.

Do not let the agent write UI before step 6 is green.

---

## 10. Go-to-market note

The product is general-purpose in code — one codebase, no per-customer changes. But **launch messaging must target one niche** (kirana, garments, hardware, or mobile shops). "Sab businesses ke liye" converts nobody. Get 50 paying users in one vertical, then broaden the marketing while the code stays unchanged.

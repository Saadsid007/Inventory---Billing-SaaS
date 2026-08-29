# Progress

Status against the build spec's phases. A phase is "done" only when its own
**Done when** line has been demonstrated, not when the code exists.

---

## Phase 0a — Monorepo scaffold ✅ done (2026-08-28)

**Spec's bar:** *`pnpm dev` starts the Next.js app, `pnpm typecheck` passes
across all packages, and `packages/core` fails lint if you try to import Drizzle
into it.*

All three demonstrated:

| Check | Evidence |
|---|---|
| `pnpm dev` | Ready in 1.8s; page rendered in a browser with all cross-package imports resolving at runtime |
| `pnpm typecheck` | 6/6 packages |
| core rejects Drizzle | Verified, plus `@bahikhata/db`, `next`, `react`, `@bahikhata/ui`, `shared/env`, `node:fs`, `Math.round` |

Also green: `pnpm lint` 6/6, `pnpm test` 46 passing, `pnpm build` clean,
`pnpm db:generate` reads the root `.env`.

**Built slightly beyond a bare scaffold**, because later phases assume it:

- `packages/core/src/money.ts` — decimal.js half-up wrappers. The base for the
  step-4 tax engine. Tested for float-error accumulation and half-up vs banker's
  rounding.
- `packages/shared/src/constants/` — 37 GST state codes, the 45-entry GST UQC
  list, GST 2.0 seed slabs (0 / 0.25 / 3 / 5 / 18 / 40, effective 2025-09-22),
  and every domain enum.
- `packages/core/src/boundaries.test.ts` — lints fixtures through the *real*
  ESLint config, so weakening the architecture rule turns the suite red rather
  than passing unnoticed.

**Deviations from the spec, deliberate:** see
[decisions.md](./decisions.md#d1-toolchain-versions) and
[the PKT unit note](./decisions.md#d6-pkt-is-not-a-real-uqc).

---

## Phase 0b — Foundation ✅ done (2026-08-28)

Neon connected and verified: Postgres 18.6, `ap-southeast-1`, migrations
`0000` and `0001` generated **and applied**.

**Spec's bar (revised — see D10):** *a user can register and land straight in an
empty dashboard on a 10-day trial; an expired trial sends them to
`/app/subscribe`; and marking the business paid lets them back in on the next
request.*

Demonstrated end to end in a browser against the real database:

| Step | Result |
|---|---|
| Register | Business row created with `status='trial'`, `trial_ends_at` exactly +10 days, bcrypt `$2b$` 60-char hash, owner membership and settings row all in one transaction |
| Straight into the app | Dashboard rendered immediately, sidebar showing "Trial · 10 days left" |
| Trial forced to expired in DB | `/app` redirected to `/app/subscribe` showing the ₹299 plan |
| Business marked paid in DB | `/app` rendered again **without re-login** — the live status read works |
| Wrong password | "That email or password is not correct." |
| Correct password | Signed in and landed on the dashboard |
| Signed out | Redirected to `/login`; `/app` then 307s to `/login?next=/app` |
| Mobile viewport | Sidebar collapsed into a drawer; menu icon toggled correctly |

Also green: typecheck 6/6, lint 6/6, **57 tests**, production build clean.

### Left deliberately incomplete

- **Nav has one item.** Adding links before their pages exist just hands a
  shopkeeper a 404 to find. It grows one phase at a time.
- **Business switcher is a stub.** Multi-branch is Phase 3; the shell renders no
  switcher affordance until there is something to switch to.
- **Dashboard tiles read "—".** There is nothing to count yet, and a tile reading
  "₹0" is indistinguishable from a broken query.
- **Marking a business paid is a manual DB update.** The `/admin` screen for it
  lands in Phase 1g.

---

## Build-order steps 3–6 ✅ done (2026-08-28)

Spec §9 calls steps 4–6 *"the highest-leverage work in this entire project"* —
pure functions with no database and no UI, so they can be tested exhaustively in
minutes, and everything downstream assumes they are correct.

### Step 3 — full §4 schema

17 tables, 47 indexes, migrations `0002` generated and applied. The four
non-negotiables from spec §3 are all in place: `business_id` everywhere,
`numeric(12,2)` money and `numeric(12,3)` quantity, snapshot columns on
`invoice_lines`, and `tax_rates` as rows with `effective_from`.

Two partial unique indexes worth knowing about:
`products (business_id, sku) WHERE sku IS NOT NULL` — SKU is optional but must
be unique when present; and
`invoices (business_id, kind, fy, invoice_no) WHERE invoice_no IS NOT NULL` —
drafts share a NULL number, issued invoices cannot share anything.

### Step 4 — tax engine (`packages/core/src/tax`)

29 tests covering everything spec §8.1 demands. Three behaviours that are easy
to "fix" into being wrong later:

- **CGST/SGST are halves of the already-rounded total**, not two independent
  roundings. On ₹0.05 of tax, rounding each half separately gives 0.03 + 0.03
  and the invoice stops adding up. This way `cgst + sgst === tax`, exactly.
- **Tax is rounded per line, then summed** — never computed on the subtotal.
  200 lines of ₹0.99 at 5% total ₹10.00 of tax, not the ₹9.90 you get from 5%
  of ₹198. The printed column must be one a reader can add up themselves.
- **A discount larger than its line clamps to zero.** Negative GST on a sale is
  not a thing; that is what a credit note is for (Phase 2).

### Step 5 — place of supply and GSTIN (`packages/core/src/gst`)

28 tests. Real mod-36 GSTIN checksum, verified against known-valid GSTINs — so
a transposed PAN or an altered last character is caught, which a shape-only
regex waves straight through. Retired state codes (25, 28) validate on read, so
an old customer record does not block billing.

Financial year takes a date **string**, never a `Date`: 1 April 00:30 IST is
31 March in UTC, and a `Date` would file the year's first invoice under the
previous year's series.

### Step 6 — gapless numbering

Pure half in `packages/core/src/numbering` (14 tests), locking half in
`packages/db/src/repositories/numbering.ts` (9 integration tests against the
real database).

**Deviation from the spec, deliberate:** the spec's pseudocode is
`SELECT … FOR UPDATE` then `INSERT` if missing, which races on the first invoice
of a series. Replaced with a single atomic `INSERT … ON CONFLICT DO UPDATE`.
See [decisions.md D13](./decisions.md#d13-numbering-uses-an-upsert-not-select-for-update).

Proven against Neon, not asserted: 40 parallel transactions produce exactly
1–40 with no duplicates and no gaps; a failed transaction rolls the counter
back so the number is reused; each kind and each financial year keeps its own
sequence; a foreign `business_id` cannot advance someone else's series.

**137 tests** across the workspace. typecheck 6/6, lint 6/6.

---

## Step 7 — repositories ✅ done (2026-08-28)

`masters`, `products`, `stock`, `parties`, `invoices`, `numbering`. Every
function takes `TenantCtx` first and pins `business_id` to `ctx.businessId`;
`businesses.ts` remains the reference shape.

Choices worth not undoing:

- **`purchase_price` is blanked in the repository for staff**, not in the UI. A
  component that forgets to hide a field leaks it, and so does any JSON built
  from the raw row. The value never leaves the data layer.
- **`current_stock` can only be changed through `stock.ts`.** `updateProduct`
  deliberately cannot touch it. Stock moves by writing to the ledger and
  updating the rollup in the same transaction, with `SET current_stock =
  current_stock + $x` in SQL — a read-modify-write in JS loses one of two
  concurrent sales.
- **Deletes are soft, everywhere.** Invoice lines reference `product_id` and
  last year's report has to keep resolving.
- **The catalog query returns a bucketed stock status**, never the number.
  Competitors read catalogs too.
- **Party outstanding is computed in Postgres `numeric`**, not JavaScript.
  Summing money in floats is how a ledger ends up a rupee out.
- **`issueInvoice` takes `formatNumber` as a callback.** `packages/db` may only
  depend on `@bahikhata/shared`, so core's formatter is injected rather than
  imported — the dependency rule stays intact without duplicating logic.
- **Cancellation reverses the movements that were actually recorded**, not the
  invoice lines. If a line was somehow skipped on issue, un-skipping it now
  would put back stock that never left.

### Spec §8.3 and §8.4, proven not asserted

`pnpm test:integration`, against the real database:

- one business cannot read, update, deactivate or cancel another's products,
  parties, categories or invoices — using **real, valid ids**, so isolation has
  to come from the `WHERE` clause rather than from ids being hard to guess
- a stock movement against a foreign product is rejected outright
- after 120 randomised stock operations across 5 products,
  `sum(stock_movements.qty_change) === products.current_stock` for every one
- issue → cancel restores stock exactly, keeps the invoice number, and leaves
  both the `sale` and `sale_cancelled` rows in the ledger

Integration tests moved behind their own script so `pnpm test` stays fast.
**148 tests** total: 128 unit, 20 integration.

---

## Phase 1a + 1b — masters and products ⚠️ done except images (2026-08-29)

Settings (profile, invoice/catalog defaults, units, categories, custom fields)
and full product CRUD. Verified in a browser against the real database: created
a category and a unit, then a product with category, unit, HSN, GST 18% and
opening stock — the list rendered every join correctly, and the product page
showed the `opening` ledger row of +48.000 matching `current_stock`.

Decisions worth keeping:

- **Filters live in the URL**, not component state, so a filtered product list
  is shareable and back-button-friendly, and the page stays a server component.
  Search is debounced 300ms.
- **`openingStock` is disabled on edit.** Stock only moves through the ledger;
  a form that could rewrite `current_stock` would desynchronise the rollup from
  its own movements with nothing to detect it.
- **Warnings are live and non-blocking** (spec §5.5). Missing HSN or tax rate
  shows advice that disappears the moment it is fixed — never a hard block,
  because refusing to save over paperwork that can be fixed later is the wrong
  trade when a customer is standing at the counter.
- **Custom field keys are derived from the label**, never typed. They become
  JSON keys on every product row, so they must be stable and safe, and a user
  should not have to think about that.
- **Categories are not seeded**; units are. A kirana store's categories have
  nothing in common with a hardware shop's, so a wrong default is worse than an
  empty list. Units are universal enough to seed.
- **Non-standard UQCs are flagged, not blocked.** A shop may want "TIN" on its
  own paperwork; the consequence is a GSTR-1 rejection in Phase 2, and that is
  theirs to weigh.

### Blocked

**Product image upload.** Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`,
which are not set. Everything else in 1b is done; the form says so where the
upload control will go. `requireStorageEnv()` already guards the code path.

---

## Not started

Phase 1 (core billing), Phase 2 (compliance), Phase 3 (scale). The spec's
build order puts steps 4–6 — tax engine, place of supply, invoice numbering —
before any Phase 1 UI, and calls them the highest-leverage work in the project.
That ordering is not negotiable: a wrong tax engine makes every invoice ever
issued wrong, and nobody finds out until a CA calls.

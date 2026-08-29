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

## Phase 1a + 1b — masters and products ✅ done (2026-08-29)

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

### Images — added once Supabase credentials arrived

Product photos (max 5) and the business logo, both to the **public** bucket at
`{business_id}/products/{product_id}/{uuid}.webp` and
`{business_id}/logo/{uuid}.webp`.

- **Conversion happens in the browser, not on the server.** A phone photo is
  3–5MB of JPEG; resized to 1200px and re-encoded as webp it leaves as roughly
  150KB. For a shopkeeper on a weak connection that is the difference between
  the upload working and timing out — and it costs the server nothing. Verified:
  a 1600×1200 60KB source arrived as a 12KB webp.
- **The server re-checks anyway.** `isWebp()` sniffs the actual RIFF/WEBP
  signature rather than trusting `file.type`, which is whatever the client
  decides to claim. Six unit tests cover it, including that a WAV file is also
  RIFF — checking only the first four bytes would let one through.
- **Paths are built from ids only** (spec §2: never from unsanitised input). A
  user-supplied filename could contain `../` and walk out of the tenant folder.
  Deletes additionally require the path to start with the caller's own
  `business_id`.
- **Row first, storage second.** A failed delete orphans a file worth a fraction
  of a paisa; the reverse order would leave a product pointing at a file that no
  longer exists.
- Uploads are sequential, not parallel — five photos over a weak connection do
  better one at a time than racing each other into a timeout.
- Verified against the live bucket: anonymous `GET` returns 200 with
  `content-type: image/webp` and a one-year immutable cache; removing an image
  clears the row and deletes the object; replacing a logo deletes the old one
  rather than accumulating versions.

**Bucket note:** the project already had a private `inventory` bucket. Catalog
images are served to anonymous visitors, so they need a public bucket — signed
URLs expire, which breaks both ISR caching and SEO. A separate `public-assets`
bucket was created (public, 5MB limit, image MIME types only) rather than making
the existing one public and exposing whatever was already in it.

---

## Phase 1c — parties and ledger ✅ done (2026-08-29)

Party CRUD with custom fields, an outstanding-balance list, and a per-party
ledger with a running balance. Verified in a browser: created a contact with a
₹1500 opening balance; the detail page showed it carried forward as the ledger's
first row and the list totalled it correctly.

- **Outstanding is computed in Postgres `numeric`**, not JavaScript. Only
  `status = 'issued'` counts — drafts are not owed, and cancelled invoices are
  not either, which is why the query filters on status rather than on "has a
  number" (cancelled invoices keep theirs). Estimates and delivery challans are
  excluded; nobody owes money for a quotation.
- **The running balance is recomputed, never stored.** A stored one has to be
  rewritten whenever an older entry is corrected, and the day that rewrite is
  missed the ledger silently stops adding up.
- **Opening balance is locked after creation.** It is the ledger's starting
  point; moving it later would change every running balance since, with no
  record of why. To change what someone owes, record a payment.
- **Cancelled invoices appear in the ledger with a zero amount.** Omitting them
  makes it look like an invoice vanished — exactly the accusation a
  cancellation invites.
- A GSTIN whose state prefix disagrees with the recorded state **warns rather
  than blocks**. It is occasionally legitimate (a Delhi-registered buyer taking
  delivery in Haryana) but usually a typo, and it silently flips IGST vs
  CGST/SGST on every future invoice.

---

## Phase 1d — invoices ⚠️ done except inline party create (2026-08-29)

The MVP's core. Verified end to end against Neon in a browser, and the numbers
were checked in the database afterwards rather than trusted from the screen:

| Step | Verified |
|---|---|
| Business had no GSTIN | Tax Invoice and Bill of Supply were **not offered**; GST fields hidden |
| GSTIN added in Settings | All five document types appeared |
| Party in Maharashtra, business in UP | Place of supply resolved to 27 "(party state)" → **IGST** |
| Live preview | 10 × ₹28 = ₹280 taxable, IGST ₹50.40, round off −₹0.40, total ₹330 |
| Issued | Number **001**, FY 2026-27; stock 48 → 38; party outstanding 1500 → 1830 |
| Partial payment ₹100 | Paid ₹100, Due ₹230, `payment_status = partial` |
| Cancelled | Stock back to 48 via a `sale_cancelled` reversal — the `sale` row is still there |
| After cancelling | Invoice **keeps 001**, `next_number` stayed at 2 — the number was not reused |
| Reconciliation | `sum(stock_movements) === current_stock` at every step |

### The piece that makes this trustworthy

`buildInvoice` in `packages/core/src/services` composes place of supply,
financial year and the tax engine into the exact shape the `invoices` and
`invoice_lines` columns take. **The browser runs the same function for its live
preview that the server runs on save** — so the total a shopkeeper watches while
typing cannot disagree with what gets stored, because it is not a second
implementation of the arithmetic.

The client never sends totals. It sends what a person typed; the server
recomputes every figure. A browser must not get to decide what a customer owes.
The party's state is read from the stored record too, not the form — otherwise a
crafted request could flip IGST to CGST/SGST.

### Not done

**Inline party creation from the invoice form.** `quickCreatePartyAction` is
written and validated, but no UI is wired to it yet; billing a new customer
means either using the walk-in name field or creating the contact first.

**100 core tests** (8 new for `buildInvoice`), 136 unit tests overall.

---

## Phase 1e — print views ✅ done (2026-08-29)

A4 and 80mm thermal, both from the same route with a `?format=` switch. No PDF
library: `@media print` plus the browser's own dialog, which every shopkeeper
already knows how to use.

- **The template reads only the invoice's own snapshot columns.** It never joins
  back to `products` or `parties`. A price change or a corrected address must
  not alter a document that was printed and handed over months ago — that is
  what the snapshot columns exist for (spec §4.3).
- **Format preference is remembered.** A counter with a thermal roll should not
  be asked "A4 or 80mm?" on every bill.
- Verified in a browser: A4 shows both GSTINs, place of supply, the IGST column
  and a signature block; thermal renders at 272px (≈72mm) in monospace with
  tabular figures; the toolbar carries `.no-print` so it never reaches paper.
- A cancelled invoice prints **\*\* CANCELLED \*\*** and keeps its number.

---

## Phase 1f — public catalog and QR ✅ done (2026-08-29)

The spec's differentiator. `/store/[slug]` and `/store/[slug]/[productSlug]`,
server-rendered with 60s ISR, plus `/app/catalog` for the QR code.

Verified by fetching the pages **anonymously with curl** — no session, no
cookies, exactly what a customer scanning a QR gets:

| Check | Result |
|---|---|
| Shop page | Name, logo, product, price, stock badge, WhatsApp button all in the server HTML |
| `Store` JSON-LD | Emitted with logo and an `OfferCatalog` of products |
| `Product` JSON-LD | Emitted with images, category, brand, offer and availability |
| SEO tags | `<title>` and `og:title` are the SHOP's, not "· Bahikhata"; canonical correct |
| WhatsApp | `wa.me/91...` with the message pre-written, product name included |
| **Leak check** | Exact stock, cost price and GSTIN: **none present in the HTML** |
| Catalog off | 404. Unknown shop: 404. Bad product slug: 404 |

### Decisions

- **Stock is a state, never a number.** Competitors read catalogs; "3 left"
  tells them your volume and turnover. "In stock" tells a customer what they
  need and nothing more.
- **Trial shops get a live catalog.** It is the feature most likely to convince
  someone to pay, so hiding it until they do would be backwards. The SQL check
  mirrors `evaluateAccess()` — the two must stay in step.
- **Prices are withheld from JSON-LD too** when `show_catalog_prices` is off. A
  wholesaler hiding prices on the page must not have them leak into a search
  result through structured data.
- **Product URLs are `{name-slug}-{8 hex}`** — keywords in the path for SEO
  without putting a full uuid in front of a customer.
- **The view counter runs client-side.** The page is ISR-cached, so counting
  during render would record one view per revalidation instead of one per
  visitor. One view per page per browser session.
- **The QR uses error-correction level H** (~30% recoverable). A poster taped to
  a counter gets smudged, curled and half-covered by a card machine.

### A real bug this caught

`/api/catalog/view` was being 307'd to `/login` by the proxy, so the view
counter would have silently recorded nothing in production. `/api/catalog` is
now in `PUBLIC_PREFIXES`. **Verified after the fix**: valid shops record a view
with referrer and resolved product id; a switched-off shop, an unknown slug,
garbage JSON and a foreign product id all return 204 and store nothing.

---

## Not started

Phase 1 (core billing), Phase 2 (compliance), Phase 3 (scale). The spec's
build order puts steps 4–6 — tax engine, place of supply, invoice numbering —
before any Phase 1 UI, and calls them the highest-leverage work in the project.
That ordering is not negotiable: a wrong tax engine makes every invoice ever
issued wrong, and nobody finds out until a CA calls.

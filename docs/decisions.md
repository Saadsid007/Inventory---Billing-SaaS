# Decisions

Non-obvious choices and the reasoning behind them. If you are about to overturn
one, the argument you need to beat is here.

---

## D1. Toolchain versions

**ESLint 10, not 9.** npm reports 9.39.5 as deprecated and unsupported.
`typescript-eslint@8` declares `^10.0.0` in its peers and Next's plugin needs
only `>=9`, so nothing blocked the move.

**TypeScript 5.9, not 7.** TypeScript 7 (the Go native port) is published and
installable, but the entire lint and build toolchain around it is younger than
the compiler. A billing system is a bad place to be the one filing the bug
reports. Revisit once `typescript-eslint` ships first-class support.

**Node 24 locally, `engines: >=20`.** The spec targets Node 20 LTS; the dev
machine has 24. Nothing in the codebase uses a 22+ API.

---

## D2. Option A — no separate API server

Spec §2.5 offers a choice; we took A. `apps/web` owns every request and calls
`packages/core` directly.

The split that actually matters — business logic out of the framework — is done
by `packages/core` and `packages/db`, both of which are framework-agnostic from
day one. `apps/api` exists as a Hono stub with a `/health` route and nothing
else. Standing it up later is writing route wrappers around services that
already exist, not a rewrite.

Choose B only when a mobile app or third-party API access makes two origins,
CORS and cross-origin session sharing worth roughly 1–1.5 extra weeks.

---

## D3. postgres.js, not the Neon serverless driver

Invoice numbering (spec §5.1) requires `SELECT … FOR UPDATE` inside an
interactive transaction. Neon's HTTP driver cannot do interactive transactions
at all; the WebSocket `Pool` can, but needs a `ws` shim under Node and adds a
layer for no benefit while we run on Node runtime.

postgres.js gives real transactions, works everywhere Next's Node runtime works,
and swapping it later is one file (`packages/db/src/client.ts`).

Two consequences, both handled:

- `prepare: false` — Neon's pooled endpoint runs PgBouncer in transaction mode,
  which cannot hold server-side prepared statements.
- **Never add a numeric type parser.** postgres.js returns `numeric` as a string
  by default and it must stay a string until it reaches `Decimal`. Parsing it to
  a float is how invoices go a paisa wrong.

---

## D4. Two database URLs

`DATABASE_URL` is pooled (the app). `DATABASE_URL_UNPOOLED` is direct
(`drizzle-kit` and `src/migrate.ts`), because DDL through PgBouncer's
transaction pooling is unreliable.

The direct URL is the pooled URL with `-pooler` removed from the hostname and
**everything else identical**. Derive it; don't retype it. See
[runbook.md](./runbook.md#the-two-url-trap) for the failure this already caused.

---

## D5. Boundaries are enforced, not documented

Spec §2.5 states architectural rules. Stated rules decay. These are machine-checked:

- **`packages/core` is import-restricted** against `@bahikhata/db`, any ORM, any
  driver, Next, React, `@bahikhata/ui`, `@bahikhata/shared/env` and the
  filesystem — plus `Math.round`, which is float rounding on money. The rule
  lives in `packages/core/eslint.config.mjs`, and
  `packages/core/src/boundaries.test.ts` lints fixtures through that real config,
  so deleting a pattern turns the test suite red.
- **The database client is not exported.** `@bahikhata/db`'s `exports` map
  publishes only `.` and `./schema`. `src/client.ts` is absent, so no app can
  resolve it even deliberately. `packages/db/src/boundaries.test.ts` asserts the
  exports map stays that way.

---

## D6. `PKT` is not a real UQC

`SEED_UNITS` seeds `PKT` for "Packet" because the spec asks for it and it is the
word shopkeepers use. It is **not** an official GST Unit Quantity Code — the
portal's equivalent is `PAC` (Packs).

This is harmless until Phase 2 builds the GSTR-1 HSN summary, which validates
UQCs. If the portal rejects it, change `shortName` to `PAC` in
`packages/shared/src/constants/seed.ts` and migrate existing rows. Flagged in a
comment at the definition.

---

## D7. Money crosses every boundary as a string

`numeric` columns are read as strings, carried as strings, and only ever become
`Decimal` inside `packages/core`. There is no point in the system where a rupee
value is a JavaScript `number`.

`packages/shared/src/types/money.ts` names the types (`MoneyString`,
`QuantityString`); `packages/core/src/money.ts` owns the arithmetic, with a
*cloned* decimal.js constructor so this package can never change global rounding
behaviour for anything else.

---

## D8. Env fails at boot, not at request time

`packages/shared/src/env.ts` exports a pure `parseServerEnv(raw)` — testable
against fixtures — and `assertServerEnv()`, which `apps/web/instrumentation.ts`
calls once per server process. A bad config kills startup with a message naming
every missing variable. Verified: a malformed `DATABASE_URL` refuses to serve at
all rather than 500ing on whichever request first touches the database.

Supabase variables are deliberately **optional** and guarded by
`requireStorageEnv()`, so a half-configured deploy fails with a useful message at
the point of upload rather than blocking every environment before Phase 1b needs
storage.

---

## D9. Tailwind v4, CSS-first tokens

Design tokens live in `packages/ui/src/styles/theme.css` using `@theme inline`
with shadcn-compatible variable names, so components pulled in with the shadcn
CLI work unmodified. `apps/web/app/globals.css` imports it and adds an
`@source` directive, because Tailwind does not scan packages outside the app
directory on its own.

Colours are `oklch`: the dark palette is derived by moving lightness rather than
hand-picking a second set of hex values.

---

## D10. Self-serve trial, not manual approval

**Changed 2026-08-28, overriding build spec §1.**

The spec's model was: sign up → wait for a super admin to approve → get access.
That is friction at the worst possible moment. Someone who installs a billing app
at 9pm wants to bill a customer at 9:01, not read a "we'll get back to you" screen.

Now: **register → 10 days of full access immediately → ₹299/month.** No approval
queue, no card up front.

### Expiry is derived, never stored

`evaluateAccess({ status, trialEndsAt })` in `@bahikhata/shared` computes access
on every request. There is deliberately no stored `expired` status:

- A stored value needs a scheduled job to write it, and the day that job silently
  fails, every expired trial stays open.
- A derived value is correct without anything having run.

A missing `trial_ends_at` **fails open**. That is a data bug, and locking a
customer out of their own invoices is the wrong response to one.

### Consequences

- `businesses.status` defaults to `trial`; `trial_ends_at` is stamped at signup.
- `pending` and `rejected` remain in the enum but nothing produces them. Removing
  a Postgres enum value is disproportionately painful for zero benefit, and
  `evaluateAccess` maps `pending` to no-access so stale rows cannot slip through.
- `/app/pending` became `/app/subscribe`.
- The public catalog stays live during a trial. It is the feature most likely to
  convince someone to pay, so hiding it until they do would be backwards. That
  query's expiry test mirrors `evaluateAccess` — **the two must stay in step.**
- Payment is still outside the product (spec §7 rules out in-app checkout). Someone
  marks the business `active` once payment lands. Phase 3 replaces that with
  Razorpay subscription automation.

---

## D11. Access is checked live, not from the JWT

The session token carries identity, `businessId` and `role` — all stable. It
deliberately does **not** carry subscription status.

`proxy.ts` runs on the edge runtime with no database, so it can only answer "is
there a session?". If it also decided access, a 30-day JWT would keep a paying
customer locked out until their token happened to refresh.

So `requireBusiness()` reads status live on every authenticated request — one
indexed row read, bundled with the fields the app shell needs, and wrapped in
React's `cache()` so a layout, its page and any server action share one read.
Verified: marking a business paid in the database let it straight back in on the
next request, with no re-login.

A layout guard does not protect a mutation. **Every server action under `/app`
must call `requireBusiness()` itself.**

---

## D12. UI copy is English

Earlier screens were written in Hinglish. Changed to English on request
(2026-08-28) — all user-facing strings, including Zod validation messages in
`packages/shared/src/schemas/auth.ts`, which are shared by client and server.

Keep new copy in English. Product vocabulary that has no natural English
equivalent for this audience — *khata*, *GSTIN*, *HSN* — stays as-is.

---

## D13. Numbering uses an upsert, not SELECT … FOR UPDATE

Spec §5.1 sketches: lock the series row with `SELECT … FOR UPDATE`, insert one
if it is missing, increment, commit.

The insert path races. On the very first invoice of a series two concurrent
transactions both find nothing and both try to create the row. One fails on the
unique constraint — and under READ COMMITTED the loser cannot see the winner's
uncommitted row when it re-selects, so a naive retry loop spins.

Replaced with one atomic statement:

```sql
insert into invoice_series (business_id, kind, fy, prefix, padding, next_number)
values (..., 2)
on conflict (business_id, kind, fy)
  do update set next_number = invoice_series.next_number + 1
returning (invoice_series.next_number - 1) as allocated, prefix, padding
```

`RETURNING` gives the post-update row, so the allocated number is
`next_number - 1` on **both** paths — the insert path (1 → 2) and the update
path (n → n+1). It takes the same row lock, so concurrent issues serialise
exactly as intended.

**Still not a Postgres SEQUENCE, and never will be.** Sequences do not roll
back: a failed transaction burns its number and leaves a permanent gap, which
in a GST series is a compliance problem. An ordinary row rolls back with
everything else. There is a test for precisely this.

**Caller's obligation:** `allocateInvoiceNumber` must run inside the same
transaction that writes `invoice_no` and `status = 'issued'`. Outside one, a
later failure advances the counter and leaves the number unused — recreating
the gap the whole design exists to prevent.

`packages/db` does not format the number. It returns the raw counter and the
series shape, and `formatInvoiceNumber()` in core turns that into `INV-007` —
partly because `db → core` is not an allowed dependency (§2.5), and partly
because string formatting has no business being untestable behind a database.

---

## D14. Three tax behaviours that look like bugs and are not

Each of these will look wrong to someone reading the code cold. They are all
deliberate and all tested.

**CGST and SGST are halves of the already-rounded total.** Not two independent
roundings of `taxable × rate/2`. On ₹0.05 of tax, independent rounding gives
0.03 + 0.03 = 0.06 and the invoice does not add up. Halving the rounded total
and giving the remainder to SGST guarantees `cgst + sgst === tax`.

**Tax is rounded per line, then summed — never computed on the subtotal.**
200 lines of ₹0.99 at 5% come to ₹10.00 of tax, not the ₹9.90 you get from 5%
of the ₹198 subtotal. GST is charged per line, the invoice prints per-line tax,
and the total must be the sum of the column a customer can add up themselves.
Anyone "fixing" this to match tax-on-subtotal breaks that reconciliation.

**A discount larger than its line clamps the line to zero.** It does not go
negative. Negative GST on a sale is not a thing — that is what a credit note is
for, and credit notes are a separate document type in Phase 2.

One genuine generalisation of the spec: for **inclusive** pricing the divisor is
`(100 + rate + cess)`, where the spec writes `(100 + rate)`. The two agree
whenever cess is zero, which is nearly always. With a cess, the spec's version
leaves the grand total short of the price the shopkeeper typed — defeating the
entire point of inclusive mode.

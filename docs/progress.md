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

## Not started

Phase 1 (core billing), Phase 2 (compliance), Phase 3 (scale). The spec's
build order puts steps 4–6 — tax engine, place of supply, invoice numbering —
before any Phase 1 UI, and calls them the highest-leverage work in the project.
That ordering is not negotiable: a wrong tax engine makes every invoice ever
issued wrong, and nobody finds out until a CA calls.

# Runbook

## Setup

```bash
pnpm install
cp .env.example .env
```

Then fill `.env`. Env is validated at boot — a bad value crashes startup with a
message naming every missing variable, which is intentional.

## Commands

| Command | Notes |
|---|---|
| `pnpm dev` | Next on :3000 |
| `pnpm build` | Whole workspace |
| `pnpm typecheck` | `tsc --noEmit` everywhere |
| `pnpm lint` | ESLint per package, via Turbo |
| `pnpm test` | Vitest per package — **unit tests only**, fast |
| `pnpm test:integration` | The database-backed suites. Slow (~2 min), and not optional |
| `pnpm db:generate` | Writes a migration from schema changes into `packages/db/drizzle/` |
| `pnpm db:migrate` | Applies pending migrations over the **direct** URL |
| `pnpm db:seed` | Idempotent global reference data (GST slabs). Run after migrating |
| `pnpm db:studio` | Drizzle Studio |

Never edit the database by hand, and never edit a migration that has been
applied (spec rule 7).

---

## Traps that have already cost time

### The two-URL trap

`.env` needs both `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
The direct one is the pooled string with `-pooler` removed from the hostname and
**nothing else changed**.

The first time these were filled in, the host was edited correctly but the
password was left as the placeholder from `.env.example`. The symptom —
`password authentication failed for user 'neondb_owner'` on the direct endpoint
while the pooled endpoint worked fine — looks like a Neon permissions problem
and is not.

**If one endpoint authenticates and the other doesn't, compare the two passwords
before investigating anything else.** Derive the direct URL from the pooled one:

```bash
node -e "const u=new URL(process.env.DATABASE_URL);u.hostname=u.hostname.replace('-pooler','');console.log(u.toString())"
```

### Stale dev servers on Windows

`pkill -f "next dev"` does not reliably kill Next on Windows; a second
`next dev` then refuses to start and tells you the PID of the first. Use
`taskkill //PID <pid> //F` (double slashes in Git Bash).

### `next lint` is gone

Next 16 removed the built-in lint step, so `next.config.ts` has no `eslint` key
— setting one is a type error. Linting is entirely `pnpm lint`.

### pnpm 11 config keys

pnpm 11 uses `allowBuilds` in `pnpm-workspace.yaml`, not `onlyBuiltDependencies`.
On a fresh install it will rewrite the file with a placeholder asking you to
approve each native-binary package. The four approved ones (`esbuild`,
`@tailwindcss/oxide`, `unrs-resolver`, `sharp`) are all build tooling that
cannot function without their platform binary — no application dependency runs a
postinstall script here.

---

## Database

Neon Postgres 18.6, region `ap-southeast-1` (Singapore), database `neondb`,
role `neondb_owner`.

`gen_random_uuid()` is built into Postgres 13+ — the `pgcrypto` extension is
**not** required and is not installed.

---

## Tests

`pnpm test` runs unit tests only, so the inner loop stays fast. The suites that
spec §8 calls non-negotiable need a real database and live behind
`pnpm test:integration`:

| Suite | Proves |
|---|---|
| `numbering.integration.test.ts` | §8.2 — 40 parallel transactions produce no duplicate and no gap; a failed transaction rolls the counter back |
| `isolation.integration.test.ts` | §8.3 — business A cannot read or mutate any row of business B; §8.4 — `sum(stock_movements) === products.current_stock` after randomised operations |

They create a throwaway tenant, use financial years in the 2090s so they can
never collide with real data, and delete everything in `afterAll`. **CI must run
them**; skipping them because they are slow defeats the point of having them.

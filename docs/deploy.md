# Deploying to Vercel

The repo is a pnpm workspace with one deployable app, `apps/web`. Everything
else (`packages/*`) is TypeScript source that Next compiles itself via
`transpilePackages`, and `apps/api` is a dormant stub that is never deployed.

## 1. Before you touch Vercel

**Decide the final domain first.** `NEXT_PUBLIC_APP_URL` is baked into the
bundle at build time, and it is what every catalog QR code points at. A poster
printed while that value says `something.vercel.app` keeps pointing there
forever. Pick the domain, then deploy.

**Give production its own database.** Local development currently shares the
same Neon database as everything else. In Neon, keep `main` as production and
create a `dev` branch for local work — one command in the Neon console, and it
means a bad local experiment cannot touch a shopkeeper's books.

**Apply migrations from your machine, not from the build.** Two deploys
building at once would run migrations concurrently, and a build sandbox is a bad
place to discover a failed DDL:

```bash
DATABASE_URL_UNPOOLED='<neon direct url>' pnpm db:migrate
```

## 2. Create the project

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root Directory | `apps/web` |
| Include files outside root | **On** (needed — `packages/*` live outside `apps/web`) |
| Install command | leave default (`pnpm install` at the workspace root) |
| Build command | leave default (`next build`) |
| Node version | 22 |
| Function region | **Singapore (sin1)** — the Neon database is in `ap-southeast-1`, and putting the functions anywhere else adds a round trip to every query |

`outputFileTracingRoot` in `next.config.ts` already resolves to the repo root
from `apps/web`, so file tracing works without a `vercel.json`.

## 3. Environment variables

Set these for **Production** (and Preview, if you want previews to work) before
the first build — `NEXT_PUBLIC_*` values are inlined at build time, so changing
one later needs a redeploy, not just a restart.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** string (host contains `-pooler`), `?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Neon direct string. Only used by migrations; optional on Vercel |
| `AUTH_SECRET` | `openssl rand -base64 32` — a fresh one, not the local value |
| `AUTH_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` (same) |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose this |
| `SUPABASE_PUBLIC_BUCKET` | `public-assets` |
| `SUPABASE_PRIVATE_BUCKET` | `invoices` |
| `NEXT_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

Do not set `NODE_ENV` (Vercel sets it) and never set `SKIP_ENV_VALIDATION` on a
running server — that flag exists so a CI image can compile without secrets, and
it would turn a misconfiguration into a 500 hours later instead of a failed
boot.

`instrumentation.ts` validates all of this once per server process. A missing or
malformed value fails the deployment immediately with the exact field named,
which is the intended behaviour.

## 4. Deploy, then verify

1. Add the custom domain in Vercel and point DNS.
2. Confirm `AUTH_URL` and `NEXT_PUBLIC_APP_URL` are the real domain, and
   redeploy so the public value is rebaked.
3. Check in this order — each one exercises a different subsystem:
   - `/` loads → build and env are fine.
   - `/register` creates an account and lands in `/app` → database write path.
   - Make a bill → numbering, tax engine and stock movement.
   - `/app/products/[id]` upload an image → Supabase credentials.
   - `/store/<slug>` in a private window → the public catalog, unauthenticated.
   - `/admin/login` → admin entry.
4. Promote yourself to admin on the production database, once:
   ```sql
   update users set is_super_admin = true where email = 'you@example.com';
   ```
   There is deliberately no bootstrap UI for this. The first admin is a
   deliberate act on the database; after that, admins add each other by email
   from `/admin/admins`.

## Things that will bite

**pnpm version.** `package.json` pins `packageManager: pnpm@11.18.0`. If the
install step fails complaining about the pnpm version, set the project env var
`ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel honours the pin. The lockfile itself
is format 9.0, which older pnpm releases read fine.

**Preview deployments and auth.** Preview URLs are random, but `AUTH_URL` is a
fixed value, so a preview build with production's `AUTH_URL` will bounce sign-in
to production. Either give the Preview environment its own `AUTH_URL`, or accept
that previews are for looking at pages and not for logging in.

**Payments are still manual.** Nothing about deployment changes the subscription
model: a shop pays out of band, and someone marks them paid in `/admin`. Spec §7
rules out in-app checkout until Phase 3.

**Print output.** Verify one A4 and one 80mm print on the deployed site before
telling anyone to use it. It is the one screen where a CSS regression produces
paper that a customer keeps.

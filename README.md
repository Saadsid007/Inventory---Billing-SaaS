# Bahikhata

Multi-tenant inventory + billing SaaS for Indian small businesses, with a public
product catalog per business.

The build spec in [`inventory-billing-saas-build-spec.md`](./inventory-billing-saas-build-spec.md)
is the single source of truth. This README only covers how to run the repo.

## Requirements

- Node 20 LTS or newer
- pnpm 9+

## Setup

```bash
pnpm install
cp .env.example .env   # then fill in real values
```

Env is validated on boot by `packages/shared/src/env.ts`. A missing or malformed
variable crashes the process at startup rather than at request time.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Starts `apps/web` on http://localhost:3000 |
| `pnpm build` | Builds every package and app |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` | ESLint across the workspace |
| `pnpm test` | Vitest across the workspace |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Layout

```
apps/
  web/       Next.js App Router — the whole product (Option A: no separate API server)
  api/       Hono stub. Intentionally not wired up. See spec §2.5.
packages/
  shared/    Zod schemas, types, enums, constants, env validation
  core/      Pure business logic. Zero framework, zero DB imports.
  db/        Drizzle schema, migrations, repositories. All SQL lives here.
  ui/        shadcn/ui components, Tailwind theme tokens
```

## The rules that matter

1. `packages/core` imports **nothing** but `packages/shared`. No Drizzle, no
   Next, no React. ESLint fails the build if you try.
2. No SQL outside `packages/db/src/repositories/`. Apps import repository
   functions, never the `db` client.
3. Every repository function takes `TenantCtx` as its first argument — including
   reads. `businessId` comes from the session, never from a request parameter.
4. Money is `numeric(12,2)` in the DB and `Decimal` in code. Never a JS `number`.

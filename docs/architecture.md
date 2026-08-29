# Architecture

## Shape

```
apps/web        Next.js App Router — the whole product
apps/api        Hono stub. Dormant by design (decisions.md D2).

packages/shared Zod schemas, types, enums, constants, env validation
packages/core   Pure business logic. Zero framework, zero database.
packages/db     Drizzle schema, migrations, repositories. All SQL.
packages/ui     Design system.
```

Allowed dependencies, and nothing else:

```
apps/web   →  ui, shared, core, db
apps/api   →  shared, core, db
core       →  shared        ← only this. no db, no next, no react.
db         →  shared
ui         →  shared
```

## The three rules everything else follows from

### 1. `packages/core` is pure

It takes plain data in and returns plain data out. No ORM, no driver, no
framework, no environment config, no filesystem.

This is what makes the tax engine testable exhaustively in milliseconds instead
of needing a database. Spec §9 puts the tax engine, place-of-supply rules and
invoice numbering ahead of all UI work for exactly this reason — if the tax
engine is wrong, every invoice ever issued is wrong, and nobody finds out until
a CA calls.

If you are adding a dependency to `core` to make an import work, the dependency
belongs in the caller, passed in as an argument.

Enforced by `packages/core/eslint.config.mjs`, and that config is itself covered
by `packages/core/src/boundaries.test.ts`.

### 2. All SQL lives in `packages/db/src/repositories/`

Apps import repository functions. They never import the database client — it is
deliberately missing from `@billwise/db`'s `exports` map, so it cannot be
resolved from outside the package at all.

Schema files describe tables; they never query.

### 3. Every repository function takes `TenantCtx` first — including reads

```ts
export type TenantCtx = { businessId: string; userId: string; role: 'owner' | 'staff' };

export async function listProducts(ctx: TenantCtx, filters: ProductFilters) {
  return db.select().from(products).where(eq(products.businessId, ctx.businessId));
  //                                          ^ always from ctx
}
```

`businessId` comes from the authenticated session, resolved server-side by
`requireBusiness()`. **If you see it come from a request body or a query
parameter, that is a bug** — it is the whole multi-tenancy boundary, and a
single unscoped query leaks one business's data to another.

## Layering a feature

Spec rule 9: when a feature touches schema, logic and UI, build it in that order
as separate steps — `db` → `core` → `apps/web` — not one large edit.

A route handler or server action does exactly three things:

1. validate input with a Zod schema from `packages/shared`
2. call a service from `packages/core`
3. format the response

No business logic in routes. No tax or stock arithmetic inside `apps/`.

## Packages are consumed as source

No build step during Phase 0–1. Each package's `exports` map points directly at
`src/*.ts`, and `apps/web` compiles them via `transpilePackages`. Simpler than
`tsup` for now; revisit if a package ever needs to be published or consumed by
something that isn't Next.

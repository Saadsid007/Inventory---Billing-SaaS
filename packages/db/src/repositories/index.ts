/**
 * Repositories. Build spec §2.5 hard rules 2 and 3.
 *
 * ALL SQL in this codebase lives under this directory, and every exported
 * function takes `TenantCtx` as its first argument — reads included. The
 * business id always comes from that context, never from a request parameter.
 *
 * `businesses.ts` is the reference shape; copy it. `auth.ts` is the one
 * documented exception, because it is the code that establishes a context in
 * the first place.
 */

export * from './auth';
export * from './businesses';
export * from './masters';
export * from './numbering';
export * from './products';
export * from './stock';
export * from './parties';
export * from './invoices';
export * from './catalog';
export * from './reports';
export * from './admin';
export * from './billing';
export * from './returns';
export * from './applications';
// Reads one bill by its share token, with no TenantCtx. See the file header for
// why that is safe and what must never be added to it.
export * from './public-receipt';
// Bulk writer for `apps/web/scripts/seed-demo.ts`. Guarded so it can only ever
// touch accounts on the demo email domain.
export * from './demo-seed';

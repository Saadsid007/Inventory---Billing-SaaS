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
export * from './numbering';
export * from './businesses';

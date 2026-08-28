/**
 * Repositories. Build spec §2.5 hard rules 2 and 3.
 *
 * ALL SQL in this codebase lives under this directory, and every exported
 * function takes `TenantCtx` as its first argument — reads included. The
 * business id always comes from that context, never from a request parameter.
 *
 * Landed at build-order step 7; businesses.ts arrives earlier, in Phase 0b, as
 * the reference example.
 */

export {};

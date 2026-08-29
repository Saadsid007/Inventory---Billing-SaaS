import { Hono } from 'hono';

/**
 * Standalone HTTP server — Option B in build spec §2.5. INTENTIONALLY DORMANT.
 *
 * The project runs Option A: apps/web owns every request, calling
 * @billwise/core directly through server actions and route handlers. One
 * deploy, one auth setup, no CORS.
 *
 * This stub exists because the split that actually matters — business logic out
 * of the framework — already lives in packages/core and packages/db. Standing
 * this server up later is writing route wrappers around services that already
 * exist, not a rewrite. Do that only when a mobile app or third-party API
 * access makes two origins worth the cost.
 *
 * Nothing imports this file. It has no dev or build script by design.
 */
const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'billwise-api' }));

export default app;

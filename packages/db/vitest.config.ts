import { defineConfig } from 'vitest/config';

/**
 * Integration tests are excluded from the default run.
 *
 * They talk to a real Neon database and take a couple of minutes, which is too
 * slow for the inner loop. They are NOT optional though — spec §8 makes tenant
 * isolation, numbering concurrency and stock reconciliation non-negotiable — so
 * `pnpm test:integration` runs them, and CI must too.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'src/**/*.integration.test.ts'],
  },
});

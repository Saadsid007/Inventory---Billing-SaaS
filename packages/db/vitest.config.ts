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
    /**
     * The boundary test imports the whole package to prove it opens no socket.
     * That is a real cost — every schema and repository is compiled — and it
     * grew past the 5s default as the package did, so `turbo run test` failed
     * intermittently while the same test passed on its own. A slow import is
     * not the failure this suite is looking for.
     */
    testTimeout: 30_000,
  },
});

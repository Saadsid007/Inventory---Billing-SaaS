import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Each file creates its own throwaway tenant, but they share a connection
    // pool and a database — run them one at a time.
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 120_000,
  },
});

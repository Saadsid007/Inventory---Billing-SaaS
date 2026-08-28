import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['{app,lib,components}/**/*.test.ts', 'lib/**/*.test.ts'],
  },
});

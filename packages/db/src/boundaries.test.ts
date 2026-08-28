import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards build spec §3: "No file outside packages/db/src/repositories/ imports
 * the raw db client." The cheapest durable enforcement is the package exports
 * map — if `./client` is not published, apps cannot resolve it at all.
 */
describe('package boundaries', () => {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  ) as { exports: Record<string, string> };

  it('does not expose the database client to consumers', () => {
    const paths = Object.keys(pkg.exports);
    expect(paths).not.toContain('./client');
    expect(Object.values(pkg.exports).join(' ')).not.toContain('client');
  });

  it('exposes only the repository and schema entry points', () => {
    expect(Object.keys(pkg.exports).sort()).toEqual(['.', './schema']);
  });
});

describe('module graph', () => {
  it('loads schema and repositories without needing a database connection', async () => {
    // Importing the package must not open a socket — getDb() is lazy.
    await expect(import('./index')).resolves.toBeDefined();
  });
});

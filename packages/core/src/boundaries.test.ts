import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Build spec §2.5, hard rule 1 — the boundary that makes this package worth
 * having:
 *
 *   "packages/core must never import from packages/db or any framework."
 *
 * The rule lives in eslint.config.mjs, but a config file is easy to weaken by
 * accident during an unrelated refactor. This test lints a fixture through the
 * real ESLint config, so the day someone deletes a pattern the suite goes red
 * instead of the architecture quietly rotting.
 */

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: process.cwd() });
});

async function lint(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: 'src/__fixture__.ts' });
  return (result?.messages ?? []).map((m) => `${m.ruleId ?? 'unknown'}: ${m.message}`);
}

/** Each entry: what a careless import would look like, and why it's banned. */
const forbidden: ReadonlyArray<[label: string, code: string]> = [
  ['the database package', `import { x } from '@bahikhata/db';\nexport const a = x;`],
  ['an ORM', `import { eq } from 'drizzle-orm';\nexport const a = eq;`],
  ['a database driver', `import postgres from 'postgres';\nexport const a = postgres;`],
  ['Next.js', `import { NextResponse } from 'next/server';\nexport const a = NextResponse;`],
  ['React', `import { useState } from 'react';\nexport const a = useState;`],
  ['the design system', `import { cn } from '@bahikhata/ui';\nexport const a = cn;`],
  ['environment config', `import { serverEnv } from '@bahikhata/shared/env';\nexport const a = serverEnv;`],
  ['the filesystem', `import { readFileSync } from 'node:fs';\nexport const a = readFileSync;`],
];

describe('core stays pure', () => {
  it.each(forbidden)('rejects importing %s', async (_label, code) => {
    const messages = await lint(code);
    expect(messages.some((m) => m.startsWith('no-restricted-imports'))).toBe(true);
  }, 20_000);

  it(
    'rejects Math.round, which is float rounding on money',
    async () => {
      const messages = await lint(`export const a = Math.round(1.005);`);
      expect(messages.some((m) => m.startsWith('no-restricted-properties'))).toBe(true);
    },
    20_000,
  );

  it(
    'still allows the one dependency core is meant to have',
    async () => {
      const messages = await lint(
        `import { GST_STATES } from '@bahikhata/shared';\nimport Decimal from 'decimal.js';\nexport const a = [GST_STATES.length, Decimal.ROUND_HALF_UP];`,
      );
      expect(messages).toEqual([]);
    },
    20_000,
  );
});

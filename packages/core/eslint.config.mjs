import base from '../../eslint.config.mjs';

/**
 * Build spec §2.5, hard rule 1:
 *
 *   "packages/core must never import from packages/db or any framework.
 *    It takes plain data in, returns plain data out."
 *
 * This is the rule that keeps the tax engine unit-testable in milliseconds
 * instead of requiring a database. If you are about to add something here to
 * make an import work, you are solving the wrong problem — the dependency
 * belongs in the caller, passed in as an argument.
 */
const boundary = {
  patterns: [
    {
      group: ['@bahikhata/db', '@bahikhata/db/*'],
      message:
        'core cannot touch the database. Take the data as a function argument and let the caller in apps/ or packages/db fetch it.',
    },
    {
      group: ['@bahikhata/ui', '@bahikhata/ui/*'],
      message: 'core is presentation-free. Move anything UI-shaped to packages/ui.',
    },
    {
      group: ['@bahikhata/shared/env', '../../shared/src/env', '**/shared/src/env'],
      message:
        'core must not read environment config. Pass configuration in as a parameter so tests can vary it.',
    },
    {
      group: ['drizzle-orm', 'drizzle-orm/*', 'drizzle-kit', 'drizzle-zod'],
      message: 'No ORM in core. Repositories live in packages/db/src/repositories.',
    },
    {
      group: ['postgres', 'pg', 'pg-*', '@neondatabase/*'],
      message: 'No database driver in core.',
    },
    {
      group: ['next', 'next/*', 'next-auth', 'next-auth/*', '@auth/*', 'hono', 'hono/*'],
      message: 'core is framework-agnostic. HTTP and auth concerns belong in apps/.',
    },
    {
      group: ['react', 'react-dom', 'react/*', 'react-dom/*', 'react-*'],
      message: 'core renders nothing.',
    },
    {
      group: ['fs', 'node:fs', 'node:fs/*', 'path', 'node:path'],
      message: 'core is pure. No filesystem access.',
    },
  ],
};

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', boundary],
      // Money math must never silently become float math.
      'no-restricted-globals': [
        'error',
        {
          name: 'parseFloat',
          message: 'Use Decimal from decimal.js. Floats round wrong on money (spec rule 3).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'round',
          message:
            'Math.round on a float is how invoices end up a paisa off. Use the helpers in core/money.ts.',
        },
      ],
    },
  },
];

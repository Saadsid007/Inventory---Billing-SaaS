import base from '../../eslint.config.mjs';

/**
 * Build spec §2.5, hard rule 2:
 *   "No SQL or Drizzle query outside packages/db/src/repositories/."
 *
 * Inside this package that means: only repositories (and the migration runner)
 * may import the client. Schema files describe tables; they never query.
 */
export default [
  ...base,
  {
    files: ['src/schema/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/client', '**/client.js', '../client', './client'],
              message: 'Schema files declare tables. Queries belong in src/repositories/.',
            },
          ],
        },
      ],
    },
  },
];

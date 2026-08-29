import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import base from '../../eslint.config.mjs';

export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // Spec §2.5 hard rule 2: apps import repository functions, never the
      // database client. The client is not in @billwise/db's exports map
      // either — this catches deep relative imports that try to route around it.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/db/src/client', '@billwise/db/src/*'],
              message:
                'Import a repository function from @billwise/db. Repositories take TenantCtx and scope every query by business_id.',
            },
          ],
        },
      ],
    },
  },
];

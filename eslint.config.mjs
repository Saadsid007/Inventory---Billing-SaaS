import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Shared base config. Every workspace package re-exports this and appends its
 * own rules — see packages/core/eslint.config.mjs for the boundary enforcement
 * required by build spec §2.5.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/drizzle/**',
      '**/*.config.mjs',
      '**/*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);

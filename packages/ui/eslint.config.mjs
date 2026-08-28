import base from '../../eslint.config.mjs';

export default [
  ...base,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // The design system is presentation only. Data access belongs upstream.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@bahikhata/db', '@bahikhata/db/*'],
              message: 'UI components receive data as props. They never query.',
            },
          ],
        },
      ],
    },
  },
];

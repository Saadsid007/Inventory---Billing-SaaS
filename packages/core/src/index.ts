/**
 * @billwise/core — pure business logic.
 *
 * Zero framework imports, zero database imports. Everything here takes plain
 * data in and returns plain data out, which is what lets the tax engine and the
 * numbering rules be tested exhaustively in milliseconds without a database.
 * ESLint enforces the boundary — see eslint.config.mjs in this package.
 */

export * from './money';
export * from './tax/index';
export * from './gst/index';
export * from './numbering/index';
export * from './stock/index';
export * from './services/index';

/**
 * @bahikhata/db — schema, migrations and repositories.
 *
 * The public surface of this package is repositories and schema types. The
 * connection itself (`./client`) is intentionally not exported, so no app can
 * reach past a repository and run an unscoped query.
 */

export * from './schema/index';
export * from './repositories/index';

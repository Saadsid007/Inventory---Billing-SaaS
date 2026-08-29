/**
 * Boot hook. Spec §2.5: env is validated at startup, never at request time.
 *
 * Next runs this once per server process before handling any traffic, so a
 * missing DATABASE_URL kills the deploy immediately instead of turning into a
 * 500 on whichever request happens to hit the database first.
 */
export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { assertServerEnv } = await import('@billwise/shared/env');
    assertServerEnv();
  }
}

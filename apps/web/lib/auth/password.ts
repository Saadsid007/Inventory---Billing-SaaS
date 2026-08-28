import 'server-only';
import bcrypt from 'bcryptjs';

/**
 * Password hashing. Kept in the app layer, not packages/core — bcrypt is an
 * infrastructure concern, and core stays pure so the tax engine can be tested
 * without dragging a KDF into scope.
 */

/**
 * 12 rounds: roughly 250ms per hash on commodity hardware in 2026. Slow enough
 * to make offline cracking expensive, fast enough that a shopkeeper logging in
 * on a slow phone does not notice.
 */
const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A hash of a value nobody knows, used to burn the same CPU time when the email
 * doesn't exist as when it does.
 *
 * Without this, an unknown email returns in ~1ms and a known one in ~250ms,
 * which is a reliable oracle for enumerating who has an account. Callers must
 * compare against this instead of returning early.
 */
export const DUMMY_PASSWORD_HASH: string = bcrypt.hashSync(
  'bahikhata::timing-equaliser::not-a-real-password',
  ROUNDS,
);

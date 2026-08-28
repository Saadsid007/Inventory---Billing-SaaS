import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseServerEnv } from './env';

const validEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://u:p@host.neon.tech/db?sslmode=require',
  AUTH_SECRET: 'a'.repeat(32),
  AUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

describe('parseServerEnv', () => {
  it('accepts a complete config and applies bucket defaults', () => {
    const env = parseServerEnv(validEnv);
    expect(env.DATABASE_URL).toContain('neon.tech');
    expect(env.SUPABASE_PUBLIC_BUCKET).toBe('public-assets');
    expect(env.SUPABASE_PRIVATE_BUCKET).toBe('invoices');
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => parseServerEnv({ ...validEnv, DATABASE_URL: 'mysql://u:p@h/db' })).toThrow(
      EnvValidationError,
    );
  });

  it('rejects a short AUTH_SECRET', () => {
    expect(() => parseServerEnv({ ...validEnv, AUTH_SECRET: 'too-short' })).toThrow(
      EnvValidationError,
    );
  });

  it('names every missing variable in the message', () => {
    try {
      parseServerEnv({});
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as EnvValidationError).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('AUTH_SECRET');
      expect(message).toContain('.env.example');
    }
  });

  it('treats an empty optional string as absent', () => {
    const env = parseServerEnv({ ...validEnv, SUPABASE_URL: '' });
    expect(env.SUPABASE_URL).toBeUndefined();
  });
});

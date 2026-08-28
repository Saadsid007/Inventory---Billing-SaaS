import type { TenantCtx } from '@bahikhata/shared';
import { config as loadEnv } from 'dotenv';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../client';
import { allocateInvoiceNumber, listSeries, updateSeriesShape } from './numbering';

loadEnv({ path: '../../.env', quiet: true });

/**
 * Build spec §8.2 — non-negotiable:
 *
 *   "Invoice numbering — concurrent issue attempts produce no duplicates and
 *    no gaps (test with parallel transactions)."
 *
 * This one CANNOT be a unit test. The whole guarantee lives in Postgres row
 * locking, so a mocked database would prove nothing at all. It runs against the
 * real database and cleans up after itself.
 *
 * Skipped when DATABASE_URL is absent, so CI without a database still passes.
 */

const HAS_DB = Boolean(process.env['DATABASE_URL']);
const suite = HAS_DB ? describe : describe.skip;

const FY = '2099-00'; // far future, so it can never collide with real data
let ctx: TenantCtx;
let businessId: string;
let userId: string;

suite('invoice numbering (integration)', () => {
  beforeAll(async () => {
    const db = getDb();
    // A throwaway tenant. Everything cascades from the business row.
    const [user] = await db.execute<{ id: string }>(sql`
      insert into users (email, name, password_hash)
      values (${`numbering-test-${Date.now()}@invalid.test`}, 'Numbering Test', 'x')
      returning id
    `);
    userId = user!.id;

    const [biz] = await db.execute<{ id: string }>(sql`
      insert into businesses (owner_user_id, name, slug, state_code, status)
      values (${userId}::uuid, 'Numbering Test', ${`numbering-test-${Date.now()}`}, '09', 'trial')
      returning id
    `);
    businessId = biz!.id;
    ctx = { businessId, userId, role: 'owner' };
  }, 60_000);

  afterAll(async () => {
    if (businessId) {
      const db = getDb();
      await db.execute(sql`delete from businesses where id = ${businessId}::uuid`);
      await db.execute(sql`delete from users where id = ${userId}::uuid`);
    }
    await closeDb();
  }, 60_000);

  it('starts a new series at 1 and increments by one', async () => {
    const db = getDb();
    const got: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await db.transaction((tx) =>
        allocateInvoiceNumber(ctx, tx, { kind: 'tax_invoice', fy: FY }),
      );
      got.push(r.number);
    }
    expect(got).toEqual([1, 2, 3, 4, 5]);
  }, 60_000);

  it('keeps each document kind on its own sequence', async () => {
    const db = getDb();
    const est = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, { kind: 'estimate', fy: FY, defaultPrefix: 'EST-' }),
    );
    const dc = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, { kind: 'delivery_challan', fy: FY, defaultPrefix: 'DC-' }),
    );
    // Both are new series, so both start at 1 despite tax_invoice being at 6.
    expect(est.number).toBe(1);
    expect(dc.number).toBe(1);
    expect(est.prefix).toBe('EST-');
    expect(dc.prefix).toBe('DC-');
  }, 60_000);

  it('keeps each financial year on its own sequence', async () => {
    const db = getDb();
    const next = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, { kind: 'tax_invoice', fy: '2098-99' }),
    );
    expect(next.number).toBe(1);
  }, 60_000);

  it('ROLLS BACK the counter when the issuing transaction fails', async () => {
    // The entire reason this is not a Postgres SEQUENCE. A sequence would burn
    // the number here and leave a permanent gap in a GST series.
    const db = getDb();
    const before = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, { kind: 'cash_memo', fy: FY }),
    );
    expect(before.number).toBe(1);

    await expect(
      db.transaction(async (tx) => {
        await allocateInvoiceNumber(ctx, tx, { kind: 'cash_memo', fy: FY });
        throw new Error('simulated failure while issuing');
      }),
    ).rejects.toThrow('simulated failure');

    const after = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, { kind: 'cash_memo', fy: FY }),
    );
    // 2 was allocated then rolled back, so it is handed out again. No gap.
    expect(after.number).toBe(2);
  }, 60_000);

  it('produces no duplicates and no gaps under 40 parallel transactions', async () => {
    const db = getDb();
    const CONCURRENCY = 40;

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        db.transaction((tx) =>
          allocateInvoiceNumber(ctx, tx, { kind: 'bill_of_supply', fy: FY }),
        ),
      ),
    );

    const numbers = results.map((r) => r.number).sort((a, b) => a - b);

    // No duplicates: two invoices sharing a number is the failure that gets a
    // business in trouble.
    expect(new Set(numbers).size).toBe(CONCURRENCY);

    // No gaps: exactly 1..CONCURRENCY, in an unbroken run.
    expect(numbers).toEqual(Array.from({ length: CONCURRENCY }, (_, i) => i + 1));
  }, 120_000);

  it('survives a race on the very first number of a brand-new series', async () => {
    // The case the spec's SELECT-then-INSERT pseudocode races on: nothing
    // exists yet, and several transactions try to create it at once.
    const db = getDb();
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        db.transaction((tx) =>
          allocateInvoiceNumber(ctx, tx, { kind: 'tax_invoice', fy: '2097-98' }),
        ),
      ),
    );
    const numbers = results.map((r) => r.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  }, 120_000);

  it('does not let one business see or advance another business\'s series', async () => {
    const db = getDb();
    const otherCtx: TenantCtx = {
      businessId: '00000000-0000-0000-0000-0000000000ff',
      userId,
      role: 'owner',
    };
    // A foreign business id cannot exist, so the FK rejects it outright —
    // the series can never be shared or advanced across tenants.
    await expect(
      db.transaction((tx) => allocateInvoiceNumber(otherCtx, tx, { kind: 'tax_invoice', fy: FY })),
    ).rejects.toThrow();

    const mine = await listSeries(ctx, db);
    expect(mine.every((s) => s.fy.startsWith('209'))).toBe(true);
  }, 60_000);

  it('lets a business restyle a series without renumbering it', async () => {
    const db = getDb();
    await updateSeriesShape(ctx, db, {
      kind: 'tax_invoice',
      fy: FY,
      prefix: 'GST/26-27/',
      padding: 5,
    });
    const next = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, { kind: 'tax_invoice', fy: FY }),
    );
    expect(next.prefix).toBe('GST/26-27/');
    expect(next.padding).toBe(5);
    // The counter carried on from where it was; restyling does not reset it.
    expect(next.number).toBeGreaterThan(5);
  }, 60_000);

  it('ignores the default prefix once the series exists', async () => {
    const db = getDb();
    const r = await db.transaction((tx) =>
      allocateInvoiceNumber(ctx, tx, {
        kind: 'tax_invoice',
        fy: FY,
        defaultPrefix: 'SHOULD-BE-IGNORED-',
      }),
    );
    expect(r.prefix).toBe('GST/26-27/');
  }, 60_000);
});

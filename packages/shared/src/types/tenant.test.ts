import { describe, expect, it } from 'vitest';
import {
  TRIAL_DAYS,
  addOneMonth,
  nextPeriodEnd,
  trialDaysRemaining,
  trialEndsAt,
} from '../constants/subscription';
import { canAccessApp, evaluateAccess } from './tenant';

const NOW = new Date('2026-08-28T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe('evaluateAccess', () => {
  it('lets a paid business in regardless of any trial date', () => {
    expect(evaluateAccess({ status: 'active', trialEndsAt: days(-100) }, NOW)).toBe('ok');
  });

  it('lets an open trial in', () => {
    expect(evaluateAccess({ status: 'trial', trialEndsAt: days(3) }, NOW)).toBe('ok');
  });

  it('locks out a trial that has run out', () => {
    expect(evaluateAccess({ status: 'trial', trialEndsAt: days(-1) }, NOW)).toBe('trial_expired');
  });

  it('treats the exact expiry instant as expired', () => {
    expect(evaluateAccess({ status: 'trial', trialEndsAt: NOW }, NOW)).toBe('trial_expired');
  });

  it('fails open when a trial has no end date', () => {
    // A missing date is a data bug, not a signal to lock a paying-to-be
    // customer out of their own invoices.
    expect(evaluateAccess({ status: 'trial', trialEndsAt: null }, NOW)).toBe('ok');
  });

  it('reports suspension and rejection distinctly, so the screen can explain', () => {
    expect(evaluateAccess({ status: 'suspended', trialEndsAt: days(5) }, NOW)).toBe('suspended');
    expect(evaluateAccess({ status: 'rejected', trialEndsAt: null }, NOW)).toBe('rejected');
  });

  it('treats the legacy pending status as no access', () => {
    // Nothing creates 'pending' any more, but old rows must not slip through.
    expect(evaluateAccess({ status: 'pending', trialEndsAt: null }, NOW)).toBe('trial_expired');
  });
});

describe('canAccessApp', () => {
  it('is true only for ok', () => {
    expect(canAccessApp({ status: 'trial', trialEndsAt: days(1) }, NOW)).toBe(true);
    expect(canAccessApp({ status: 'trial', trialEndsAt: days(-1) }, NOW)).toBe(false);
    expect(canAccessApp({ status: 'suspended', trialEndsAt: days(1) }, NOW)).toBe(false);
  });
});

describe('trial window', () => {
  it('runs for exactly TRIAL_DAYS from signup', () => {
    const end = trialEndsAt(NOW);
    expect(Math.round((end.getTime() - NOW.getTime()) / 86_400_000)).toBe(TRIAL_DAYS);
    expect(canAccessApp({ status: 'trial', trialEndsAt: end }, NOW)).toBe(true);
  });

  it('is still open on the final day and shut the moment it passes', () => {
    const end = trialEndsAt(NOW);
    const lastMoment = new Date(end.getTime() - 1000);
    const justAfter = new Date(end.getTime() + 1000);
    expect(canAccessApp({ status: 'trial', trialEndsAt: end }, lastMoment)).toBe(true);
    expect(canAccessApp({ status: 'trial', trialEndsAt: end }, justAfter)).toBe(false);
  });

  it('counts down whole days and floors at zero', () => {
    expect(trialDaysRemaining(days(10), NOW)).toBe(10);
    expect(trialDaysRemaining(days(0.5), NOW)).toBe(1);
    expect(trialDaysRemaining(days(-3), NOW)).toBe(0);
  });
});

describe('paid subscription window', () => {
  it('lets a business in while the paid month is still running', () => {
    expect(
      evaluateAccess({ status: 'active', trialEndsAt: null, paidUntil: days(12) }, NOW),
    ).toBe('ok');
  });

  it('asks for payment once the paid month has run out', () => {
    expect(
      evaluateAccess({ status: 'active', trialEndsAt: null, paidUntil: days(-1) }, NOW),
    ).toBe('payment_due');
  });

  it('never locks out a paid business with no end date recorded', () => {
    // Every row created before monthly billing existed looks like this, as does
    // anything a super admin switches on by hand. Those keep working.
    expect(evaluateAccess({ status: 'active', trialEndsAt: null, paidUntil: null }, NOW)).toBe(
      'ok',
    );
    expect(evaluateAccess({ status: 'active', trialEndsAt: null }, NOW)).toBe('ok');
  });
});

describe('renewal dates', () => {
  it('adds the month to the existing expiry, so paying early loses nothing', () => {
    const end = new Date('2026-09-20T00:00:00Z');
    expect(nextPeriodEnd(end, NOW).toISOString().slice(0, 10)).toBe('2026-10-20');
  });

  it('counts from today when the previous month has already lapsed', () => {
    const lapsed = new Date('2026-07-01T00:00:00Z');
    expect(nextPeriodEnd(lapsed, NOW).toISOString().slice(0, 10)).toBe('2026-09-28');
  });

  it('clamps a 31st to the end of a shorter month instead of rolling over', () => {
    // Plain setMonth() turns 31 January into 3 March, which would silently
    // hand out two extra days every year.
    const jan31 = new Date('2027-01-31T00:00:00Z');
    expect(addOneMonth(jan31).toISOString().slice(0, 10)).toBe('2027-02-28');
  });
});

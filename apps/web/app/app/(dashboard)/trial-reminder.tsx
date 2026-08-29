'use client';

import { Button } from '@billwise/ui';
import { ArrowRight, Check, Clock, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

/**
 * The trial reminder.
 *
 * Shown on the dashboard while a shop is still on the free trial, so the day
 * the trial ends is never a surprise. It is a real dialog rather than another
 * banner because a banner in a page full of banners is wallpaper.
 *
 * Two things keep it from being obnoxious:
 *
 *  • It waits ~700ms before appearing. A modal that is already there when the
 *    page paints feels like an interruption to something you had not started;
 *    one that arrives a moment later reads as a notification.
 *  • Escape, the backdrop and the X all close it, and it never blocks anything
 *    behind it. Nobody is trapped.
 *
 * It appears each time the dashboard is opened, on purpose, because the last
 * few days of a trial are exactly when someone needs reminding. The urgency of
 * the wording follows the days left rather than shouting from day one.
 */
const APPEAR_DELAY_MS = 700;

export function TrialReminder({
  daysLeft,
  monthlyPrice,
  endsOn,
}: {
  daysLeft: number;
  monthlyPrice: string;
  endsOn: string;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setOpen(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const urgent = daysLeft <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-reminder-title"
        className="animate-fade-in relative w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-lg"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" />
        </button>

        <div className="brand-wash p-6 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
            <Clock className="size-3.5" />
            {daysLeft === 0
              ? 'Last day'
              : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
          </span>
          <h2 id="trial-reminder-title" className="mt-3 text-xl font-semibold">
            {urgent ? 'Your free trial is nearly over' : 'You are on the free trial'}
          </h2>
          <p className="mt-1.5 text-sm text-white/85">
            {daysLeft === 0
              ? 'Today is the last day. Pay for a month and nothing changes.'
              : `It runs until ${endsOn}. Pay for a month whenever you are ready.`}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-3xl font-semibold">₹{monthlyPrice}</span>
            <span className="text-sm text-muted-foreground">per month, everything included</span>
          </div>

          <ul className="space-y-2 text-sm">
            {[
              'Pay by UPI in one scan, no card needed',
              'One month at a time, nothing renews on its own',
              'Your data stays yours either way',
            ].map((line) => (
              <li key={line} className="flex gap-2 text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {line}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/app/billing" onClick={() => setOpen(false)}>
              <Button>
                Subscribe now <ArrowRight />
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

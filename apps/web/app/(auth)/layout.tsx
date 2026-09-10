import { FROM_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Logo, LogoMark, ThemeToggle } from '@billwise/ui';
import { Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

/**
 * Auth shell.
 *
 * A split screen rather than a lone card on an empty page. The left panel is not
 * decoration: someone who has just clicked "Start free" from an ad or a WhatsApp
 * forward arrives here mid-decision, and these lines are the last chance to
 * answer "what is this and what will it cost me". It is hidden below `lg`, where
 * a phone user needs the keyboard and the fields, not a pitch.
 */
const POINTS = [
  'Bill in seconds, GST or plain cash memo',
  'Stock goes down by itself with every bill',
  'Know exactly who owes you, and how much',
  'Your products online, with a QR for the counter',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,32rem)] xl:grid-cols-[1fr_36rem]">
      {/* Brand panel. Second in the DOM on purpose — a screen reader and a
          keyboard should reach the form first. */}
      <aside className="hidden lg:order-first lg:block">
        {/*
         * Sticky, one viewport tall.
         *
         * Without this the panel stretched to whatever the form column needed,
         * and `justify-between` then pushed the pitch down to the bottom of a
         * page nobody scrolls — the signup form is long, so the first screen was
         * a logo, a huge empty blue rectangle, and a heading half off the bottom.
         * The panel now frames exactly one viewport no matter how tall the form
         * beside it grows.
         */}
        <div className="brand-wash sticky top-0 flex h-dvh flex-col justify-between overflow-hidden p-10 text-white xl:p-14">
          {/* The same grid and glow as the landing hero. A flat field of one
              blue reads as an unfinished background; these give it depth
              without putting anything on screen to read. */}
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <div
            className="pointer-events-none absolute -top-32 -left-24 size-[34rem] rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-32 -bottom-40 size-[30rem] rounded-full bg-white/[0.07] blur-3xl"
            aria-hidden
          />

          {/* On the blue panel the mark's own tile would vanish into the
              background, so it is inverted: a translucent white tile with the
              slip drawn in blue. */}
          <Link
            href="/"
            aria-label="Billwise home"
            className="relative flex w-fit items-center gap-2.5"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur">
              <LogoMark className="size-6 [&>rect]:fill-white [&_path]:fill-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Billwise</span>
          </Link>

          <div className="relative max-w-md space-y-8">
            <h2 className="text-3xl font-semibold text-balance xl:text-[2.6rem] xl:leading-[1.15]">
              Billing, stock and khata for your shop.
            </h2>
            <ul className="space-y-3.5">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-white/90">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/25">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-[0.95rem] leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-5 text-sm text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4" />
              No card to start
            </span>
            <span aria-hidden className="hidden h-3 w-px bg-white/25 sm:block" />
            <span>
              {TRIAL_DAYS} days free, then from ₹{FROM_PRICE_INR} a month
            </span>
          </div>
        </div>
      </aside>

      {/* A hair off white, so the card the form sits in has something to sit
          on. On a plain white page a bordered card reads as a stray outline. */}
      <div className="flex min-h-dvh flex-col bg-muted/25">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Billwise home" className="lg:invisible">
            <Logo markClassName="size-7" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:px-8">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}

import { FROM_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { Logo, LogoMark, ThemeToggle } from '@billwise/ui';
import { Check } from 'lucide-react';
import Link from 'next/link';

/**
 * Auth shell.
 *
 * A split screen rather than a lone card on an empty page. The right-hand panel
 * is not decoration: someone who has just clicked "Start free" from an ad or a
 * WhatsApp forward arrives here mid-decision, and the three lines there are the
 * last chance to answer "what is this and what will it cost me". It is hidden
 * below `lg`, where a phone user needs the keyboard and the fields, not a pitch.
 */
const POINTS = [
  'Bill in seconds, GST or plain cash memo',
  'Stock goes down by itself with every bill',
  'Know exactly who owes you, and how much',
  'Your products online, with a QR for the counter',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,28rem)] xl:grid-cols-[1fr_32rem]">
      {/* Brand panel. Second in the DOM on purpose — a screen reader and a
          keyboard should reach the form first. */}
      <aside className="brand-wash relative hidden flex-col justify-between p-10 text-white lg:order-first lg:flex xl:p-14">
        {/* On the blue panel the mark's own tile would vanish into the
            background, so it is inverted: a translucent white tile with the
            slip drawn in blue. */}
        <Link href="/" aria-label="Billwise home" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <LogoMark className="size-6 [&>rect]:fill-white [&_path]:fill-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Billwise</span>
        </Link>

        <div className="max-w-md space-y-8">
          <h2 className="text-3xl font-semibold text-balance xl:text-4xl">
            Billing, stock and khata for your shop.
          </h2>
          <ul className="space-y-3.5">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="size-3" />
                </span>
                <span className="text-[0.95rem] leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/75">
          {TRIAL_DAYS} days free, then from ₹{FROM_PRICE_INR} a month. No card to start.
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Billwise home" className="lg:invisible">
            <Logo markClassName="size-7" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

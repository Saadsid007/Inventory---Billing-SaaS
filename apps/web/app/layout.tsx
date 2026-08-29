import { ThemeScript } from '@bahikhata/ui';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bahikhata — Billing, stock and khata in one place',
    template: '%s · Bahikhata',
  },
  description:
    'Create GST and non-GST bills, track stock, keep tabs on who owes you, and put your products online — all in one app built for Indian small businesses.',
};

export const viewport: Viewport = {
  // Matches --background in each mode, so a phone's browser chrome blends into
  // the page instead of framing it in a colour from a different palette.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfcfe' },
    { media: '(prefers-color-scheme: dark)', color: '#101725' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme class is set on the client before
    // React hydrates, so the server and client markup differ by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking, before first paint — otherwise a dark-mode user gets a
            white flash on every navigation. */}
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

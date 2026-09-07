import { FROM_PRICE_INR, TRIAL_DAYS, appOrigin } from '@billwise/shared';
import { ThemeScript } from '@billwise/ui';
import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Root metadata.
 *
 * `metadataBase` matters more than it looks: without it, every Open Graph and
 * canonical URL Next generates is relative, and a relative og:image is ignored
 * by WhatsApp and every other preview scraper. It comes from the same env value
 * the catalog QR codes use, so a deploy cannot have one right and the other
 * wrong.
 */
const appUrl = appOrigin(process.env['NEXT_PUBLIC_APP_URL']);

const description = `Make GST and non-GST bills in seconds, track stock automatically, see who owes you money, and put your products online with a QR code. ${TRIAL_DAYS} days free, then from ₹${FROM_PRICE_INR} a month.`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Billwise: billing, stock and khata for Indian shops',
    template: '%s · Billwise',
  },
  description,
  applicationName: 'Billwise',
  keywords: [
    'billing software',
    'GST invoice software',
    'inventory software for shops',
    'kirana store billing',
    'khata app',
    'stock management India',
    'GST billing app',
  ],
  authors: [{ name: 'Billwise' }],
  openGraph: {
    type: 'website',
    siteName: 'Billwise',
    locale: 'en_IN',
    url: appUrl,
    title: 'Billwise: billing, stock and khata for Indian shops',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Billwise: billing, stock and khata for Indian shops',
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: '/' },
  formatDetection: { telephone: false },
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
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Blocking, before first paint. Otherwise a dark-mode user gets a
            white flash on every navigation. */}
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

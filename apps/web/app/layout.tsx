import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bahikhata — Billing, stock aur khata, ek jagah',
    template: '%s · Bahikhata',
  },
  description:
    'Bill banayein, stock track karein, udhaar ka hisaab rakhein, aur apna saman online dikhayein — sab ek app mein.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme class is set on the client before
    // React hydrates, so the server and client markup differ by design.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

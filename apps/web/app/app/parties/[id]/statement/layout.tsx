import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Khata Statement',
  robots: { index: false, follow: false },
};

export default function StatementPrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white text-black">{children}</div>;
}

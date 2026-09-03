import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Catalogue & Inventory Sheet',
  robots: { index: false, follow: false },
};

export default function ProductPdfLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-slate-100 text-black print:bg-white">{children}</div>;
}

import Link from 'next/link';
import { ThemeToggle } from '@bahikhata/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Bahikhata
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

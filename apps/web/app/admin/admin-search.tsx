'use client';

import { Input } from '@bahikhata/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export function AdminSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initial);

  React.useEffect(() => {
    if (q === initial) return;
    const t = setTimeout(() => {
      router.replace(q.trim() ? `/admin?q=${encodeURIComponent(q.trim())}` : '/admin');
    }, 300);
    return () => clearTimeout(t);
  }, [q, initial, router]);

  return (
    <Input
      className="w-64"
      placeholder="Search name, email or slug…"
      aria-label="Search businesses"
      value={q}
      onChange={(e) => setQ(e.target.value)}
    />
  );
}

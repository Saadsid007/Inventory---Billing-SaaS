'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'bahikhata-theme';

/**
 * Runs before first paint to apply the stored theme.
 *
 * This has to be an inline blocking script. React cannot help here: by the time
 * hydration runs the browser has already painted, and a dark-mode user would
 * see a white flash on every navigation. Rendered from the root layout, inside
 * <head>.
 */
export function ThemeScript() {
  const script = `
(function(){try{
  var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  var d=s==='dark'||((!s||s==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark',d);
  document.documentElement.style.colorScheme=d?'dark':'light';
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}

function apply(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

const OPTIONS: ReadonlyArray<{ value: Theme; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/**
 * Three-state theme switch. Cheap to add now, expensive to retrofit once every
 * screen has hardcoded colours (spec Phase 0b).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>('system');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  // Follow the OS while on 'system'.
  React.useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  return (
    <div
      className={cn('inline-flex items-center gap-0.5 rounded-md border p-0.5', className)}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-label={label}
          // Before mount we don't know the stored value; showing a pressed state
          // would be wrong half the time, so show none.
          aria-pressed={mounted ? theme === value : false}
          className={cn(
            'rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground',
            mounted && theme === value && 'bg-accent text-foreground',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

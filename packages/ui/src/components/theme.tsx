'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'billwise-theme';

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

function isDarkMode(theme: Theme): boolean {
  return (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

function useThemeState() {
  const [theme, setTheme] = React.useState<Theme>('system');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored) setTheme(stored);
  }, []);

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

  return { theme, mounted, choose };
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
  const { theme, mounted, choose } = useThemeState();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5 shadow-xs',
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-label={label}
          title={label}
          aria-pressed={mounted ? theme === value : false}
          className={cn(
            'rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground',
            mounted && theme === value && 'bg-card text-primary shadow-xs',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

/** Single icon that toggles light ↔ dark. For compact mobile toolbars. */
export function ThemeIconButton({ className }: { className?: string }) {
  const { theme, mounted, choose } = useThemeState();
  const dark = mounted && isDarkMode(theme);

  return (
    <button
      type="button"
      onClick={() => choose(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'grid size-9 place-items-center rounded-lg border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {mounted ? (
        dark ? <Sun className="size-4" /> : <Moon className="size-4" />
      ) : (
        <Moon className="size-4 opacity-50" />
      )}
    </button>
  );
}

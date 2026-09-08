'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * The line across the top of the window while a page is on its way.
 *
 * ## Why this is hand-rolled and not a library
 *
 * Every "nprogress for Next" package on npm is written against the Pages
 * Router's `routeChangeStart` events, which the App Router does not have. They
 * work by monkey-patching `history.pushState`, and the App Router calls that
 * *after* a navigation commits — so the bar appears when the page is already
 * there. This is forty lines and it is correct.
 *
 * ## How it knows
 *
 * Start: a click on a link that is going to navigate. Caught in the capture
 * phase on the document, so it fires before React and before Next's router,
 * and it does not care which component rendered the link.
 *
 * Finish: not when the URL changes. Every route in this app has a
 * `loading.tsx`, and the App Router commits the new URL the instant that
 * fallback paints — so "the path changed" means the skeleton is up, not that
 * the page is ready. Watching the URL alone made the bar finish before it had
 * even faded in, on every single navigation.
 *
 * What actually marks the end is the skeleton leaving. Every loading fallback
 * in this app carries `aria-busy="true"` — the shared skeletons in
 * `@billwise/ui` set it, and so does every hand-written one — so a
 * MutationObserver waiting for the last of them to disappear is watching the
 * real thing rather than a proxy for it.
 *

 * ## Why it never reaches 100 on its own
 *
 * Because it has no idea how long the server will take. It races to 30, then
 * crawls at a decaying rate towards 90 and stops. Progress bars that guess and
 * then sit at 100% while nothing happens are worse than no bar at all — this
 * one only touches 100 when the route has genuinely changed.
 *
 * ## The 140ms delay
 *
 * Most navigations in this app are prefetched and land in under a frame. A bar
 * that flashes on every one of them is visual noise that makes the app feel
 * *busier*, not faster. Nothing is painted unless the navigation is still going
 * after 140ms, which is roughly where a person starts to notice a wait.
 */

/** Fired by `startNavProgress()`, for navigations that are not a link click. */
const START_EVENT = 'billwise:nav-start';

/**
 * Show the bar for a navigation this component cannot see — a `router.push()`
 * after saving a form, for instance.
 *
 * Safe to call when the bar is already running, and safe to call for something
 * that turns out not to navigate: the bar gives up on its own timeout.
 */
export function startNavProgress() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_EVENT));
}

/** How long to keep crawling before assuming something went wrong and hiding. */
const GIVE_UP_MS = 20_000;
const APPEAR_AFTER_MS = 140;

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  // Timers live in a ref rather than state: changing them must never re-render,
  // and every one of them has to be cancellable from the cleanup path.
  const timers = React.useRef<{ tick?: number; appear?: number; hide?: number; giveUp?: number }>(
    {},
  );

  const clearTimers = React.useCallback(() => {
    const t = timers.current;
    if (t.tick) window.clearInterval(t.tick);
    if (t.appear) window.clearTimeout(t.appear);
    if (t.hide) window.clearTimeout(t.hide);
    if (t.giveUp) window.clearTimeout(t.giveUp);
    timers.current = {};
  }, []);

  const start = React.useCallback(() => {
    clearTimers();
    setProgress(0);

    timers.current.appear = window.setTimeout(() => setVisible(true), APPEAR_AFTER_MS);

    timers.current.tick = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Fast to 30, then progressively slower. The shape matters: a bar that
        // moves at a constant rate and stops looks frozen; one that decelerates
        // looks like it is working on something hard.
        const step = p < 30 ? 9 : p < 60 ? 4 : p < 80 ? 1.6 : 0.5;
        return Math.min(90, p + step);
      });
    }, 180);

    timers.current.giveUp = window.setTimeout(() => {
      clearTimers();
      setVisible(false);
      setProgress(0);
    }, GIVE_UP_MS);
  }, [clearTimers]);

  const finish = React.useCallback(() => {
    clearTimers();
    setProgress(100);
    // Long enough for the fill to animate to the right edge, then fade.
    timers.current.hide = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  }, [clearTimers]);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      // A new tab, a download, a right-click: the current page is not going
      // anywhere, so neither is the bar.
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, different hash — the browser scrolls, nothing loads.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      start();
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener(START_EVENT, start);
    // Back and forward are navigations too, and they are the ones most likely
    // to be slow because nothing prefetched them.
    window.addEventListener('popstate', start);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener('popstate', start);
    };
  }, [start]);

  /*
   * The route changed. Whether it has *arrived* is a different question.
   *
   * If a loading fallback is on screen, the answer is no — wait for it to go.
   * If there is none, the page rendered straight from cache and we are done.
   *
   * This also runs on first mount, when nothing was in flight. `finish()` on a
   * hidden bar just clears timers, so that costs nothing.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the point is to
  // react to the route changing, not to the identity of `finish`.
  React.useEffect(() => {
    const stillLoading = () => document.querySelector('[aria-busy="true"]') !== null;

    if (!stillLoading()) {
      finish();
      return;
    }

    const observer = new MutationObserver(() => {
      if (stillLoading()) return;
      observer.disconnect();
      finish();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    });

    return () => observer.disconnect();
  }, [pathname, searchParams]);

  React.useEffect(() => clearTimers, [clearTimers]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] print:hidden"
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        // `relative` is load-bearing: the glow below is absolutely positioned
        // against it. Without it the glow anchors to the fixed wrapper instead
        // and sits at the right edge of the window, glowing at nothing while
        // the bar is somewhere in the middle.
        className="relative h-full origin-left bg-gradient-to-r from-primary via-primary to-info transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      >
        {/* The bright head of the bar. This is the part that makes it read as
            motion rather than as a coloured rule sitting under the toolbar. */}
        <span
          aria-hidden
          className="animate-progress-glow absolute top-0 right-0 h-full w-24 bg-gradient-to-r from-transparent to-info shadow-[0_0_10px_2px_var(--color-info)]"
        />
      </div>
    </div>
  );
}

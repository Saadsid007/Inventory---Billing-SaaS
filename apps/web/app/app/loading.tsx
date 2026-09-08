import { ListPageSkeleton } from '@billwise/ui';

/**
 * The safety net for anything under `/app` without its own fallback.
 *
 * Every screen in both apps defines one, so this should never actually paint.
 * It exists because the alternative fallback is the root `loading.tsx`, and a
 * marketing hero with its own header bar appearing inside the app shell would
 * be a genuinely confusing thing to ship by forgetting a file.
 *
 * A list is the right shape to guess with: most screens in here are one.
 */
export default function Loading() {
  return <ListPageSkeleton />;
}

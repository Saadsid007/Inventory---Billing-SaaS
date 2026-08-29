import { ListPageSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <ListPageSkeleton cols={6} />
    </div>
  );
}

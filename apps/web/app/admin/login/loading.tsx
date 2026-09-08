import { FormSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16" aria-busy="true" aria-label="Loading">
      <FormSkeleton fields={2} />
    </div>
  );
}

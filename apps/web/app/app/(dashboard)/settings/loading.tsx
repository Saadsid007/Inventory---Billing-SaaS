import { FormSkeleton, PageHeaderSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <FormSkeleton fields={5} />
      <FormSkeleton fields={3} />
    </div>
  );
}

import { FormSkeleton, PageBody, PageHeaderSkeleton } from '@billwise/ui';

export default function Loading() {
  return (
    <PageBody className="mx-auto max-w-3xl p-6 sm:p-8" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      {/* One card per business type. Two today. */}
      <FormSkeleton fields={5} />
      <FormSkeleton fields={5} />
    </PageBody>
  );
}

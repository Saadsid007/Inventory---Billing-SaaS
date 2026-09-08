import { FormPageSkeleton, PageBody } from '@billwise/ui';

export default function Loading() {
  return (
    <PageBody className="mx-auto max-w-2xl">
      <FormPageSkeleton fields={7} />
    </PageBody>
  );
}

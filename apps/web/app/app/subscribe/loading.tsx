import { FormPageSkeleton, PageBody } from '@billwise/ui';

export default function Loading() {
  return (
    <PageBody className="mx-auto max-w-xl">
      <FormPageSkeleton fields={3} />
    </PageBody>
  );
}

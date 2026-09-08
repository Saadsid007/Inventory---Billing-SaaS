import { DetailPageSkeleton, PageBody } from '@billwise/ui';

export default function Loading() {
  return (
    <PageBody className="mx-auto max-w-4xl">
      <DetailPageSkeleton />
    </PageBody>
  );
}

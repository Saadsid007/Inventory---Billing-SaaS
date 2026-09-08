import { ListPageSkeleton } from '@billwise/ui';

// Seven columns: work, customer, reference, dates, balance, status, actions.
export default function Loading() {
  return <ListPageSkeleton cols={7} />;
}

import { FormPageSkeleton } from '@billwise/ui';

// The longest form in the product: party, document kind, lines, tax, payment.
export default function Loading() {
  return <FormPageSkeleton fields={9} />;
}

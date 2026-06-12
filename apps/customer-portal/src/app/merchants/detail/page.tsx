import { Suspense } from 'react';
import { MerchantDetailClient } from './client';

// Query-param route (/merchants/detail/?id=...) — dynamic path segments
// cannot be statically exported for unknown merchant IDs.
export default function MerchantDetailPage() {
  return (
    <Suspense>
      <MerchantDetailClient />
    </Suspense>
  );
}

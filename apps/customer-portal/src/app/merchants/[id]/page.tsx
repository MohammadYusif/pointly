import { MerchantDetailClient } from './client';

export async function generateStaticParams() {
  // Placeholder for static export — actual merchant pages are rendered client-side.
  // Direct URL access requires CloudFront 404→200 fallback routing.
  return [{ id: '_' }];
}

export default function MerchantDetailPage() {
  return <MerchantDetailClient />;
}

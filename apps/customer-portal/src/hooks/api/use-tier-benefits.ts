import { getTierBenefits } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useTierBenefits() {
  return useQuery({
    queryKey: ['customer', 'tier-benefits'],
    queryFn: getTierBenefits,
  });
}

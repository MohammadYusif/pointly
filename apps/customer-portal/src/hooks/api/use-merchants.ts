import { enrollMerchant, getMerchantDetail, getMyMerchants, getPublicMerchants } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useMyMerchants() {
  return useQuery({
    queryKey: ['merchants', 'mine'],
    queryFn: getMyMerchants,
  });
}

export function usePublicMerchants() {
  return useQuery({
    queryKey: ['merchants', 'public'],
    queryFn: getPublicMerchants,
  });
}

export function useMerchantDetail(id: string) {
  return useQuery({
    queryKey: ['merchants', 'public', id],
    queryFn: () => getMerchantDetail(id),
    enabled: !!id,
  });
}

export function useEnrollMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (merchantId: string) => enrollMerchant(merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
    },
  });
}

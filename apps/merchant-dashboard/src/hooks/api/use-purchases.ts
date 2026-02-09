import { purchaseApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRecordPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseApi.record,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
    },
  });
}

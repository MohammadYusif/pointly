import { updateConsent } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ merchantId, action }: { merchantId: string; action: 'grant' | 'revoke' }) =>
      updateConsent(merchantId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
    },
  });
}

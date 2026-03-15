import { giftPoints } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useGiftPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: giftPoints,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
    },
  });
}

import { checkInChallenge, getMyChallenges } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useMyChallenges() {
  return useQuery({
    queryKey: ['customer', 'challenges'],
    queryFn: getMyChallenges,
  });
}

export function useChallengeCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkInChallenge,
    onSuccess: () => {
      // Refresh challenge progress and customer balance (bonus points change balance)
      queryClient.invalidateQueries({ queryKey: ['customer', 'challenges'] });
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
    },
  });
}

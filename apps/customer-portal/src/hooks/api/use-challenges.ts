import { getMyChallenges } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useMyChallenges() {
  return useQuery({
    queryKey: ['customer', 'challenges'],
    queryFn: getMyChallenges,
  });
}

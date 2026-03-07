import { getMyPerks } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useMyPerks() {
  return useQuery({
    queryKey: ['perks', 'mine'],
    queryFn: getMyPerks,
  });
}

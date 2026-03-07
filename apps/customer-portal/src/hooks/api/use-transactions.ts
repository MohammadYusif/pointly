import { getCustomerTransactions } from '@/lib/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: () => getCustomerTransactions({ limit }),
  });
}

export function useInfiniteTransactions(limit = 20) {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite', limit],
    queryFn: ({ pageParam }) =>
      getCustomerTransactions({
        limit,
        ...(pageParam ? { nextToken: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });
}

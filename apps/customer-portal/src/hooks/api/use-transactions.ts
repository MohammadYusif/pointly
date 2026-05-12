import { getCustomerTransactions } from '@/lib/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: () => getCustomerTransactions({ limit, sortOrder: 'DESC' }),
  });
}

export function useInfiniteTransactions(limit = 20, sortOrder: 'ASC' | 'DESC' = 'DESC') {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite', limit, sortOrder],
    queryFn: ({ pageParam }) =>
      getCustomerTransactions({
        limit,
        sortOrder,
        ...(pageParam ? { nextToken: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

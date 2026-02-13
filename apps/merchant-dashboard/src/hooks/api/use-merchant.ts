import { merchantApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export function useMerchant() {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => merchantApi.getById(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
  });
}

export function useMerchantStats() {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'stats'],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => merchantApi.getStats(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
  });
}

export function useMerchantCustomers(params?: { limit?: number; nextToken?: string }) {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'customers', params],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => merchantApi.getCustomers(merchant!.merchantId, params),
    enabled: !!merchant?.merchantId,
  });
}

export function useMerchantTransactions(params?: {
  limit?: number;
  nextToken?: string;
  locationId?: string;
}) {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'transactions', params],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => merchantApi.getTransactions(merchant!.merchantId, params),
    enabled: !!merchant?.merchantId,
  });
}

export function useInfiniteCustomers(limit = 20) {
  const { merchant } = useAuth();
  return useInfiniteQuery({
    queryKey: ['merchant', merchant?.merchantId, 'customers', 'infinite', limit],
    queryFn: ({ pageParam }) =>
      merchantApi.getCustomers(merchant?.merchantId as string, {
        limit,
        ...(pageParam ? { nextToken: pageParam } : {}),
      }),
    enabled: !!merchant?.merchantId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });
}

export function useInfiniteTransactions(limit = 50, locationId?: string) {
  const { merchant } = useAuth();
  return useInfiniteQuery({
    queryKey: ['merchant', merchant?.merchantId, 'transactions', 'infinite', limit, locationId],
    queryFn: ({ pageParam }) =>
      merchantApi.getTransactions(merchant?.merchantId as string, {
        limit,
        locationId,
        ...(pageParam ? { nextToken: pageParam } : {}),
      }),
    enabled: !!merchant?.merchantId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });
}

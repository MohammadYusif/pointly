import { merchantApi, perkApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CustomerResponse } from '@pointly/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function usePerks() {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'perks'],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => perkApi.getPerks(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
  });
}

export function useCreatePerk() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      title: string;
      description: string;
      requiredTier: string;
      capacityLimit?: number;
    }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId is required for perk creation
      perkApi.createPerk(merchant!.merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'perks'] });
    },
  });
}

export function useDeletePerk() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (perkId: string) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId is required for perk deletion
      perkApi.deletePerk(merchant!.merchantId, perkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'perks'] });
    },
  });
}

export function useInfiniteTransactions(
  limit = 50,
  locationId?: string,
  sortOrder: 'ASC' | 'DESC' = 'DESC',
) {
  const { merchant } = useAuth();
  return useInfiniteQuery({
    queryKey: [
      'merchant',
      merchant?.merchantId,
      'transactions',
      'infinite',
      limit,
      locationId,
      sortOrder,
    ],
    queryFn: ({ pageParam }) =>
      merchantApi.getTransactions(merchant?.merchantId as string, {
        limit,
        locationId,
        sortOrder,
        ...(pageParam ? { nextToken: pageParam } : {}),
      }),
    enabled: !!merchant?.merchantId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });
}

export function usePendingConsents() {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'pending-consents'],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => merchantApi.getPendingConsents(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
    select: (data) => (data.customers || []) as CustomerResponse[],
  });
}

export function useApproveConsent() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, action }: { customerId: string; action: 'approve' | 'deny' }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId is required
      merchantApi.approveConsent(merchant!.merchantId, customerId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['merchant', merchant?.merchantId, 'pending-consents'],
      });
      queryClient.invalidateQueries({
        queryKey: ['merchant', merchant?.merchantId, 'customers'],
      });
    },
  });
}

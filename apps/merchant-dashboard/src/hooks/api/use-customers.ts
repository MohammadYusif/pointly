import { customerApi, merchantApi } from '@/lib/api';
import type { MerchantGiftPointsRequest } from '@/types/api';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useCustomerByPhone(phone: string) {
  return useQuery({
    queryKey: ['customer', 'phone', phone],
    queryFn: () => customerApi.getByPhone(phone),
    enabled: !!phone && phone.length >= 9,
  });
}

export function useCustomerTransactions(
  customerId: string,
  params?: { limit?: number; nextToken?: string },
) {
  return useQuery({
    queryKey: ['customer', customerId, 'transactions', params],
    queryFn: () => customerApi.getTransactions(customerId, params),
    enabled: !!customerId,
  });
}

export function useInfiniteCustomerTransactions(
  customerId: string,
  limit = 20,
  sortOrder: 'ASC' | 'DESC' = 'DESC',
) {
  return useInfiniteQuery({
    queryKey: ['customer', customerId, 'transactions', 'infinite', limit, sortOrder],
    queryFn: ({ pageParam }) =>
      customerApi.getTransactions(customerId, {
        limit,
        sortOrder,
        ...(pageParam ? { nextToken: pageParam } : {}),
      }),
    enabled: !!customerId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });
}

export function useCustomerById(customerId: string) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.getById(customerId),
    enabled: !!customerId,
  });
}

export function useRegisterCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ merchantId, phone }: { merchantId: string; phone: string }) =>
      merchantApi.registerCustomer(merchantId, phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

export function useMerchantGiftPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: {
      merchantId: string;
      data: MerchantGiftPointsRequest;
    }) => merchantApi.giftPoints(merchantId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.data.customerId] });
    },
  });
}

export function useCustomerByPhoneLookup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (phone: string) => customerApi.getByPhone(phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

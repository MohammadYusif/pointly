import { merchantApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';

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

export function useMerchantTransactions(params?: { limit?: number; nextToken?: string }) {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'transactions', params],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => merchantApi.getTransactions(merchant!.merchantId, params),
    enabled: !!merchant?.merchantId,
  });
}

import { customerApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

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

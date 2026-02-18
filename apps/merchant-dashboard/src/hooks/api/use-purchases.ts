import { merchantUpdateApi, purchaseApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRecordPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseApi.record,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseApi.redeem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: {
      merchantId: string;
      data: { businessName?: string; contactName?: string; phone?: string };
    }) => merchantUpdateApi.update(merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
    },
  });
}

export function useAddLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      merchantId,
      data,
    }: { merchantId: string; data: { name: string; address: string; city: string } }) =>
      merchantUpdateApi.addLocation(merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
    },
  });
}

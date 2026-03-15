import { campaignApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useCampaigns() {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'campaigns'],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => campaignApi.list(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
  });
}

export function useCreateCampaign() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      multiplier: number;
    }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      campaignApi.create(merchant!.merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'campaigns'] });
    },
  });
}

export function useDeactivateCampaign() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      campaignApi.deactivate(merchant!.merchantId, campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'campaigns'] });
    },
  });
}

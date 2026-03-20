import { campaignApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CampaignType, TierBreakdownResponse } from '@/types/api';
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
      type: CampaignType;
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      multiplier?: number;
      message?: string;
      targetTiers?: string[];
      maxUsesPerCustomer?: number;
      minPurchaseAmount?: number;
      maxPointsPerTransaction?: number;
      platformFilter?: string;
    }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      campaignApi.create(merchant!.merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'perks'] });
    },
  });
}

export function useTierBreakdown() {
  const { merchant } = useAuth();
  return useQuery<TierBreakdownResponse>({
    queryKey: ['merchant', merchant?.merchantId, 'tier-breakdown'],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => campaignApi.getTierBreakdown(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
  });
}

export function useUpdateCampaign() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        multiplier?: number;
        message?: string;
        targetTiers?: string[];
        maxUsesPerCustomer?: number;
        minPurchaseAmount?: number;
        maxPointsPerTransaction?: number;
      };
    }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      campaignApi.update(merchant!.merchantId, campaignId, data),
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
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'perks'] });
    },
  });
}

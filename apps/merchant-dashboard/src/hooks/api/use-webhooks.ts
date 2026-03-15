import { webhookApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useWebhooks() {
  const { merchant } = useAuth();
  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'webhooks'],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => webhookApi.list(merchant!.merchantId),
    enabled: !!merchant?.merchantId,
  });
}

export function useCreateWebhook() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; secretKey: string; events: string[] }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      webhookApi.create(merchant!.merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'webhooks'] });
    },
  });
}

export function useDeleteWebhook() {
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      webhookApi.delete(merchant!.merchantId, webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchant?.merchantId, 'webhooks'] });
    },
  });
}

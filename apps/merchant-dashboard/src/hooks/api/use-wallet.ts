import { merchantUpdateApi, pushApi } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function usePushStats(merchantId: string | undefined) {
  return useQuery({
    queryKey: ['push-stats', merchantId],
    // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
    queryFn: () => pushApi.getStats(merchantId!),
    enabled: !!merchantId,
  });
}

export function useUpdateWalletConfig(merchantId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: {
      primaryColor: string;
      backgroundColor: string;
      logoUrl?: string;
    }) =>
      // biome-ignore lint/style/noNonNullAssertion: merchantId required
      merchantUpdateApi.update(merchantId!, { walletConfig: config }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant', merchantId] }),
  });
}

export function useLogoUpload() {
  return useMutation({
    mutationFn: async ({ merchantId, file }: { merchantId: string; file: File }) => {
      const { url, publicUrl } = await pushApi.getLogoUploadUrl(merchantId, file.name, file.type);
      await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      return publicUrl;
    },
  });
}

import { signupApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useSignupStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ['signup-status', paymentId],
    queryFn: () => signupApi.getStatus(paymentId as string),
    enabled: !!paymentId,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2000 : false),
  });
}

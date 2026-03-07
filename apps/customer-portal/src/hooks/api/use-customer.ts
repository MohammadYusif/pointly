import { completeProfile, getCustomer, updateCustomer } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useCustomer() {
  return useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => getCustomer('me'),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string }) => updateCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
    },
  });
}

export function useCompleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; dateOfBirth?: string }) => completeProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
    },
  });
}

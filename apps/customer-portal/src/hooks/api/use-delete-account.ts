import { deleteAccount } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => deleteAccount(),
  });
}

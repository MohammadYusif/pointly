import { generateQRCode } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export function useGenerateQR() {
  return useMutation({
    mutationFn: generateQRCode,
  });
}

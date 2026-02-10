import { merchantApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';

interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  locationId?: string;
}

export function useMerchantAnalytics(params?: AnalyticsParams) {
  const { merchant } = useAuth();
  const { locationId, ...queryParams } = params || {};

  return useQuery({
    queryKey: ['merchant', merchant?.merchantId, 'analytics', params],
    queryFn: () => {
      if (locationId) {
        return merchantApi.getLocationAnalytics(merchant!.merchantId, locationId, queryParams);
      }
      return merchantApi.getAnalytics(merchant!.merchantId, queryParams);
    },
    enabled: !!merchant?.merchantId,
  });
}

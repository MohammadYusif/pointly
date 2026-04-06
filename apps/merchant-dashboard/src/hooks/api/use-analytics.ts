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
    queryKey: [
      'merchant',
      merchant?.merchantId,
      'analytics',
      params?.startDate,
      params?.endDate,
      params?.groupBy,
      params?.locationId,
    ],
    queryFn: () => {
      // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures merchantId exists
      const merchantId = merchant!.merchantId;
      if (locationId) {
        return merchantApi.getLocationAnalytics(merchantId, locationId, queryParams);
      }
      return merchantApi.getAnalytics(merchantId, queryParams);
    },
    enabled: !!merchant?.merchantId,
  });
}

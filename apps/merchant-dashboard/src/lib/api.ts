import type {
  AnalyticsData,
  CampaignResponse,
  CampaignType,
  CustomerInsights,
  CustomerResponse,
  MerchantGiftPointsRequest,
  MerchantGiftPointsResponse,
  MerchantPerk,
  MerchantResponse,
  MerchantScopedCustomerResponse,
  MerchantStatsResponse,
  PaginatedResponse,
  RecordPurchaseResponse,
  RedeemPointsResponse,
  TierBreakdownResponse,
  TransactionResponse,
  WebhookConfigResponse,
} from '@/types/api';
import { createFetchApi } from '@pointly/http-client';
import type { PlatformCounts } from '@pointly/shared';
import { normalizePhone } from '@pointly/shared';
import { getAccessToken, signOut } from './auth';

const fetchApi = createFetchApi({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  getToken: () => getAccessToken(),
  onUnauthorized: () => signOut(),
});

// Merchant API
export const merchantApi = {
  getById: (id: string) => fetchApi<MerchantResponse>(`/v1/merchants/${id}`),

  getCustomers: (merchantId: string, params?: { limit?: number; nextToken?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.nextToken) query.set('nextToken', params.nextToken);
    return fetchApi<PaginatedResponse<CustomerResponse>>(
      `/v1/merchants/${merchantId}/customers?${query}`,
    );
  },

  getTransactions: (
    merchantId: string,
    params?: {
      limit?: number;
      nextToken?: string;
      locationId?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.nextToken) query.set('nextToken', params.nextToken);
    if (params?.locationId) query.set('locationId', params.locationId);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    return fetchApi<PaginatedResponse<TransactionResponse>>(
      `/v1/merchants/${merchantId}/transactions?${query}`,
    );
  },

  getStats: (merchantId: string) =>
    fetchApi<MerchantStatsResponse>(`/v1/merchants/${merchantId}/stats`),

  getAnalytics: (
    merchantId: string,
    params?: { startDate?: string; endDate?: string; groupBy?: string },
  ) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.groupBy) query.set('groupBy', params.groupBy);
    return fetchApi<AnalyticsData>(`/v1/merchants/${merchantId}/analytics?${query}`);
  },

  getLocationAnalytics: (
    merchantId: string,
    locationId: string,
    params?: { startDate?: string; endDate?: string; groupBy?: string },
  ) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.groupBy) query.set('groupBy', params.groupBy);
    return fetchApi<AnalyticsData>(
      `/v1/merchants/${merchantId}/analytics/locations/${locationId}?${query}`,
    );
  },

  registerCustomer: (merchantId: string, phone: string, name?: string) =>
    fetchApi<MerchantScopedCustomerResponse>(`/v1/merchants/${merchantId}/register-customer`, {
      method: 'POST',
      body: JSON.stringify({ phone, ...(name && { name }) }),
    }),

  giftPoints: (merchantId: string, data: MerchantGiftPointsRequest) =>
    fetchApi<MerchantGiftPointsResponse>(`/v1/merchants/${merchantId}/gift-points`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Customer API
export const customerApi = {
  getById: (id: string) => fetchApi<MerchantScopedCustomerResponse>(`/v1/customers/${id}`),

  getByPhone: (phone: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized) throw new Error('Invalid Saudi phone number format');
    return fetchApi<MerchantScopedCustomerResponse>(`/v1/customers/phone/${normalized}`);
  },

  create: (phone: string, name?: string) =>
    fetchApi<CustomerResponse>('/v1/customers', {
      method: 'POST',
      body: JSON.stringify({ phone, ...(name && { name }) }),
    }),

  getTransactions: (
    customerId: string,
    params?: { limit?: number; nextToken?: string; sortOrder?: 'ASC' | 'DESC' },
  ) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.nextToken) query.set('nextToken', params.nextToken);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    return fetchApi<PaginatedResponse<TransactionResponse>>(
      `/v1/customers/${customerId}/transactions?${query}`,
    );
  },

  getStats: (customerId: string) =>
    fetchApi<MerchantStatsResponse>(`/v1/customers/${customerId}/stats`),
};

// Purchase API
export const purchaseApi = {
  record: (data: {
    merchantId: string;
    customerId: string;
    amount: number;
    idempotencyKey: string;
    locationId?: string;
    metadata?: Record<string, unknown>;
  }) =>
    fetchApi<RecordPurchaseResponse>('/v1/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getById: (id: string) => fetchApi<TransactionResponse>(`/v1/purchases/${id}`),

  redeem: (data: {
    merchantId: string;
    customerId: string;
    pointsToRedeem: number;
    idempotencyKey: string;
    locationId?: string;
    metadata?: Record<string, unknown>;
  }) =>
    fetchApi<RedeemPointsResponse>('/v1/purchases/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Perk API (read-only — perks are now auto-managed by campaigns)
export const perkApi = {
  getPerks: (merchantId: string) => fetchApi<MerchantPerk[]>(`/v1/merchants/${merchantId}/perks`),

  getInsights: (merchantId: string) =>
    fetchApi<CustomerInsights>(`/v1/merchants/${merchantId}/customer-insights`),
};

// Campaign API
export const campaignApi = {
  list: (merchantId: string) =>
    fetchApi<CampaignResponse[]>(`/v1/merchants/${merchantId}/campaigns`),

  create: (
    merchantId: string,
    data: {
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
      winBackDays?: number;
      welcomeDays?: number;
      lastVisitDays?: number;
    },
  ) =>
    fetchApi<CampaignResponse>(`/v1/merchants/${merchantId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    merchantId: string,
    campaignId: string,
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
      winBackDays?: number;
      welcomeDays?: number;
      lastVisitDays?: number;
    },
  ) =>
    fetchApi<CampaignResponse>(`/v1/merchants/${merchantId}/campaigns/${campaignId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deactivate: (merchantId: string, campaignId: string) =>
    fetchApi<void>(`/v1/merchants/${merchantId}/campaigns/${campaignId}`, {
      method: 'DELETE',
    }),

  getTierBreakdown: (merchantId: string) =>
    fetchApi<TierBreakdownResponse>(`/v1/merchants/${merchantId}/customers/tier-breakdown`),
};

// Webhook API
export const webhookApi = {
  list: (merchantId: string) =>
    fetchApi<WebhookConfigResponse[]>(`/v1/merchants/${merchantId}/webhooks`),

  create: (
    merchantId: string,
    data: {
      url: string;
      secretKey: string;
      events: string[];
    },
  ) =>
    fetchApi<WebhookConfigResponse>(`/v1/merchants/${merchantId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (merchantId: string, webhookId: string) =>
    fetchApi<void>(`/v1/merchants/${merchantId}/webhooks/${webhookId}`, {
      method: 'DELETE',
    }),
};

// Merchant update API
export const merchantUpdateApi = {
  update: (
    merchantId: string,
    data: {
      businessName?: string;
      contactName?: string;
      phone?: string;
      walletConfig?: { primaryColor: string; backgroundColor: string; logoUrl?: string };
    },
  ) =>
    fetchApi<MerchantResponse>(`/v1/merchants/${merchantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  addLocation: (merchantId: string, data: { name: string; address: string; city: string }) =>
    fetchApi<{ locationId: string; name: string; address: string; city: string }>(
      `/v1/merchants/${merchantId}/locations`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),
};

// Push notification API
export const pushApi = {
  getStats: (merchantId: string) =>
    fetchApi<PlatformCounts>(`/v1/merchants/${merchantId}/push-stats`),

  getLogoUploadUrl: (merchantId: string, filename: string, contentType: string) =>
    fetchApi<{ url: string; publicUrl: string }>(`/v1/merchants/${merchantId}/logo-upload`, {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),
};

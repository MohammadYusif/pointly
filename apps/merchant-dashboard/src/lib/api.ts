import type {
  AnalyticsData,
  CampaignResponse,
  CustomerResponse,
  MerchantPerk,
  MerchantResponse,
  MerchantScopedCustomerResponse,
  MerchantStatsResponse,
  PaginatedResponse,
  RecordPurchaseResponse,
  RedeemPointsResponse,
  TransactionResponse,
  WebhookConfigResponse,
} from '@/types/api';
import { normalizePhone } from '@pointly/shared';
import { getAccessToken, signOut } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = await getAccessToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    signOut();
    throw new Error('Session expired');
  }

  const result: ApiResponse<T> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'An error occurred');
  }

  return result.data as T;
}

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
};

// Re-export so existing imports from '@/lib/api' continue to work
export { normalizePhone };

// Customer API
export const customerApi = {
  getById: (id: string) => fetchApi<MerchantScopedCustomerResponse>(`/v1/customers/${id}`),

  getByPhone: (phone: string) =>
    fetchApi<MerchantScopedCustomerResponse>(`/v1/customers/phone/${normalizePhone(phone)}`),

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

// Perk API
export const perkApi = {
  getPerks: (merchantId: string) => fetchApi<MerchantPerk[]>(`/v1/merchants/${merchantId}/perks`),

  createPerk: (
    merchantId: string,
    data: {
      type: string;
      title: string;
      description: string;
      requiredTier: string;
      capacityLimit?: number;
    },
  ) =>
    fetchApi<MerchantPerk>(`/v1/merchants/${merchantId}/perks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePerk: (
    merchantId: string,
    perkId: string,
    data: {
      title?: string;
      description?: string;
      requiredTier?: string;
      capacityLimit?: number;
      isActive?: boolean;
    },
  ) =>
    fetchApi<MerchantPerk>(`/v1/merchants/${merchantId}/perks/${perkId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deletePerk: (merchantId: string, perkId: string) =>
    fetchApi<void>(`/v1/merchants/${merchantId}/perks/${perkId}`, { method: 'DELETE' }),
};

// Campaign API
export const campaignApi = {
  list: (merchantId: string) =>
    fetchApi<CampaignResponse[]>(`/v1/merchants/${merchantId}/campaigns`),

  create: (
    merchantId: string,
    data: {
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      multiplier: number;
    },
  ) =>
    fetchApi<CampaignResponse>(`/v1/merchants/${merchantId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deactivate: (merchantId: string, campaignId: string) =>
    fetchApi<void>(`/v1/merchants/${merchantId}/campaigns/${campaignId}`, {
      method: 'DELETE',
    }),
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
    data: { businessName?: string; contactName?: string; phone?: string },
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

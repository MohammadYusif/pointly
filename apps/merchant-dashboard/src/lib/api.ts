import type {
  AnalyticsData,
  CustomerResponse,
  MerchantResponse,
  MerchantStatsResponse,
  PaginatedResponse,
  RecordPurchaseResponse,
  TransactionResponse,
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
    params?: { limit?: number; nextToken?: string; locationId?: string },
  ) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.nextToken) query.set('nextToken', params.nextToken);
    if (params?.locationId) query.set('locationId', params.locationId);
    return fetchApi<PaginatedResponse<TransactionResponse>>(
      `/v1/merchants/${merchantId}/transactions?${query}`,
    );
  },

  getStats: (merchantId: string) =>
    fetchApi<MerchantStatsResponse>(`/v1/merchants/${merchantId}/stats`),

  getPendingConsents: (merchantId: string) =>
    fetchApi<PaginatedResponse<CustomerResponse>>(`/v1/merchants/${merchantId}/pending-consents`),

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
};

// Re-export so existing imports from '@/lib/api' continue to work
export { normalizePhone };

// Customer API
export const customerApi = {
  getById: (id: string) => fetchApi<CustomerResponse>(`/v1/customers/${id}`),

  getByPhone: (phone: string) => fetchApi<CustomerResponse>(`/v1/customers/phone/${normalizePhone(phone)}`),

  create: (phone: string, name?: string) =>
    fetchApi<CustomerResponse>('/v1/customers', {
      method: 'POST',
      body: JSON.stringify({ phone, ...(name && { name }) }),
    }),

  enroll: (customerId: string, merchantId: string) =>
    fetchApi<{ customerId: string; merchantId: string }>(`/v1/customers/${customerId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ merchantId }),
    }),

  grantConsent: (customerId: string, merchantId: string) =>
    fetchApi<{ customerId: string; merchantId: string }>(`/v1/customers/${customerId}/consent`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, action: 'grant' }),
    }),

  getTransactions: (customerId: string, params?: { limit?: number; nextToken?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.nextToken) query.set('nextToken', params.nextToken);
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
    fetchApi<{
      transactionIds: string[];
      merchantPointsRedeemed: number;
      globalPointsRedeemed: number;
      totalPointsRedeemed: number;
      sarValue: number;
      newMerchantBalance: number;
      newGlobalBalance: number;
      currentTier: string;
      message: string;
    }>('/v1/purchases/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Merchant update API
export const merchantUpdateApi = {
  update: (merchantId: string, data: { businessName?: string; contactName?: string; phone?: string }) =>
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

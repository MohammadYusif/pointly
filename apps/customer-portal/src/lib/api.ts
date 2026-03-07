import type {
  CustomerMerchantView,
  CustomerPerkView,
  CustomerResponse,
  PublicMerchantDetail,
  PublicMerchantSummary,
  TransactionResponse,
} from '@pointly/shared';
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
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
  });

  if (response.status === 401) {
    signOut();
    if (typeof window !== 'undefined') window.location.replace('/?expired=1');
    throw new Error('Session expired');
  }

  const result: ApiResponse<T> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'An error occurred');
  return result.data as T;
}

export function getCustomer(_customerId: string) {
  return fetchApi<CustomerResponse>('/v1/me');
}

export function getCustomerTransactions(params?: { limit?: number; nextToken?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.nextToken) query.set('nextToken', params.nextToken);
  return fetchApi<{ transactions: TransactionResponse[]; count: number; nextToken?: string }>(
    `/v1/me/transactions?${query}`,
  );
}

export function updateCustomer(data: { name?: string }) {
  return fetchApi<CustomerResponse>('/v1/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function generateQRCode() {
  return fetchApi<{ qrPayload: string; expiresAt: number }>('/v1/me/qr-code', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getMyPerks() {
  return fetchApi<CustomerPerkView[]>('/v1/me/perks');
}

export function completeProfile(data: { name?: string; dateOfBirth?: string }) {
  return fetchApi<CustomerResponse>('/v1/me/setup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMyMerchants() {
  return fetchApi<CustomerMerchantView[]>('/v1/me/merchants');
}

export function getPublicMerchants() {
  return fetchApi<PublicMerchantSummary[]>('/v1/merchants');
}

export function enrollMerchant(merchantId: string) {
  return fetchApi<{ customerId: string; merchantId: string }>('/v1/me/enroll', {
    method: 'POST',
    body: JSON.stringify({ merchantId }),
  });
}

export function getMerchantDetail(merchantId: string) {
  return fetchApi<PublicMerchantDetail>(`/v1/merchants/${merchantId}`);
}

export function updateConsent(merchantId: string, action: 'grant' | 'revoke') {
  return fetchApi<{ customerId: string; merchantId: string; consentStatus: string }>(
    '/v1/me/consent',
    {
      method: 'POST',
      body: JSON.stringify({ merchantId, action }),
    },
  );
}

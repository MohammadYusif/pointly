import { createFetchApi } from '@pointly/http-client';
import type {
  ChallengeProgressResponse,
  CustomerMerchantView,
  CustomerPerkView,
  CustomerResponse,
  GiftPointsRequest,
  PublicMerchantDetail,
  PublicMerchantSummary,
  TransactionResponse,
} from '@pointly/shared';
import { getAccessToken, signOut } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const fetchApi = createFetchApi({
  baseUrl: API_BASE_URL,
  getToken: () => getAccessToken(),
  onUnauthorized: () => {
    signOut();
    if (typeof window !== 'undefined') window.location.replace('/?expired=1');
  },
});

export function getCustomer() {
  return fetchApi<CustomerResponse>('/v1/me');
}

export function getCustomerTransactions(params?: {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'ASC' | 'DESC';
  type?: string;
}) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.nextToken) query.set('nextToken', params.nextToken);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.type) query.set('type', params.type);
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
  return fetchApi<PublicMerchantDetail>(`/v1/merchants/info/${merchantId}`);
}

export function getMyChallenges() {
  return fetchApi<ChallengeProgressResponse>('/v1/me/challenges');
}

export function giftPoints(data: GiftPointsRequest) {
  return fetchApi<{ success: boolean }>('/v1/me/gift', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteAccount(): Promise<void> {
  return fetchApi('/v1/me', { method: 'DELETE' });
}

export const pushApi = {
  subscribe: (data: { endpoint: string; p256dh: string; auth: string; platform: string }) =>
    fetchApi('/v1/me/push-subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  unsubscribe: (endpoint: string) =>
    fetchApi('/v1/me/push-subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
};

export const walletApi = {
  getApplePassUrl: (merchantId: string) =>
    `${API_BASE_URL}/v1/me/wallet/apple-pass?merchantId=${merchantId}`,
  getGoogleWalletLink: (merchantId: string) =>
    fetchApi<{ url: string }>(`/v1/me/wallet/google-link?merchantId=${merchantId}`, {
      method: 'GET',
    }),
};

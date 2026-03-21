export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FetchApiConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
}

export function createFetchApi(config: FetchApiConfig) {
  return async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${config.baseUrl}${path}`;
    const token = await config.getToken();

    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const contentHeaders: Record<string, string> = init.body
      ? { 'Content-Type': 'application/json' }
      : {};

    const response = await fetch(url, {
      ...init,
      headers: {
        ...contentHeaders,
        ...authHeaders,
        ...init.headers,
      },
    });

    if (response.status === 401) {
      config.onUnauthorized?.();
      throw new Error('Session expired');
    }

    const result = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !result.success) {
      throw new Error(result.error ?? 'An error occurred');
    }

    return result.data as T;
  };
}

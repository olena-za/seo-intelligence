import { API_BASE_URL } from '@/lib/constants/env';

type ApiClientOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

type ApiEnvelope<T> = {
  data: T;
  meta?: {
    path: string;
    timestamp: string;
  };
};

export async function apiFetch<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const response = await apiRequest(path, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as T | ApiEnvelope<T>;

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload as T;
}

export async function apiRequest(path: string, options: ApiClientOptions = {}): Promise<Response> {
  const { retries = 2, timeoutMs = 8000, ...fetchOptions } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        cache: 'no-store',
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
          ...fetchOptions.headers,
        },
      });

      if (response.status >= 500 && attempt < retries) {
        await delay(150 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      await delay(150 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('API request failed');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window !== 'undefined') {
    return {};
  }

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('seo_token')?.value;

    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

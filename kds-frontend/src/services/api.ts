const API_URL_STORAGE_KEY = 'om_kds_api_url';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(API_URL_STORAGE_KEY);
    if (custom !== null && custom !== undefined && custom.trim() !== '') {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem(API_URL_STORAGE_KEY);
    } else {
      localStorage.setItem(API_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    }
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Detect Vercel SPA routing returning index.html for API requests
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new ApiError(
        response.status,
        `Backend endpoint "${endpoint}" returned an HTML document instead of JSON. When running on Vercel, set VITE_API_BASE_URL or configure a live Spring Boot backend URL in KDS Settings.`
      );
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorData: unknown = null;
      try {
        errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'message' in errorData) {
          errorMessage = String((errorData as { message: unknown }).message);
        }
      } catch {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {
          // fallback
        }
      }
      throw new ApiError(response.status, errorMessage, errorData);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Friendly diagnostics for mixed-content or connection refusals
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let msg = error instanceof Error ? error.message : 'Network request failed';

    if (isHttps && url.startsWith('http://localhost')) {
      msg = `Mixed Content Block: Browser running on HTTPS cannot call unencrypted "${url}". Set up an HTTPS backend domain or Ngrok tunnel, or enable Demo Mode.`;
    } else if (msg === 'Failed to fetch') {
      msg = `Unable to reach backend at "${url}". Ensure the Spring Boot backend is active and CORS is allowed.`;
    }

    throw new ApiError(0, msg);
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

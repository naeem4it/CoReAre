import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function isTokenExpired(jwtToken: string | null): boolean {
  if (!jwtToken || jwtToken.startsWith('mock-')) return false;
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

import { authStorage } from '@/shared/utils/auth-storage';

// Attach token & tenant interceptor if token exists in localStorage or environment
apiClient.interceptors.request.use(
  (config) => {
    let token: string | null = null;

    if (typeof window !== 'undefined') {
      token = authStorage.getToken();

      // If token is expired, purge stale auth from session/storage so request doesn't fail with 401
      if (token && isTokenExpired(token)) {
        authStorage.clearSession();
        token = null;
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=1';
        }
      }

      // Resolve tenant ID from user storage or env
      try {
        const userObj = authStorage.getUser();
        if (userObj) {
          const tenantId = userObj.tenant?.id || userObj.tenantId || userObj.tenant;
          if (tenantId && config.headers) {
            config.headers['x-tenant-id'] = tenantId;
          }
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // Fallback to token from environment variable if not present in storage
    if (!token || token.startsWith('mock-')) {
      const envToken = process.env.NEXT_PUBLIC_JWT_TOKEN || process.env.JWT_TOKEN;
      if (envToken) {
        token = envToken;
      }
    }

    if (token && !token.startsWith('mock-') && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for graceful error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      console.warn(`API Client 401 Unauthorized (${error.config?.url}) - redirecting to login`);
      authStorage.clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
      }
    } else if (typeof window !== 'undefined' && error.response?.status === 403) {
      console.warn(`API Client 403 Forbidden (${error.config?.url})`);
    }
    return Promise.reject(error);
  }
);

/**
 * Automatically fetches all records across paginated Strapi responses,
 * overcoming default maxLimit restrictions by requesting large pages and fetching remaining pages if pageCount > 1.
 */
export async function fetchAllPaginated<T = any>(url: string, config: any = {}): Promise<T[]> {
  const urlObj = new URL(url, 'http://dummy.local');
  const baseParams: Record<string, any> = { ...(config.params || {}) };

  // Copy search params from URL string into baseParams
  urlObj.searchParams.forEach((val, key) => {
    if (baseParams[key] === undefined) {
      baseParams[key] = val;
    }
  });

  const pathname = urlObj.pathname;
  if (!baseParams['pagination[pageSize]'] && !baseParams['pagination[limit]'] && !baseParams.pagination?.pageSize) {
    baseParams['pagination[pageSize]'] = 2000;
  }
  baseParams['pagination[page]'] = 1;

  const firstRes = await apiClient.get(pathname, { ...config, params: baseParams });
  const firstData = firstRes.data?.data || firstRes.data || [];
  let allItems: T[] = Array.isArray(firstData) ? [...firstData] : [];

  const pagination = firstRes.data?.meta?.pagination;
  if (pagination && pagination.pageCount > 1) {
    const pagePromises = [];
    for (let p = 2; p <= pagination.pageCount; p++) {
      const pageParams = { ...baseParams, 'pagination[page]': p };
      pagePromises.push(
        apiClient.get(pathname, { ...config, params: pageParams }).then((r) => r.data?.data || r.data || [])
      );
    }
    const pages = await Promise.all(pagePromises);
    for (const batch of pages) {
      if (Array.isArray(batch)) {
        allItems = allItems.concat(batch);
      }
    }
  }

  return allItems;
}



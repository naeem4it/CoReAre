import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../model/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token and Tenant Context
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Resolve tenant ID: environment variable first, then auth store session
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || useAuthStore.getState().user?.tenantId;
    if (tenantId && config.headers) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Refresh Logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401) {
      // Token is invalid or expired.
      // Since Strapi v4 doesn't support refresh tokens by default without a custom plugin,
      // we could log the user out here. However, to prevent abrupt logouts on unauthorized
      // endpoints, we will simply reject the promise and let the component handle it.
      // If global logout is required, uncomment the line below:
      // useAuthStore.getState().logout();
      return Promise.reject(error);
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


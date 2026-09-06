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

// Attach token & tenant interceptor if token exists in localStorage or environment
apiClient.interceptors.request.use(
  (config) => {
    let token: string | null = null;

    if (typeof window !== 'undefined') {
      token = localStorage.getItem('dbarc-token') || localStorage.getItem('token') || localStorage.getItem('auth_token');

      // If token is expired, purge stale auth from localStorage so request doesn't fail with 401
      if (token && isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('dbarc-token');
        localStorage.removeItem('user');
        token = null;
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=1';
        }
      }

      // Resolve tenant ID from user storage or env
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
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
      localStorage.removeItem('token');
      localStorage.removeItem('dbarc-token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
      }
    } else if (typeof window !== 'undefined' && error.response?.status === 403) {
      console.warn(`API Client 403 Forbidden (${error.config?.url})`);
    }
    return Promise.reject(error);
  }
);


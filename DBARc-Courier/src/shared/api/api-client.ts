import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token & tenant interceptor if token exists in localStorage or environment
apiClient.interceptors.request.use(
  (config) => {
    let token: string | null = null;

    if (typeof window !== 'undefined') {
      token = localStorage.getItem('dbarc-token') || localStorage.getItem('token') || localStorage.getItem('auth_token');

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
    if (typeof window !== 'undefined' && (error.response?.status === 401 || error.response?.status === 403)) {
      console.warn(`API Client ${error.response?.status} (${error.config?.url})`);
    }
    return Promise.reject(error);
  }
);

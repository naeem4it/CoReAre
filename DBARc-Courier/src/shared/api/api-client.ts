import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token & tenant interceptor if token exists in localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dbarc-token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token && !token.startsWith('mock-') && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
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

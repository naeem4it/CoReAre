import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token interceptor if token exists in localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dbarc-token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
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
    // Log warnings for dev mode to avoid Next.js overlay triggers
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      console.warn('API Client 401 Unauthorized:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

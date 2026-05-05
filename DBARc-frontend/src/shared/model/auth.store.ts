import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setCookie, removeCookie } from '../lib/cookies';

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'SHIPPER' | 'RIDER';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        // Set cookies for middleware
        setCookie('auth_token', accessToken);
        setCookie('user_role', user.role);
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        removeCookie('auth_token');
        removeCookie('user_role');
      },

      updateAccessToken: (accessToken) => {
        set({ accessToken });
        setCookie('auth_token', accessToken);
      },
    }),
    {
      name: 'dbarc-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

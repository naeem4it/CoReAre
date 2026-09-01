import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setCookie, removeCookie } from '../lib/cookies';

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'SHIPPER' | 'RIDER';

export interface Business {
  id: string | number;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  fullName?: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
  shippers?: Business[];
  outlets?: Business[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  activeBusinessId: string | number | null;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateAccessToken: (token: string) => void;
  setActiveBusinessId: (id: string | number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      activeBusinessId: null,

      setAuth: (user, accessToken, refreshToken) => {
        // Automatically set the first business as active if available
        const defaultBusinessId = user.shippers && user.shippers.length > 0 ? user.shippers[0].id : null;
        set({ user, accessToken, refreshToken, isAuthenticated: true, activeBusinessId: defaultBusinessId });
        // Set cookies for middleware
        setCookie('auth_token', accessToken);
        setCookie('user_role', user.role);
        if (defaultBusinessId) {
          setCookie('active_business', String(defaultBusinessId));
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, activeBusinessId: null });
        removeCookie('auth_token');
        removeCookie('user_role');
        removeCookie('active_business');
      },

      updateAccessToken: (accessToken) => {
        set({ accessToken });
        setCookie('auth_token', accessToken);
      },

      setActiveBusinessId: (id) => {
        set({ activeBusinessId: id });
        setCookie('active_business', String(id));
      },
    }),
    {
      name: 'dbarc-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

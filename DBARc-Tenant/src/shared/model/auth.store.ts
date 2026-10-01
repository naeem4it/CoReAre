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
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      activeBusinessId: null,

      setAuth: (user, accessToken, refreshToken) => {
        // Automatically set the first business as active if available
        const defaultBusinessId = user.shippers && user.shippers.length > 0 ? user.shippers[0].id : null;
        set({ user, accessToken, refreshToken, isAuthenticated: true, activeBusinessId: defaultBusinessId });
        
        // Differentiated cookies for multi-tab isolation
        const roleKey = user.role.toLowerCase();
        const rolePath = user.role === 'TENANT_ADMIN' ? '/courier' : user.role === 'SHIPPER' ? '/merchant' : '/admin';

        // 1. Role-specific cookies (never collide)
        setCookie(`auth_token_${roleKey}`, accessToken);
        setCookie(`user_role_${roleKey}`, user.role);

        // 2. Path-scoped cookies
        setCookie('auth_token', accessToken, 7, rolePath);
        setCookie('user_role', user.role, 7, rolePath);

        // 3. Fallback root cookies
        setCookie('auth_token', accessToken, 7, '/');
        setCookie('user_role', user.role, 7, '/');

        if (defaultBusinessId) {
          setCookie(`active_business_${roleKey}`, String(defaultBusinessId));
          setCookie('active_business', String(defaultBusinessId), 7, rolePath);
          setCookie('active_business', String(defaultBusinessId), 7, '/');
        }
      },

      logout: () => {
        const currentUser = get().user;
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, activeBusinessId: null });
        
        if (currentUser?.role) {
          const roleKey = currentUser.role.toLowerCase();
          const rolePath = currentUser.role === 'TENANT_ADMIN' ? '/courier' : currentUser.role === 'SHIPPER' ? '/merchant' : '/admin';
          removeCookie(`auth_token_${roleKey}`);
          removeCookie(`user_role_${roleKey}`);
          removeCookie(`active_business_${roleKey}`);
          removeCookie('auth_token', rolePath);
          removeCookie('user_role', rolePath);
          removeCookie('active_business', rolePath);
        }
        removeCookie('auth_token', '/');
        removeCookie('user_role', '/');
        removeCookie('active_business', '/');
      },

      updateAccessToken: (accessToken) => {
        set({ accessToken });
        const currentUser = get().user;
        if (currentUser?.role) {
          const roleKey = currentUser.role.toLowerCase();
          setCookie(`auth_token_${roleKey}`, accessToken);
        }
        setCookie('auth_token', accessToken);
      },

      setActiveBusinessId: (id) => {
        set({ activeBusinessId: id });
        const currentUser = get().user;
        if (currentUser?.role) {
          const roleKey = currentUser.role.toLowerCase();
          setCookie(`active_business_${roleKey}`, String(id));
        }
        setCookie('active_business', String(id));
      },
    }),
    {
      name: 'dbarc-auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }

        return {
          getItem: (key: string): string | null => {
            // 1. Primary: Tab-isolated sessionStorage
            const sessionVal = sessionStorage.getItem(key);
            if (sessionVal) return sessionVal;

            // 2. Role-specific localStorage fallback based on current URL path
            const pathname = window.location.pathname.toLowerCase();
            let roleKey = '';
            if (pathname.startsWith('/courier')) roleKey = 'TENANT_ADMIN';
            else if (pathname.startsWith('/merchant')) roleKey = 'SHIPPER';
            else if (pathname.startsWith('/admin')) roleKey = 'SUPER_ADMIN';
            else if (pathname.startsWith('/rider')) roleKey = 'RIDER';

            if (roleKey) {
              const roleVal = localStorage.getItem(`${key}_${roleKey}`);
              if (roleVal) {
                sessionStorage.setItem(key, roleVal);
                return roleVal;
              }
            }

            // 3. Fallback to generic localStorage
            const localVal = localStorage.getItem(key);
            if (localVal) {
              sessionStorage.setItem(key, localVal);
              return localVal;
            }

            return null;
          },
          setItem: (key: string, value: string): void => {
            // 1. Save in tab-isolated sessionStorage
            sessionStorage.setItem(key, value);

            // 2. Save in role-scoped localStorage
            try {
              const parsed = JSON.parse(value);
              const role = parsed?.state?.user?.role;
              if (role) {
                localStorage.setItem(`${key}_${role}`, value);
              }
            } catch (e) {
              // ignore
            }

            // Also keep standard key for single-tab fallbacks
            localStorage.setItem(key, value);
          },
          removeItem: (key: string): void => {
            const sessionVal = sessionStorage.getItem(key);
            sessionStorage.removeItem(key);

            if (sessionVal) {
              try {
                const parsed = JSON.parse(sessionVal);
                const role = parsed?.state?.user?.role;
                if (role) {
                  localStorage.removeItem(`${key}_${role}`);
                }
              } catch (e) {
                // ignore
              }
            }
          },
        };
      }),
    }
  )
);

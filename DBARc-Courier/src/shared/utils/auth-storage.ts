/**
 * Tab-Isolated & Role-Scoped Authentication Storage Manager
 * 
 * Solves multi-tab session collision where Tenant Admin in Tab 1
 * and Shipper Admin in Tab 2 of the same browser overwrite each other's credentials.
 * 
 * 1. Prioritizes sessionStorage (strictly isolated per browser tab).
 * 2. Maintains role-scoped localStorage backups (dbarc_tenant_* vs dbarc_shipper_*).
 * 3. Prevents login/logout in one tab from corrupting the other tab.
 */

export type AuthRoleType = 'tenant' | 'shipper';

export function isUserShipper(user: any): boolean {
  if (!user) return false;
  if (user.shipper_roles && Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0) return true;
  const roleType = (
    user.role?.type || 
    user.role_type || 
    user.role?.name || 
    (typeof user.role === 'string' ? user.role : '')
  ).toString().toLowerCase();
  if (roleType.includes('shipper')) return true;
  if (user.user_type === 'shipper' || user.type === 'shipper') return true;
  if (user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : !!user.shipper)) {
    const hasCourierRole = Array.isArray(user.role_definition) && user.role_definition.some((r: any) => 
      ['admin', 'courier', 'super admin', 'rider', 'front desk'].some(c => (r.role_name || '').toLowerCase().includes(c))
    );
    if (!hasCourierRole) return true;
  }
  const email = (user.email || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  if (email.includes('shipper') || username.includes('shipper')) return true;
  return false;
}

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;

    // 1. Current tab's isolated sessionStorage
    const sessionToken = sessionStorage.getItem('dbarc_token') || sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;

    // 2. Role-scoped fallback from URL context if tab session is fresh
    const isMerchantPath = window.location.pathname.startsWith('/merchant') || window.location.pathname.startsWith('/reports/customer');
    const isAdminPath = window.location.pathname.startsWith('/administration');

    if (isMerchantPath) {
      const shipperToken = localStorage.getItem('dbarc_shipper_token');
      if (shipperToken) {
        sessionStorage.setItem('dbarc_token', shipperToken);
        sessionStorage.setItem('token', shipperToken);
        return shipperToken;
      }
    } else if (isAdminPath) {
      const tenantToken = localStorage.getItem('dbarc_tenant_token');
      if (tenantToken) {
        sessionStorage.setItem('dbarc_token', tenantToken);
        sessionStorage.setItem('token', tenantToken);
        return tenantToken;
      }
    }

    // 3. Fallback to any stored token
    const fallbackToken = 
      localStorage.getItem('dbarc_tenant_token') ||
      localStorage.getItem('dbarc_shipper_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('dbarc-token');

    if (fallbackToken) {
      sessionStorage.setItem('dbarc_token', fallbackToken);
      sessionStorage.setItem('token', fallbackToken);
    }

    return fallbackToken;
  },

  getUser(): any {
    if (typeof window === 'undefined') return null;

    // 1. Current tab's isolated sessionStorage
    const sessionUserStr = sessionStorage.getItem('dbarc_user') || sessionStorage.getItem('user');
    if (sessionUserStr) {
      try {
        return JSON.parse(sessionUserStr);
      } catch (e) {}
    }

    // 2. Role-scoped fallback
    const isMerchantPath = window.location.pathname.startsWith('/merchant') || window.location.pathname.startsWith('/reports/customer');
    const isAdminPath = window.location.pathname.startsWith('/administration');

    let userStr: string | null = null;
    if (isMerchantPath) {
      userStr = localStorage.getItem('dbarc_shipper_user');
    } else if (isAdminPath) {
      userStr = localStorage.getItem('dbarc_tenant_user');
    }

    if (!userStr) {
      userStr = 
        localStorage.getItem('dbarc_tenant_user') ||
        localStorage.getItem('dbarc_shipper_user') ||
        localStorage.getItem('user');
    }

    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        sessionStorage.setItem('dbarc_user', userStr);
        sessionStorage.setItem('user', userStr);
        return parsed;
      } catch (e) {}
    }

    return null;
  },

  getActiveBusinessId(): number | null {
    if (typeof window === 'undefined') return null;
    const sessionVal = sessionStorage.getItem('activeBusinessId');
    if (sessionVal) return Number(sessionVal);

    const localVal = localStorage.getItem('dbarc_shipper_activeBusinessId') || localStorage.getItem('activeBusinessId');
    if (localVal) {
      sessionStorage.setItem('activeBusinessId', localVal);
      return Number(localVal);
    }
    return null;
  },

  setActiveBusinessId(id: number | null): void {
    if (typeof window === 'undefined') return;
    if (id !== null && id !== undefined) {
      sessionStorage.setItem('activeBusinessId', id.toString());
      localStorage.setItem('dbarc_shipper_activeBusinessId', id.toString());
      localStorage.setItem('activeBusinessId', id.toString());
    } else {
      sessionStorage.removeItem('activeBusinessId');
      localStorage.removeItem('dbarc_shipper_activeBusinessId');
      localStorage.removeItem('activeBusinessId');
    }
  },

  getActiveOfficeId(): number | null {
    if (typeof window === 'undefined') return null;
    const sessionVal = sessionStorage.getItem('activeOfficeId');
    if (sessionVal) return Number(sessionVal);

    const localVal = localStorage.getItem('dbarc_tenant_activeOfficeId') || localStorage.getItem('activeOfficeId');
    if (localVal) {
      sessionStorage.setItem('activeOfficeId', localVal);
      return Number(localVal);
    }
    return null;
  },

  setActiveOfficeId(id: number | null): void {
    if (typeof window === 'undefined') return;
    if (id !== null && id !== undefined) {
      sessionStorage.setItem('activeOfficeId', id.toString());
      localStorage.setItem('dbarc_tenant_activeOfficeId', id.toString());
      localStorage.setItem('activeOfficeId', id.toString());
    } else {
      sessionStorage.removeItem('activeOfficeId');
      localStorage.removeItem('dbarc_tenant_activeOfficeId');
      localStorage.removeItem('activeOfficeId');
    }
  },

  setSession(token: string, user: any, activeBusinessId?: number | null, activeOfficeId?: number | null): void {
    if (typeof window === 'undefined') return;
    const isShipper = isUserShipper(user);
    const roleKey: AuthRoleType = isShipper ? 'shipper' : 'tenant';

    // 1. Store in this tab's isolated sessionStorage
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('dbarc_token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('dbarc_user', JSON.stringify(user));
    sessionStorage.setItem('dbarc_role', roleKey);

    if (activeBusinessId !== undefined && activeBusinessId !== null) {
      sessionStorage.setItem('activeBusinessId', activeBusinessId.toString());
    }
    if (activeOfficeId !== undefined && activeOfficeId !== null) {
      sessionStorage.setItem('activeOfficeId', activeOfficeId.toString());
    }

    // 2. Store in role-scoped localStorage without destroying the other role
    localStorage.setItem(`dbarc_${roleKey}_token`, token);
    localStorage.setItem(`dbarc_${roleKey}_user`, JSON.stringify(user));

    if (activeBusinessId) {
      localStorage.setItem('dbarc_shipper_activeBusinessId', activeBusinessId.toString());
    }
    if (activeOfficeId) {
      localStorage.setItem('dbarc_tenant_activeOfficeId', activeOfficeId.toString());
    }

    // 3. Fallback generic keys
    localStorage.setItem('token', token);
    localStorage.setItem('dbarc-token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    const currentRole = sessionStorage.getItem('dbarc_role') || (this.getUser() && isUserShipper(this.getUser()) ? 'shipper' : 'tenant');

    // Clear this tab's sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('dbarc_token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('dbarc_user');
    sessionStorage.removeItem('dbarc_role');
    sessionStorage.removeItem('activeBusinessId');
    sessionStorage.removeItem('activeOfficeId');

    // Clear only this role's localStorage
    localStorage.removeItem(`dbarc_${currentRole}_token`);
    localStorage.removeItem(`dbarc_${currentRole}_user`);
    if (currentRole === 'shipper') {
      localStorage.removeItem('dbarc_shipper_activeBusinessId');
    } else {
      localStorage.removeItem('dbarc_tenant_activeOfficeId');
    }

    // Only clear generic keys if they match this role
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const storedRole = isUserShipper(parsed) ? 'shipper' : 'tenant';
        if (storedRole === currentRole) {
          localStorage.removeItem('token');
          localStorage.removeItem('dbarc-token');
          localStorage.removeItem('user');
        }
      }
    } catch (e) {}
  }
};

// Transparent tab-isolation bridge: ensures any direct reads of localStorage
// prioritize this tab's isolated sessionStorage for session keys
if (typeof window !== 'undefined' && window.localStorage && !(window as any).__dbarcStoragePatched) {
  try {
    (window as any).__dbarcStoragePatched = true;
    const originalGetItem = window.localStorage.getItem.bind(window.localStorage);
    
    window.localStorage.getItem = function (key: string): string | null {
      if (
        key === 'user' || 
        key === 'token' || 
        key === 'dbarc-token' || 
        key === 'activeBusinessId' || 
        key === 'activeOfficeId'
      ) {
        const sessionVal = window.sessionStorage?.getItem(key);
        if (sessionVal !== null && sessionVal !== undefined) {
          return sessionVal;
        }
      }
      return originalGetItem(key);
    };
  } catch (e) {
    // ignore
  }
}


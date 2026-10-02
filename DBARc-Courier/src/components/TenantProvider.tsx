'use client';

import * as React from 'react';
import axios from 'axios';
import { useAuth } from '@/components/AuthProvider';

interface TenantContextType {
  businessName: string;
  logoUrl: string | null;
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  isLoading: boolean;
}

const TenantContext = React.createContext<TenantContextType>({
  businessName: 'DBARc Courier',
  logoUrl: null,
  themePrimaryColor: '#0D9488',
  themeSecondaryColor: '#0284C7',
  isLoading: true,
});

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [businessName, setBusinessName] = React.useState('DBARc Courier');
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [themePrimaryColor, setThemePrimaryColor] = React.useState<string | null>('#0D9488');
  const [themeSecondaryColor, setThemeSecondaryColor] = React.useState<string | null>('#0284C7');
  const [isLoading, setIsLoading] = React.useState(true);

  const applyColors = React.useCallback((primary?: string | null, secondary?: string | null) => {
    if (typeof document === 'undefined') return;
    const p = primary || '#0D9488';
    const s = secondary || '#0284C7';

    document.documentElement.style.setProperty('--tenant-primary', p);
    document.body.style.setProperty('--tenant-primary', p);

    document.documentElement.style.setProperty('--tenant-secondary', s);
    document.body.style.setProperty('--tenant-secondary', s);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');
    const configuredTenantId = process.env.NEXT_PUBLIC_TENANT_ID || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '1';

    const handleTenantData = (data: any) => {
      if (!data || !isMounted) return;
      const name = data.business_name || data.name;
      if (name) setBusinessName(name);

      if (data.theme_primary_color) setThemePrimaryColor(data.theme_primary_color);
      if (data.theme_secondary_color) setThemeSecondaryColor(data.theme_secondary_color);
      applyColors(data.theme_primary_color, data.theme_secondary_color);

      const logoObj = data.logo?.data?.attributes || data.logo?.data || data.logo;
      const rawLogoUrl = logoObj?.url || data.logoUrl;
      if (rawLogoUrl) {
        const fullUrl = rawLogoUrl.startsWith('http')
          ? rawLogoUrl
          : `${apiBase}${rawLogoUrl}`;
        setLogoUrl(fullUrl);
      }
      try {
        localStorage.setItem('dbarc-tenant', JSON.stringify(data));
      } catch (e) {
        // ignore storage errors
      }
      setIsLoading(false);
    };

    async function loadTenant() {
      // 1. If user is authenticated with a tenant, use user's tenant
      if (user) {
        const tenant = user.tenant;
        const userTenantId = tenant?.id || user.tenantId || (typeof tenant === 'number' ? tenant : null);
        if (userTenantId) {
          try {
            const res = await axios.get(`${apiBase}/api/tenant/resolve?tenantId=${userTenantId}`);
            if (res.data) {
              handleTenantData(res.data);
              return;
            }
          } catch (err) {
            console.warn('Failed to resolve tenant by user tenantId:', err);
          }
        }
      }

      // 2. Custom domain or subdomain resolution (e.g. shipzo.mashrue.com)
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          try {
            const res = await axios.get(`${apiBase}/api/tenant/resolve?domain=${hostname}`);
            if (res.data) {
              handleTenantData(res.data);
              return;
            }
          } catch (err) {
            // fall through to next checks
          }
        }
      }

      // 3. Single-tenant / configured tenant ID from .env (e.g. NEXT_PUBLIC_TENANT_ID=1)
      if (configuredTenantId) {
        try {
          const res = await axios.get(`${apiBase}/api/tenant/resolve?tenantId=${configuredTenantId}`);
          if (res.data) {
            handleTenantData(res.data);
            return;
          }
        } catch (err) {
          console.warn('Failed to resolve configured tenant:', err);
        }
      }

      // 4. Stored tenant fallback from localStorage
      if (typeof window !== 'undefined') {
        try {
          const storedTenantStr = localStorage.getItem('dbarc-tenant') || localStorage.getItem('tenant');
          if (storedTenantStr) {
            const storedTenant = JSON.parse(storedTenantStr);
            handleTenantData(storedTenant);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse tenant from localStorage:', e);
        }
      }

      // 5. Automatic single-tenant fallback to backend default
      try {
        const res = await axios.get(`${apiBase}/api/tenant/resolve`);
        if (res.data) {
          handleTenantData(res.data);
          return;
        }
      } catch (err) {
        // default fallback
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadTenant();

    return () => {
      isMounted = false;
    };
  }, [user, applyColors]);

  return (
    <TenantContext.Provider value={{ businessName, logoUrl, themePrimaryColor, themeSecondaryColor, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => React.useContext(TenantContext);

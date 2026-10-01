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
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');

    // 1. Resolve domain branding if accessing through subdomain (e.g. shipzo.mashrue.com)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        axios
          .get(`${apiBase}/api/tenant/resolve?domain=${hostname}`)
          .then((res) => {
            if (res.data) {
              const data = res.data;
              if (data.business_name || data.name) {
                setBusinessName(data.business_name || data.name);
              }
              if (data.theme_primary_color) {
                setThemePrimaryColor(data.theme_primary_color);
              }
              if (data.theme_secondary_color) {
                setThemeSecondaryColor(data.theme_secondary_color);
              }
              applyColors(data.theme_primary_color, data.theme_secondary_color);

              if (data.logo?.url) {
                const url = data.logo.url.startsWith('http')
                  ? data.logo.url
                  : `${apiBase}${data.logo.url}`;
                setLogoUrl(url);
              }
            }
          })
          .catch(() => {
            // Ignore resolution error and proceed with local storage / user
          });
      }
    }

    // 2. Read strictly stored tenant info for local storage fallback
    if (typeof window !== 'undefined') {
      try {
        const storedTenantStr = localStorage.getItem('dbarc-tenant') || localStorage.getItem('tenant');
        if (storedTenantStr) {
          const storedTenant = JSON.parse(storedTenantStr);
          const name = storedTenant.business_name || storedTenant.name || storedTenant.businessName;
          if (name) setBusinessName(name);

          const primary = storedTenant.theme_primary_color || storedTenant.themePrimaryColor;
          const secondary = storedTenant.theme_secondary_color || storedTenant.themeSecondaryColor;
          if (primary) setThemePrimaryColor(primary);
          if (secondary) setThemeSecondaryColor(secondary);
          if (primary || secondary) applyColors(primary, secondary);

          const logo = storedTenant.logo?.url || storedTenant.logoUrl;
          if (logo) {
            setLogoUrl(logo.startsWith('http') ? logo : `${apiBase}${logo}`);
          }
        }
        
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          const tenantId = storedUser.tenant?.id || storedUser.tenantId || (typeof storedUser.tenant === 'number' ? storedUser.tenant : null);
          if (tenantId) {
            axios.get(`${apiBase}/api/tenant/resolve?tenantId=${tenantId}`)
              .then((res) => {
                if (res.data) {
                  const data = res.data;
                  const name = data.business_name || data.name;
                  if (name) setBusinessName(name);
                  if (data.theme_primary_color) setThemePrimaryColor(data.theme_primary_color);
                  if (data.theme_secondary_color) setThemeSecondaryColor(data.theme_secondary_color);
                  applyColors(data.theme_primary_color, data.theme_secondary_color);
                  if (data.logo?.url) {
                    const url = data.logo.url.startsWith('http')
                      ? data.logo.url
                      : `${apiBase}${data.logo.url}`;
                    setLogoUrl(url);
                  }
                  localStorage.setItem('dbarc-tenant', JSON.stringify(data));
                }
              })
              .catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Failed to parse tenant from localStorage:', e);
      }
    }

    // 3. User session update (e.g. Courier Admin naeemcourier@test.com)
    if (user) {
      const tenant = user.tenant;
      const tenantId = tenant?.id || user.tenantId || (typeof tenant === 'number' ? tenant : null);

      if (tenantId) {
        axios.get(`${apiBase}/api/tenant/resolve?tenantId=${tenantId}`)
          .then((res) => {
            if (res.data) {
              const data = res.data;
              const name = data.business_name || data.name;
              if (name) setBusinessName(name);
              if (data.theme_primary_color) setThemePrimaryColor(data.theme_primary_color);
              if (data.theme_secondary_color) setThemeSecondaryColor(data.theme_secondary_color);
              applyColors(data.theme_primary_color, data.theme_secondary_color);
              if (data.logo?.url) {
                const url = data.logo.url.startsWith('http')
                  ? data.logo.url
                  : `${apiBase}${data.logo.url}`;
                setLogoUrl(url);
              }
              localStorage.setItem('dbarc-tenant', JSON.stringify(data));
            }
          })
          .catch(() => {});
      } else {
        const tenantName = tenant?.business_name || tenant?.name;
        if (tenantName) setBusinessName(tenantName);

        if (tenant?.theme_primary_color || tenant?.theme_secondary_color) {
          setThemePrimaryColor(tenant.theme_primary_color || '#0D9488');
          setThemeSecondaryColor(tenant.theme_secondary_color || '#0284C7');
          applyColors(tenant.theme_primary_color, tenant.theme_secondary_color);
        }

        if (tenant?.logo?.url) {
          const url = tenant.logo.url.startsWith('http') 
            ? tenant.logo.url 
            : `${apiBase}${tenant.logo.url}`;
          setLogoUrl(url);
        }
      }
      setIsLoading(false);
    } else if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user, applyColors]);

  return (
    <TenantContext.Provider value={{ businessName, logoUrl, themePrimaryColor, themeSecondaryColor, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => React.useContext(TenantContext);

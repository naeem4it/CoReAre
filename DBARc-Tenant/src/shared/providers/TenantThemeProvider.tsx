'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { apiClient } from '@/shared/api/api-client';
import { generateTonalShades, getContrastColor, mixColors } from '@/shared/lib/colorExtractor';

export interface TenantBranding {
  id?: string | number;
  name: string;
  businessName: string;
  domain?: string;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  contrastText: string;
  logoUrl: string | null;
  isLoading: boolean;
}

const defaultBranding: TenantBranding = {
  name: 'DBARC',
  businessName: 'DBARC Logistics',
  themePrimaryColor: '#3B5BDB',
  themeSecondaryColor: '#0EA5E9',
  contrastText: '#ffffff',
  logoUrl: null,
  isLoading: true,
};

const TenantThemeContext = React.createContext<TenantBranding>(defaultBranding);

export const TenantThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [branding, setBranding] = React.useState<TenantBranding>(defaultBranding);

  // Apply CSS custom properties to document root
  const applyThemeVariables = React.useCallback((primary: string, secondary: string) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const shades = generateTonalShades(primary);
    const contrast = getContrastColor(primary);

    // Dynamic Tailwind primary scales
    root.style.setProperty('--primary-50', shades[50]);
    root.style.setProperty('--primary-100', shades[100]);
    root.style.setProperty('--primary-200', shades[200]);
    root.style.setProperty('--primary-300', shades[300]);
    root.style.setProperty('--primary-400', shades[400]);
    root.style.setProperty('--primary-500', shades[500]);
    root.style.setProperty('--primary-600', shades[600]);
    root.style.setProperty('--primary-700', shades[700]);
    root.style.setProperty('--primary-800', shades[800]);
    root.style.setProperty('--primary-900', shades[900]);

    // General tenant variables
    root.style.setProperty('--tenant-primary', primary);
    root.style.setProperty('--tenant-secondary', secondary);
    root.style.setProperty('--tenant-contrast', contrast);
    root.style.setProperty('--tenant-primary-subtle', mixColors(primary, '#ffffff', 0.9));
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function resolveBranding() {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');

      // 1. Resolve by hostname if domain contains subdomain (e.g. shipzo.mashrue.com or shipzo.dbarc.com)
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isNotGenericLocal = hostname !== 'localhost' && hostname !== '127.0.0.1';
        
        if (isNotGenericLocal) {
          try {
            const res = await apiClient.get(`/tenant/resolve?domain=${hostname}`);
            if (res.data && isMounted) {
              const data = res.data;
              const logo = data.logo?.url 
                ? (data.logo.url.startsWith('http') ? data.logo.url : `${apiBase}${data.logo.url}`)
                : null;
              const primary = data.theme_primary_color || '#003ec7';
              const secondary = data.theme_secondary_color || '#565e74';

              applyThemeVariables(primary, secondary);
              setBranding({
                id: data.id,
                name: data.name,
                businessName: data.business_name || data.name,
                domain: data.domain,
                themePrimaryColor: primary,
                themeSecondaryColor: secondary,
                contrastText: getContrastColor(primary),
                logoUrl: logo,
                isLoading: false,
              });
              return;
            }
          } catch (domainErr) {
            // Fall through to session resolution
          }
        }
      }

      // 2. Resolve by authenticated user's tenant (e.g. Courier Admin naeemcourier@test.com)
      if (isAuthenticated && user?.tenantId) {
        try {
          const res = await apiClient.get('/tenant/list?populate=*');
          if (res.data?.data && isMounted) {
            const matched = res.data.data.find((item: any) => 
              item.id.toString() === user.tenantId?.toString()
            );

            if (matched) {
              const attrs = matched.attributes;
              const logoData = attrs.logo?.data?.attributes || attrs.logo?.data || attrs.logo;
              const logo = logoData?.url 
                ? (logoData.url.startsWith('http') ? logoData.url : `${apiBase}${logoData.url}`)
                : null;
              const primary = attrs.theme_primary_color || '#003ec7';
              const secondary = attrs.theme_secondary_color || '#565e74';

              applyThemeVariables(primary, secondary);
              setBranding({
                id: matched.id,
                name: attrs.name || user.tenantName || 'Tenant',
                businessName: attrs.business_name || attrs.name || user.tenantName || 'Tenant',
                domain: attrs.domain,
                themePrimaryColor: primary,
                themeSecondaryColor: secondary,
                contrastText: getContrastColor(primary),
                logoUrl: logo,
                isLoading: false,
              });
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to resolve tenant branding by user tenantId:', err);
        }
      }

      // 3. Resolve by configured NEXT_PUBLIC_TENANT_ID in .env (Single tenant mode / pre-login)
      const configuredTenantId = process.env.NEXT_PUBLIC_TENANT_ID || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '1';
      if (configuredTenantId) {
        try {
          const res = await apiClient.get(`/tenant/resolve?tenantId=${configuredTenantId}`);
          if (res.data && isMounted) {
            const data = res.data;
            const logo = data.logo?.url 
              ? (data.logo.url.startsWith('http') ? data.logo.url : `${apiBase}${data.logo.url}`)
              : null;
            const primary = data.theme_primary_color || '#3B5BDB';
            const secondary = data.theme_secondary_color || '#0EA5E9';

            applyThemeVariables(primary, secondary);
            setBranding({
              id: data.id,
              name: data.name,
              businessName: data.business_name || data.name,
              domain: data.domain,
              themePrimaryColor: primary,
              themeSecondaryColor: secondary,
              contrastText: getContrastColor(primary),
              logoUrl: logo,
              isLoading: false,
            });
            return;
          }
        } catch (confErr) {
          console.warn('Failed to resolve configured tenant branding:', confErr);
        }
      }

      // 4. Fallback to default Option 1 Titanium Slate & Neo-Indigo
      if (isMounted) {
        applyThemeVariables('#3B5BDB', '#0EA5E9');
        setBranding({
          ...defaultBranding,
          isLoading: false,
        });
      }
    }

    resolveBranding();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, applyThemeVariables]);

  return (
    <TenantThemeContext.Provider value={branding}>
      {children}
    </TenantThemeContext.Provider>
  );
};

export const useTenantBranding = () => React.useContext(TenantThemeContext);

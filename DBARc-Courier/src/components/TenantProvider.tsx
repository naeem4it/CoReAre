'use client';

import * as React from 'react';
import { useAuth } from '@/components/AuthProvider';

interface TenantContextType {
  businessName: string;
  logoUrl: string | null;
  themePrimaryColor: string | null;
  isLoading: boolean;
}

const TenantContext = React.createContext<TenantContextType>({
  businessName: 'Leoparda',
  logoUrl: null,
  themePrimaryColor: null,
  isLoading: true,
});

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [businessName, setBusinessName] = React.useState('Leoparda');
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [themePrimaryColor, setThemePrimaryColor] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Read strictly tenant info for platform branding
    if (typeof window !== 'undefined') {
      try {
        const storedTenantStr = localStorage.getItem('dbarc-tenant') || localStorage.getItem('tenant');
        if (storedTenantStr) {
          const storedTenant = JSON.parse(storedTenantStr);
          const name = storedTenant.business_name || storedTenant.name || storedTenant.businessName;
          if (name) setBusinessName(name);
          if (storedTenant.logo?.url || storedTenant.logoUrl) {
            const logo = storedTenant.logo?.url || storedTenant.logoUrl;
            setLogoUrl(logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}${logo}`);
          }
        } else {
          const storedUserStr = localStorage.getItem('user');
          if (storedUserStr) {
            const storedUser = JSON.parse(storedUserStr);
            const tenantObj = storedUser.tenant;
            const name = tenantObj?.business_name || tenantObj?.name;
            if (name) setBusinessName(name);
          }
        }
      } catch (e) {
        console.warn('Failed to parse tenant from localStorage:', e);
      }
    }

    if (user) {
      const tenant = user.tenant;
      const tenantName = tenant?.business_name || tenant?.name;

      if (tenantName) {
        setBusinessName(tenantName);
      }

      if (tenant?.theme_primary_color) {
        setThemePrimaryColor(tenant.theme_primary_color);
        document.body.style.setProperty('--tenant-primary', tenant.theme_primary_color);
      }

      if (tenant?.logo?.url) {
        const url = tenant.logo.url.startsWith('http') 
          ? tenant.logo.url 
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}${tenant.logo.url}`;
        setLogoUrl(url);
      }
      setIsLoading(false);
    } else if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <TenantContext.Provider value={{ businessName, logoUrl, themePrimaryColor, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => React.useContext(TenantContext);

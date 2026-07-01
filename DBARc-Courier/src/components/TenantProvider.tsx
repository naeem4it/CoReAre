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
  businessName: 'Fly Courier',
  logoUrl: null,
  themePrimaryColor: null,
  isLoading: true,
});

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [businessName, setBusinessName] = React.useState('Fly Courier');
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [themePrimaryColor, setThemePrimaryColor] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.tenant) {
      // User has tenant populated
      const tenant = user.tenant;
      if (tenant.business_name) {
        setBusinessName(tenant.business_name);
      } else if (tenant.name) {
        setBusinessName(tenant.name);
      }

      if (tenant.theme_primary_color) {
        setThemePrimaryColor(tenant.theme_primary_color);
        // Inject CSS variable to document body
        document.body.style.setProperty('--tenant-primary', tenant.theme_primary_color);
      }

      if (tenant.logo?.url) {
        // Handle Strapi media URL (prepend backend URL if relative)
        const url = tenant.logo.url.startsWith('http') 
          ? tenant.logo.url 
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'}${tenant.logo.url}`;
        setLogoUrl(url);
      }
      
      setIsLoading(false);
    } else {
      // If user is not loaded or has no tenant, just stop loading
      if (user !== undefined) {
        setIsLoading(false);
      }
    }
  }, [user]);

  return (
    <TenantContext.Provider value={{ businessName, logoUrl, themePrimaryColor, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => React.useContext(TenantContext);

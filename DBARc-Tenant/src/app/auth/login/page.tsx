'use client';

import * as React from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';
import { useTenantBranding } from '@/shared/providers/TenantThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { DBarcLogo } from '@/shared/ui/DBarcLogo';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { businessName, logoUrl } = useTenantBranding();

  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tenantRememberedEmail');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');
      const response = await axios.post(`${apiRoot}/admin/login`, {
        email,
        password,
      });

      const loginData = response.data?.data;
      const user = loginData?.user;
      const accessToken = loginData?.accessToken || loginData?.token;

      const roleCodes = Array.isArray(user?.roles) ? user.roles.map((role: any) => role.code) : [];
      const normalizedRole = roleCodes.includes('strapi-super-admin')
        ? 'SUPER_ADMIN'
        : roleCodes.includes('strapi-shipper')
        ? 'SHIPPER'
        : roleCodes.includes('strapi-tenant-admin')
        ? 'TENANT_ADMIN'
        : roleCodes.includes('strapi-rider')
        ? 'RIDER'
        : (user?.role_type as UserRole) || 'SUPER_ADMIN';

      const userData = {
        id: user?.id?.toString() ?? '',
        email: user?.email ?? email,
        name:
          user?.username ||
          `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim() ||
          user?.email ||
          email,
        role: normalizedRole,
        tenantId: user?.tenant?.id?.toString(),
        tenantName: user?.tenant?.name,
      };

      setAuth(userData, accessToken, accessToken);

      if (rememberMe) {
        localStorage.setItem('tenantRememberedEmail', email);
      } else {
        localStorage.removeItem('tenantRememberedEmail');
      }

      const redirects: Record<string, string> = {
        SUPER_ADMIN: '/admin',
        TENANT_ADMIN: '/courier',
        SHIPPER: '/merchant',
        RIDER: '/rider',
      };

      router.push(redirects[normalizedRole] || '/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0F19] text-slate-100 px-4 py-8 relative overflow-hidden select-none">
      {/* Option 1 Ambient Glow & Futuristic Mesh */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] opacity-30 pointer-events-none blur-[120px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #3B5BDB 0%, #0EA5E9 40%, transparent 70%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-1/4 w-[500px] h-[350px] opacity-15 pointer-events-none blur-[140px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)',
        }}
      />

      {/* Futuristic Background Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Centered Modern Card - Option 1 Titanium Slate Aesthetic */}
      <Card className="w-full max-w-[430px] relative z-10 shadow-2xl shadow-indigo-950/70 border border-slate-800/90 rounded-3xl overflow-hidden bg-slate-900/90 backdrop-blur-2xl">
        {/* Accent Top Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
        
        <div className="pt-8 pb-3 px-8 text-center flex flex-col items-center">
          {/* Logo Branding */}
          {logoUrl ? (
            <div className="h-16 w-full max-w-[220px] mb-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={businessName || 'Tenant Logo'}
                className="max-h-16 max-w-full object-contain filter drop-shadow-md"
              />
            </div>
          ) : (
            <div className="mb-4">
              <DBarcLogo size={50} variant="dark" subtitle="Courier Manager" />
            </div>
          )}

          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            Sign In
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Enter your credentials to access the {businessName || 'Courier Manager'} portal
          </p>
        </div>

        <CardContent className="px-8 pb-9 pt-2">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="admin@dbarc.com"
                    className="w-full h-11 pl-10 pr-3.5 text-sm rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 text-sm rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" 
                />
                <span>Remember me</span>
              </label>
              <a 
                href="#" 
                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] cursor-pointer inline-flex items-center justify-center gap-2"
                isLoading={isLoading}
              >
                Sign In to Terminal <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Clean Minimal Footer */}
      <footer className="mt-8 text-center relative z-10">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {businessName || 'DBARc Courier Manager'}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

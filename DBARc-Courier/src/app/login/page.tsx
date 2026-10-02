'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';

import { AuthService } from '@/services/api';
import { LoginRequest, LoginResponse } from '@/types/auth.types';
import { StrapiErrorResponse } from '@/types/strapi.types';
import { TextBox } from '@/components/ui/form/text-box';
import { useTenant } from '@/components/TenantProvider';

import { authStorage } from '@/shared/utils/auth-storage';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your username or business email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const [remember, setRemember] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { businessName, logoUrl } = useTenant();

  const methods = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  // Clear stale session on arriving at login page for this tab only
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('expired') === '1') {
        setError('Your session has expired. Please log in again to continue.');
      }
      // Purge only current tab session so other open tabs (e.g. tenant admin) are never disrupted
      sessionStorage.clear();

      // Restore remembered email if previously checked
      const savedEmail = localStorage.getItem('rememberedEmail');
      if (savedEmail) {
        methods.setValue('identifier', savedEmail);
        setRemember(true);
      }
    }
  }, [router, methods]);

  const loginMutation = useMutation<LoginResponse, AxiosError<StrapiErrorResponse>, LoginRequest>({
    mutationFn: AuthService.login,
    onSuccess: (data) => {
      const user: any = data.user;
      const roleType = (
        user?.role?.type || 
        user?.role_type || 
        user?.role?.name || 
        (typeof user?.role === 'string' ? user?.role : '')
      ).toString().toLowerCase();

      const isSuperAdmin = 
        roleType.includes('super_admin') || 
        roleType.includes('super admin') ||
        user?.role_type === 'SUPER_ADMIN' ||
        user?.isAdminUser;

      if (isSuperAdmin) {
        authStorage.clearSession();
        setError('Access Denied: Super Admin accounts cannot log into the Courier Portal. Please use the Super Admin Portal.');
        return;
      }

      if (remember) {
        localStorage.setItem('rememberedEmail', methods.getValues('identifier'));
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');
      fetch(`${apiBase}/api/users/me?populate[tenant][populate]=*&populate[role_definition]=*&populate[offices]=*&populate[shipper]=*`, {
        headers: { Authorization: `Bearer ${data.jwt}` }
      })
        .then((res) => res.json())
        .then(async (fullUser) => {
          const tenantId = fullUser?.tenant?.id;
          if (tenantId) {
            try {
              const resTenant = await fetch(`${apiBase}/api/tenant/resolve?tenantId=${tenantId}`);
              if (resTenant.ok) {
                const tenantData = await resTenant.json();
                fullUser.tenant = tenantData;
                localStorage.setItem('dbarc-tenant', JSON.stringify(tenantData));
              }
            } catch (e) {}
          }
          authStorage.setSession(data.jwt, fullUser);
          window.location.href = '/';
        })
        .catch(() => {
          authStorage.setSession(data.jwt, data.user);
          window.location.href = '/';
        });
    },
    onError: (err) => {
      console.warn('Backend login API notice:', err.message);
      const apiErrorMessage = err.response?.data?.error?.message;
      if (apiErrorMessage) {
        setError(apiErrorMessage);
        return;
      }

      // Check identifier in fallback
      const identifier = methods.getValues('identifier') || '';
      if (identifier.toLowerCase().includes('super') || identifier.toLowerCase().includes('superadmin')) {
        setError('Access Denied: Super Admin accounts cannot log into the Courier Portal.');
        return;
      }

      setError('Invalid login credentials. Please check your email and password.');
    },
  });

  const handleLoginSubmit = (data: LoginRequest) => {
    setError(null);
    loginMutation.mutate(data);
  };

  const loading = loginMutation.isPending;

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 relative overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        body { font-family: 'Inter', sans-serif; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        input:focus {
            box-shadow: 0 0 0 2px var(--tenant-primary, #003ec7) !important;
            outline: none !important;
        }
      `}} />

      {/* Background ambient branding glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 opacity-30 pointer-events-none blur-3xl rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--tenant-primary, #003ec7) 0%, transparent 70%)',
        }}
      />

      {/* Centered Sign In Card */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-8 sm:p-10 flex flex-col relative z-10">
        {/* Brand Header with Uploaded Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          {logoUrl ? (
            <div className="h-16 w-full max-w-[220px] mb-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={businessName}
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                <defs>
                  <linearGradient id="courier-login-teal-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--tenant-primary, #0D9488)" />
                    <stop offset="100%" stopColor="var(--tenant-secondary, #0284C7)" />
                  </linearGradient>
                </defs>
                <path d="M 18 24 H 42 C 68 24, 86 36, 86 54 C 86 64, 80 72, 70 78 C 76 70, 78 62, 78 54 C 78 42, 64 34, 44 34 H 28 L 18 42 Z" fill="url(#courier-login-teal-logo)" />
                <path d="M 16 78 C 22 84, 34 86, 48 86 C 64 86, 76 78, 80 66 C 72 74, 60 76, 48 76 C 34 76, 26 70, 26 58 C 26 50, 32 44, 40 40 C 30 42, 22 50, 22 62 C 22 68, 18 72, 16 78 Z" fill="var(--tenant-primary, #0D9488)" opacity="0.85" />
              </svg>
            </div>
          )}

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign In
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Enter your credentials to access the {businessName} portal
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2 border border-red-200/70">
            <span className="material-symbols-outlined text-[20px] shrink-0 text-red-600">error</span>
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form */}
        <FormProvider {...methods}>
          <form className="space-y-4" onSubmit={methods.handleSubmit(handleLoginSubmit)}>
            {/* Email / Username Field */}
            <TextBox<LoginRequest>
              name="identifier"
              label="Business Email"
              placeholder="name@flycourier.com"
              type="email"
              icon="mail"
              disabled={loading}
            />

            {/* Password Field */}
            <TextBox<LoginRequest>
              name="password"
              label="Password"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              icon="lock"
              disabled={loading}
              rightElement={
                <button
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              }
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                <span className="text-xs text-slate-600 font-medium">
                  Remember this device
                </span>
              </label>
              <a
                className="text-xs font-semibold hover:underline transition-all"
                style={{ color: 'var(--tenant-primary, #003ec7)' }}
                href="#"
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                className="w-full h-11 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:opacity-95"
                style={{
                  backgroundColor: 'var(--tenant-primary, #003ec7)',
                  boxShadow: '0 4px 14px 0 color-mix(in srgb, var(--tenant-primary, #003ec7) 30%, transparent)',
                }}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* Minimal Footer */}
      <footer className="mt-8 text-center relative z-10">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {businessName}. All rights reserved.
        </p>
      </footer>
    </main>
  );
}

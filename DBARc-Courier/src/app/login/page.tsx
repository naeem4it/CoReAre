'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';

import { AuthService } from '@/services/api';
import { LoginRequest, LoginResponse } from '@/types/auth.types';
import { StrapiErrorResponse } from '@/types/strapi.types';
import { TextBox } from '@/components/ui/form/text-box';

const loginSchema = z.object({
  identifier: z.string().email('Please enter a valid business email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const [remember, setRemember] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const methods = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  // If already logged in, redirect to home
  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dbarc-token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const loginMutation = useMutation<LoginResponse, AxiosError<StrapiErrorResponse>, LoginRequest>({
    mutationFn: AuthService.login,
    onSuccess: (data) => {
      localStorage.setItem('token', data.jwt);
      localStorage.setItem('dbarc-token', data.jwt);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      router.push('/');
    },
    onError: (err) => {
      console.error('Login error:', err);
      let message = 'Invalid email or password';
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      }
      setError(message);
    },
  });

  const handleLoginSubmit = (data: LoginRequest) => {
    setError(null);
    loginMutation.mutate(data);
  };

  const loading = loginMutation.isPending;

  return (
    <main className="flex min-h-screen w-full bg-background text-on-surface">
      <style dangerouslySetInnerHTML={{
        __html: `
        body { font-family: 'Inter', sans-serif; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .hero-gradient {
            background: linear-gradient(135deg, rgba(0, 62, 199, 0.85) 0%, rgba(25, 28, 30, 0.95) 100%);
        }
        input:focus {
            box-shadow: 0 0 0 2px #0052ff !important;
            outline: none !important;
        }
      `}} />
      {/* Left Side: Logistics Hero & Brand (Hidden on Mobile) */}
      <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-inverse-surface">
        <img
          alt="Logistics Cargo Hub"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-40 animate-pulse-slow"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBamTePAe09VYo-JB8a2FZtqnE3J6CfkRlej9eJfudiPLSErdu0d5fdymSIct0l0VjYOVkI9Zmm2W3AyvC0JyeA83bk8ouE8CZdSOMqSvTjYYW7zrkRxQCP09UHz-4kBZFp2f1jt48lOj1JUFHR_LA0LJs5EHsGd882AbSMWfV9FuLhxPgnh-nVPyelKx0NkFRlnxtdokl61By63v6le8_E8fankBOflbz8LTRgQ7KwVXD9hzTFtHxPx9qQaBmR88mXlSVlWFohPUY"
        />
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="relative z-10 flex flex-col justify-between p-xl w-full">
          {/* Brand Anchor */}
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-white tracking-tight">
              LogisticsMastery
            </h1>
          </div>
          {/* Messaging Content */}
          <div>
            <h2 className="font-display-lg text-display-lg text-white mb-sm">
              Precision in Motion. Global in Scale.
            </h2>
            <p className="font-body-lg text-body-lg text-primary-fixed opacity-90 leading-relaxed">
              Access Fly Courier's high-performance terminal. Manage fleet analytics, real-time shipment tracking, and compliance workflows from a single unified command center.
            </p>
            <div className="mt-lg flex gap-md">
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md text-white">4.2M</span>
                <span className="font-label-md text-label-md text-primary-fixed uppercase tracking-widest">Shipments Daily</span>
              </div>
              <div className="w-px h-12 bg-outline opacity-30"></div>
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md text-white">99.9%</span>
                <span className="font-label-md text-label-md text-primary-fixed uppercase tracking-widest">Uptime SLA</span>
              </div>
            </div>
          </div>
          {/* Footer Text */}
          <div>
            <p className="font-label-md text-label-md text-primary-fixed opacity-60">
              © 2024 LogisticsMastery. All rights reserved. Precision in Motion.
            </p>
          </div>
        </div>
      </section>

      {/* Right Side: Sign In Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-md bg-surface">
        <div className="w-full max-w-[440px] flex flex-col">
          {/* Mobile Branding (Logo only visible on mobile) */}
          <div className="lg:hidden mb-lg flex justify-center">
            <span className="font-headline-lg text-headline-lg font-bold text-primary">LogisticsMastery</span>
          </div>
          {/* Header */}
          <div className="mb-lg">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Sign In</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Enter your credentials to access the Fly Courier dashboard.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-md p-sm bg-error-container text-on-error-container text-body-md rounded-lg flex items-center gap-xs border border-error/20">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form Context Provider */}
          <FormProvider {...methods}>
            <form className="space-y-md" onSubmit={methods.handleSubmit(handleLoginSubmit)}>
              {/* Email Field */}
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
                    className="text-outline hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-xs">
                  <input
                    className="w-4 h-4 rounded-sm border-outline text-primary focus:ring-primary cursor-pointer"
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none" htmlFor="remember">
                    Remember this device
                  </label>
                </div>
                <a className="font-label-md text-label-md text-primary hover:underline transition-all" href="#">Forgot Password?</a>
              </div>

              {/* Actions */}
              <div className="pt-sm space-y-md">
                <button
                  className="w-full h-10 bg-primary-container text-on-primary font-body-md text-body-md font-semibold rounded-lg flex items-center justify-center gap-xs hover:bg-primary transition-all active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                    </span>
                  ) : (
                    <>
                      Sign In to Terminal
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-sm">
                  <div className="h-px w-full bg-outline-variant"></div>
                  <span className="font-label-md text-label-md text-outline whitespace-nowrap">OR SSO ACCESS</span>
                  <div className="h-px w-full bg-outline-variant"></div>
                </div>

                <button
                  className="w-full h-10 bg-white border border-outline-variant text-secondary font-body-md text-body-md font-medium rounded-lg flex items-center justify-center gap-xs hover:bg-surface-container-low transition-all active:scale-[0.98] cursor-pointer"
                  type="button"
                >
                  <img
                    alt="Google Logo"
                    className="w-5 h-5"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuASROpil3bMbZL_r5fm5dp4K5HW-oqpz6JyOR50iOJcmmNOu7VbKEEYjYnpCV7ucSRAh24fmbYbEwVhusQZezA720en-kypDLX2VgHndHOxSWqnkpeTMio6JhSTZz7AiMTTR5FZFIBxN5lJP9-lk9E-LQqH5TChXoW0Zo_LOHcY-FnbUqq_6EmTG2zp5ObjuvCSbIK7gLEGhjfebAjuf4KFzXk4MVSUAMIGecK4rVS7exKfKVvcay5WUHw7yU6x9UUttxXPQsX7qcM"
                  />
                  Continue with Enterprise Account
                </button>
              </div>
            </form>
          </FormProvider>

          {/* Footer */}
          <div className="mt-xl text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              New to Fly Courier?{' '}
              <Link className="font-body-md text-body-md font-bold text-primary hover:underline transition-all" href="/signup">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

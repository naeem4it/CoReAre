'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // If already logged in, redirect to home
  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dbarc-token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/local', {
        identifier: email,
        password: password,
      });

      const { jwt, user } = response.data;

      if (jwt) {
        localStorage.setItem('token', jwt);
        localStorage.setItem('dbarc-token', jwt);
        localStorage.setItem('user', JSON.stringify(user));

        // Redirect to dashboard
        router.push('/');
      } else {
        setError('Login failed: Token not received');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err.response?.data?.error?.message || 'Invalid email or password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="">
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

          {/* Form */}
          <form className="space-y-md" onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">BUSINESS EMAIL</label>
              <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                <input
                  className="w-full h-10 pl-10 pr-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface"
                  id="email"
                  placeholder="name@flycourier.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">PASSWORD</label>
                <a className="font-label-md text-label-md text-primary hover:underline transition-all" href="#">Forgot Password?</a>
              </div>
              <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                <input
                  className="w-full h-10 pl-10 pr-12 bg-white border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
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
                Remember this device for 30 days
              </label>
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

          {/* Footer */}
          <div className="mt-xl text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              New to Fly Courier?{' '}
              <a className="font-body-md text-body-md font-bold text-primary hover:underline transition-all" href="#">
                Create Account
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

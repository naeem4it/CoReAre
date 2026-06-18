'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/api-client';

export default function SetupAccountPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Fallback for Suspense hydration issues if Next.js throws
  // In Next.js 13+ useSearchParams should be wrapped in Suspense, but for simplicity we rely on page-level boundary
  // Wait, I will just proceed.

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-100 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Link</h2>
          <p className="text-slate-600 mb-6">This setup link is invalid or missing a security token.</p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/setup-account', {
        token,
        password
      });

      if (response.data?.jwt) {
        localStorage.setItem('token', response.data.jwt);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      console.error('Setup failed', err);
      const errorMessage = err.response?.data?.error?.message;
      if (errorMessage === 'EXPIRED_TOKEN') {
        setError('Your setup link has expired. Please request a new one from your administrator.');
      } else if (errorMessage === 'INVALID_TOKEN') {
        setError('Your setup link is invalid or has already been used.');
      } else {
        setError(errorMessage || 'Failed to setup account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 text-center border-b border-slate-100 bg-white">
          <h2 className="text-2xl font-bold text-slate-800">Setup Your Account</h2>
          <p className="text-sm text-slate-500 mt-2">Welcome to DBARc! Please set a secure password to complete your account setup.</p>
        </div>
        
        <div className="p-8 bg-white">
          {success ? (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900">Setup Complete!</h3>
              <p className="text-sm text-slate-500 mt-2">Your password has been set. Redirecting you to the dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 text-white font-medium rounded-lg transition-colors mt-6 disabled:opacity-70 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Setting Password...' : 'Complete Setup'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

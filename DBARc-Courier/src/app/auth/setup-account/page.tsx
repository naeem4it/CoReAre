'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/api-client';
import { Eye, EyeOff } from 'lucide-react';

const validatePasswordRule = (pwd: string): { isValid: boolean; message?: string } => {
  if (!pwd || pwd.length < 8 || pwd.length > 20) {
    return { isValid: false, message: 'Password must be between 8 and 20 characters long.' };
  }
  if (!/[A-Z]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }
  return { isValid: true };
};

function SetupAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
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

    const pwdVal = validatePasswordRule(password);
    if (!pwdVal.isValid) {
      setError(pwdVal.message || 'Invalid password format.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      maxLength={20}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Dynamic Password Requirements Checklist */}
                  {password.length > 0 && (
                    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                      <span className="font-bold text-slate-700 block mb-1">Password Requirements:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <span className={`flex items-center gap-1.5 ${password.length >= 8 && password.length <= 20 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[14px]">{password.length >= 8 && password.length <= 20 ? 'check_circle' : 'circle'}</span>
                          8 to 20 characters
                        </span>
                        <span className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[14px]">{/[A-Z]/.test(password) ? 'check_circle' : 'circle'}</span>
                          1 uppercase letter (A-Z)
                        </span>
                        <span className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[14px]">{/[a-z]/.test(password) ? 'check_circle' : 'circle'}</span>
                          1 lowercase letter (a-z)
                        </span>
                        <span className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[14px]">{/[0-9]/.test(password) ? 'check_circle' : 'circle'}</span>
                          1 number (0-9)
                        </span>
                        <span className={`flex items-center gap-1.5 col-span-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[14px]">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? 'check_circle' : 'circle'}</span>
                          1 special character (!@#$%^&*...)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      maxLength={20}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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

export default function SetupAccountPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full" />
      </div>
    }>
      <SetupAccountContent />
    </React.Suspense>
  );
}

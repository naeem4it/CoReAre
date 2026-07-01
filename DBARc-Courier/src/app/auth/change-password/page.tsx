'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';

export default function ChangePasswordPage() {
  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  
  const [passwordStrength, setPasswordStrength] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const updateStrength = (val: string) => {
    setNewPassword(val);
    let strength = 0;
    if (val.length > 0) strength += 20;
    if (val.length > 7) strength += 20;
    if (/[0-9]/.test(val)) strength += 20;
    if (/[A-Z]/.test(val)) strength += 20;
    if (/[^A-Za-z0-9]/.test(val)) strength += 20;
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: oldPassword,
        password: newPassword,
        passwordConfirmation: confirmPassword
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPasswordStrength(0);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        (e.target as HTMLFormElement).reset();
      }, 2000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthProps = () => {
    if (passwordStrength <= 20) {
      return { width: '20%', color: 'bg-error', text: 'Very Weak', textColor: 'text-error' };
    } else if (passwordStrength <= 40) {
      return { width: '40%', color: 'bg-orange-500', text: 'Weak', textColor: 'text-orange-500' };
    } else if (passwordStrength <= 60) {
      return { width: '60%', color: 'bg-yellow-500', text: 'Fair', textColor: 'text-yellow-500' };
    } else if (passwordStrength <= 80) {
      return { width: '80%', color: 'bg-blue-500', text: 'Strong', textColor: 'text-blue-500' };
    } else {
      return { width: '100%', color: 'bg-emerald-500', text: 'Excellent', textColor: 'text-emerald-500' };
    }
  };

  const strengthProps = getStrengthProps();

  return (
    <div className="flex-1 p-lg overflow-y-auto min-h-screen bg-background text-on-background font-body-md pt-xl">
      <div className="max-w-[800px] mx-auto">
        {/* Breadcrumbs & Header */}
        <div className="mb-xl">
          <nav className="flex items-center gap-xs text-secondary mb-xs">
            <span className="font-label-md text-label-md">Settings</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-label-md text-label-md text-primary">Security</span>
          </nav>
          <h1 className="font-display-lg text-display-lg text-on-surface">Password & Security</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Manage your account security settings and update your password.</p>
        </div>
        
        {errorMessage && (
          <div className="mb-md p-md bg-error-container text-on-error-container rounded-lg border border-error/20 flex items-center gap-xs">
            <span className="material-symbols-outlined">error</span>
            {errorMessage}
          </div>
        )}

        <div className="space-y-lg">
          {/* Change Password Card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-low">
              <h2 className="font-headline-md text-headline-md text-on-surface">Change Password</h2>
            </div>
            <div className="p-md md:p-lg">
              <form className="space-y-md" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="old-password">Old Password</label>
                    <div className="relative">
                      <input 
                        className="w-full h-10 px-md border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md transition-all" 
                        id="old-password" 
                        placeholder="Enter current password" 
                        type={showOldPassword ? "text" : "password"} 
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                      />
                      <button className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-primary" onClick={() => setShowOldPassword(!showOldPassword)} type="button">
                        <span className="material-symbols-outlined">{showOldPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    {/* Spacer for alignment or helper text */}
                    <div className="h-full flex items-center">
                      <p className="text-label-md text-outline">You will be required to re-login after a successful password change.</p>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="new-password">New Password</label>
                    <div className="relative">
                      <input 
                        className="w-full h-10 px-md border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md transition-all" 
                        id="new-password" 
                        onChange={(e) => updateStrength(e.target.value)} 
                        placeholder="Minimum 8 characters" 
                        value={newPassword}
                        type={showNewPassword ? "text" : "password"} 
                        required
                      />
                      <button className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-primary" onClick={() => setShowNewPassword(!showNewPassword)} type="button">
                        <span className="material-symbols-outlined">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {/* Strength Meter */}
                    <div className="mt-sm space-y-xs">
                      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${strengthProps.color}`} style={{ width: passwordStrength === 0 ? '0%' : strengthProps.width }}></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-label-md font-semibold ${passwordStrength === 0 ? 'text-error' : strengthProps.textColor}`}>{passwordStrength === 0 ? 'Very Weak' : strengthProps.text}</span>
                        <span className="text-label-md text-outline">8+ chars, numbers & symbols</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="confirm-password">Confirm New Password</label>
                    <div className="relative">
                      <input 
                        className="w-full h-10 px-md border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md transition-all" 
                        id="confirm-password" 
                        placeholder="Repeat new password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type={showConfirmPassword ? "text" : "password"} 
                        required
                      />
                      <button className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-primary" onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">
                        <span className="material-symbols-outlined">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-md flex flex-wrap gap-md items-center justify-end">
                  <button className="px-md h-10 border border-outline-variant text-on-surface-variant font-bold rounded-lg hover:bg-surface-container-high active:scale-95 transition-all" type="reset">
                    Reset Form
                  </button>
                  <button 
                    className={`px-xl h-10 font-bold rounded-lg transition-all flex items-center gap-xs ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-primary-container text-on-primary-container hover:brightness-110 active:scale-95'}`} 
                    type="submit" 
                    disabled={isSubmitting || isSuccess}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : isSuccess ? (
                      <span className="material-symbols-outlined">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined">lock_reset</span>
                    )}
                    {isSubmitting ? 'Updating...' : isSuccess ? 'Updated' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
        <footer className="mt-xl pt-lg border-t border-outline-variant text-center">
          <p className="text-label-md text-outline">© 2024 Fly Courier Logistics Mastery. All security operations are logged for audit purposes.</p>
        </footer>
      </div>
    </div>
  );
}

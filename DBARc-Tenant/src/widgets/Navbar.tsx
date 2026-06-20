'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { Button } from '@/shared/ui/Button';
import { LogOut, User, Bell } from 'lucide-react';
import { TenantHeader } from '@/shared/ui/TenantHeader';

export const Navbar = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <TenantHeader />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-slate-500">
          <Bell className="h-5 w-5" />
        </Button>
        
        <div className="h-8 w-px bg-slate-200 mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 border border-slate-200">
            <User className="h-5 w-5 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

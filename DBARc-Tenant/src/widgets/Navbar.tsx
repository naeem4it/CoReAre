'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { Button } from '@/shared/ui/Button';
import { LogOut, User, Bell, Building2 } from 'lucide-react';
import { TenantHeader } from '@/shared/ui/TenantHeader';

export const Navbar = () => {
  const { user, logout, activeBusinessId, setActiveBusinessId } = useAuthStore();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 pr-3 sm:pr-4 border-r border-slate-200">
          <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight whitespace-nowrap">
            DBARC
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">
            [Digital Business Automation for Routing & Courier]
          </span>
        </div>

        <TenantHeader />
        
        {user?.shippers && user.shippers.length > 0 && (
          <div className="flex items-center gap-2 ml-4">
            <Building2 className="w-4 h-4 text-slate-500" />
            <select
              value={activeBusinessId || ''}
              onChange={(e) => setActiveBusinessId(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 text-slate-700 font-medium"
            >
              {user.shippers.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        )}
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

'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { cn } from '@/shared/lib/utils';
import { Building2 } from 'lucide-react';

export const TenantHeader = ({ className }: { className?: string }) => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
        <Building2 className="h-5 w-5 text-primary-600" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-900 leading-none mb-1">
          {user.tenantName || 'Standard Tenant'}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          {user.tenantId || 'T-ID: DEFAULT'}
        </span>
      </div>
    </div>
  );
};

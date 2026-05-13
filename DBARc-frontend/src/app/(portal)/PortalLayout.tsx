'use client';

import * as React from 'react';
import { Sidebar } from '@/widgets/Sidebar';
import { Navbar } from '@/widgets/Navbar';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';
import { redirect } from 'next/navigation';

export default function PortalLayout({
  children,
  portalRole,
}: {
  children: React.ReactNode;
  portalRole: UserRole;
}) {
  const { user, isAuthenticated } = useAuthStore();

  // Client-side guard (middleware handles server-side)
  React.useEffect(() => {
    if (!isAuthenticated) {
      redirect('/auth/login');
    }
    if (user && user.role !== portalRole && user.role !== 'SUPER_ADMIN') {
      // Redirect to correct portal if they try to switch manually
      const paths: Record<string, string> = {
        SUPER_ADMIN: '/admin',
        TENANT_ADMIN: '/courier',
        SHIPPER: '/merchant',
        RIDER: '/rider',
      };
      redirect(paths[user.role] || '/');
    }
  }, [isAuthenticated, user, portalRole]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={user.role} />
      <div className="pl-64 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-8 animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}

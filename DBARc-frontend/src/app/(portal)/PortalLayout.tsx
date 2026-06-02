'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/widgets/Sidebar';
import { Navbar } from '@/widgets/Navbar';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';

export default function PortalLayout({
  children,
  portalRole,
}: {
  children: React.ReactNode;
  portalRole: UserRole;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Client-side guard (middleware handles server-side)
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const allowedRoles = new Set<UserRole>([portalRole, 'SUPER_ADMIN']);
    if (portalRole === 'SHIPPER') {
      allowedRoles.add('TENANT_ADMIN');
    }

    if (user && !allowedRoles.has(user.role)) {
      const paths: Record<string, string> = {
        SUPER_ADMIN: '/admin',
        TENANT_ADMIN: '/courier',
        SHIPPER: '/merchant',
        RIDER: '/rider',
      };
      router.push(paths[user.role] || '/');
    }
  }, [isAuthenticated, user, portalRole, router]);

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

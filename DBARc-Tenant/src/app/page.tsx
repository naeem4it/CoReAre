'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';

const portalRoutes: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin',
  TENANT_ADMIN: '/courier',
  SHIPPER: '/merchant',
  RIDER: '/courier',
};

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(portalRoutes[user.role] ?? '/auth/login');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl shadow-2xl border border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
            Welcome to DBARc
          </CardTitle>
          <p className="text-slate-500 mt-2 text-lg">
            Secure access to your multi-tenant logistics SaaS portal.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-slate-700">
            <p>
              Access the complete DBARc dashboard by signing in with your administrator account.
            </p>
            <p className="text-sm text-slate-500">
              Enter your email and password to continue.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button className="w-full" onClick={() => router.push('/auth/login')}>
              Go to Login
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/auth/login')}>
              Sign in now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

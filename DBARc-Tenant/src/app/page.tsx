'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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
    } else {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 pt-20">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight whitespace-nowrap">
            DBARC
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">
            [Digital Business Automation for Routing & Courier]
          </span>
        </div>
      </header>

      <Card className="w-full max-w-md shadow-2xl border border-slate-200 rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <CardHeader className="text-center pt-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">
            DBARc Portal
          </CardTitle>
          <p className="text-slate-500 mt-2 text-xs sm:text-sm font-medium">
            DBARC [Digital Business Automation for Routing & Courier]
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="space-y-2 text-center text-slate-600 text-sm">
            <p>Access your workspace and logistics administration dashboard.</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 inline-flex items-center justify-center gap-2">
                Sign In to Portal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

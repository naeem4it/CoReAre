'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { DBarcLogo } from '@/shared/ui/DBarcLogo';

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
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#0B0F19] text-white relative overflow-hidden">
      {/* Option 1 Ambient Glow */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] opacity-25 pointer-events-none blur-[120px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #3B5BDB 0%, #0EA5E9 40%, transparent 70%)',
        }}
      />

      <Card className="w-full max-w-md shadow-2xl shadow-indigo-950/70 border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/90 backdrop-blur-xl relative z-10">
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
        <div className="text-center pt-8 pb-3 px-8 flex flex-col items-center">
          <div className="mb-4">
            <DBarcLogo size={52} variant="dark" subtitle="Courier Manager" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            DBARc Portal
          </h1>
          <p className="text-slate-400 mt-1.5 text-xs sm:text-sm font-medium">
            Next-Gen Multi-Tenant Logistics & Management System
          </p>
        </div>
        <CardContent className="space-y-6 pb-8 px-8">
          <div className="text-center text-slate-400 text-xs sm:text-sm">
            <p>Access your workspace and logistics administration dashboard.</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full h-11 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 inline-flex items-center justify-center gap-2 cursor-pointer">
                Sign In to Terminal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

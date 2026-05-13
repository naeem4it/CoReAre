'use client';

import * as React from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole } from '@/shared/model/auth.store';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Package, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');
      const response = await axios.post(`${apiRoot}/admin/login`, {
        email,
        password,
      });

      const loginData = response.data?.data;
      const user = loginData?.user;
      const accessToken = loginData?.accessToken || loginData?.token;

      const roleCodes = Array.isArray(user?.roles) ? user.roles.map((role: any) => role.code) : [];
      const roleMap: Record<string, UserRole> = {
        'strapi-super-admin': 'SUPER_ADMIN',
        'strapi-tenant-admin': 'TENANT_ADMIN',
        'strapi-shipper': 'SHIPPER',
        'strapi-rider': 'RIDER',
      };
      const normalizedRole = roleCodes.includes('strapi-super-admin')
        ? 'SUPER_ADMIN'
        : roleMap[roleCodes.find((code) => roleMap[code]) ?? ''] ||
          (user?.role_type as UserRole) ||
          'SUPER_ADMIN';

      const userData = {
        id: user?.id?.toString() ?? '',
        email: user?.email ?? email,
        name:
          user?.username ||
          `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim() ||
          user?.email ||
          email,
        role: normalizedRole,
        tenantId: user?.tenant?.id?.toString(),
        tenantName: user?.tenant?.name,
      };

      setAuth(userData, accessToken, accessToken);

      const redirects: Record<string, string> = {
        SUPER_ADMIN: '/admin',
        TENANT_ADMIN: '/courier',
        SHIPPER: '/merchant',
        RIDER: '/rider',
      };

      router.push(redirects[normalizedRole] || '/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-200/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-200/20 blur-[120px] rounded-full" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-100 rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary-600 to-blue-400" />
        <CardHeader className="space-y-4 pt-10 pb-6 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-600/30">
              <Package className="h-10 w-10" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
              DBARc
            </CardTitle>
            <p className="text-slate-500 mt-2 font-medium">
              Enterprise Logistics SaaS Portal
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-9 h-4 w-4 text-slate-400 z-10" />
                <Input
                  label="Work Email"
                  placeholder="admin@dbarc.com"
                  className="pl-10 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-9 h-4 w-4 text-slate-400 z-10" />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-primary-600 font-semibold hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary-600/20"
              isLoading={isLoading}
            >
              Sign In <ArrowRight className="ml-2 h-5 w-5" />
            </Button>


          </form>
        </CardContent>
      </Card>
    </div>
  );
}

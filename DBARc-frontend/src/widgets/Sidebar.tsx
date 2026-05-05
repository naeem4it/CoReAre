'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Package, 
  Truck, 
  ShieldCheck,
  Building2,
  FileText,
  BarChart3
} from 'lucide-react';
import { UserRole } from '@/shared/model/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const MENU_CONFIG: Record<UserRole | 'DEFAULT', NavItem[]> = {
  SUPER_ADMIN: [
    { label: 'System Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
    { label: 'System Logs', href: '/admin/logs', icon: ShieldCheck },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  TENANT_ADMIN: [
    { label: 'Dashboard', href: '/courier', icon: LayoutDashboard },
    { label: 'Shipments', href: '/courier/shipments', icon: Package },
    { label: 'Settlements', href: '/courier/settlements', icon: BadgeDollarSign },
    { label: 'Riders', href: '/courier/riders', icon: Truck },
    { label: 'Clients', href: '/courier/clients', icon: Users },
    { label: 'Reports', href: '/courier/reports', icon: BarChart3 },
    { label: 'Settings', href: '/courier/settings', icon: Settings },
  ],
  SHIPPER: [
    { label: 'Dashboard', href: '/merchant', icon: LayoutDashboard },
    { label: 'Create Order', href: '/merchant/new-order', icon: Package },
    { label: 'Order History', href: '/merchant/orders', icon: FileText },
    { label: 'Finance', href: '/merchant/finance', icon: BarChart3 },
    { label: 'Settings', href: '/merchant/settings', icon: Settings },
  ],
  RIDER: [],
  DEFAULT: []
};

export const Sidebar = ({ role }: { role: UserRole }) => {
  const pathname = usePathname();
  const menuItems = MENU_CONFIG[role] || MENU_CONFIG.DEFAULT;

  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0 z-40 border-r border-white/5">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
          <Package className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">DBARc</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                  : 'hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Support Plan</p>
          <p className="text-sm text-white font-bold mb-3">Enterprise Gold</p>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 w-3/4" />
          </div>
        </div>
      </div>
    </aside>
  );
};

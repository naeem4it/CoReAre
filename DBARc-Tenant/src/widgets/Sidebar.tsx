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
  BarChart3,
  BadgeDollarSign,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '@/shared/model/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const MERCHANT_SUBMENU: NavItem[] = [
  { label: 'Pickup Locations', href: '/merchant/pickup-locations', icon: Package },
  { label: 'Book Shipment', href: '/merchant/book-shipment', icon: Package },
  { label: 'Reverse Shipment', href: '/merchant/reverse-shipment', icon: Package },
  { label: 'Upload Shipment', href: '/merchant/upload-shipment', icon: Package },
  { label: 'Bulk Shipment', href: '/merchant/load-sheet', icon: Package },
  { label: 'Customer Report', href: '/merchant/customer-report', icon: FileText },
  { label: 'Dispatch Report', href: '/merchant/dispatch-report', icon: FileText },
  { label: 'Shipper Advise', href: '/merchant/shipper-advise', icon: FileText },
  { label: 'Customer Invoice', href: '/merchant/customer-invoice', icon: FileText },
  { label: 'Monthly Invoice', href: '/merchant/monthly-invoice', icon: FileText },
  { label: 'Change Password', href: '/merchant/change-password', icon: Settings },
  { label: 'APIs Docs', href: '/merchant/apis-docs', icon: ShieldCheck },
];

const COURIER_SHIPMENTS_SUBMENU: NavItem[] = [
  { label: 'Order List', href: '/courier/shipments', icon: Package },
  { label: 'Book Shipment', href: '/courier/shipments/book', icon: Package },
];

const SUPER_ADMINISTRATION_SUBMENU: NavItem[] = [
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Role Definition', href: '/admin/roles', icon: ShieldCheck },
  { label: 'Plans', href: '/admin/plans', icon: FileText },
];

const COURIER_ADMINISTRATION_SUBMENU: NavItem[] = [
  { label: 'User Management', href: '/courier/users', icon: Users },
  { label: 'Role Definition', href: '/courier/roles', icon: ShieldCheck },
];

const MERCHANT_ADMINISTRATION_SUBMENU: NavItem[] = [
  { label: 'User Management', href: '/merchant/users', icon: Users },
  { label: 'Role Definition', href: '/merchant/roles', icon: ShieldCheck },
];

const MENU_CONFIG: Record<UserRole | 'DEFAULT', NavItem[]> = {
  SUPER_ADMIN: [
    { label: 'System Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Administration', href: '/admin/users', icon: ShieldCheck, children: SUPER_ADMINISTRATION_SUBMENU },
    { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
    { label: 'Courier Portal', href: '/courier', icon: Truck },
    { label: 'Merchant Portal', href: '/merchant', icon: Package, children: MERCHANT_SUBMENU },
    { label: 'Riders App', href: '/rider', icon: Users },
    { label: 'System Logs', href: '/admin/logs', icon: ShieldCheck },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  TENANT_ADMIN: [
    { label: 'Dashboard', href: '/courier', icon: LayoutDashboard },
    { label: 'Administration', href: '/courier/roles', icon: ShieldCheck, children: COURIER_ADMINISTRATION_SUBMENU },
    { label: 'Shipments', href: '/courier/shipments', icon: Package, children: COURIER_SHIPMENTS_SUBMENU },
    { label: 'Settlements', href: '/courier/settlements', icon: BadgeDollarSign },

    { label: 'Riders', href: '/courier/riders', icon: Truck },
    { label: 'Clients', href: '/courier/clients', icon: Users },
    { label: 'Merchant Portal', href: '/merchant', icon: Package, children: MERCHANT_SUBMENU },
    { label: 'Reports', href: '/courier/reports', icon: BarChart3 },
    { label: 'Settings', href: '/courier/settings', icon: Settings },
  ],
  SHIPPER: [
    { label: 'Dashboard', href: '/merchant', icon: LayoutDashboard },
    { label: 'Administration', href: '/merchant/roles', icon: ShieldCheck, children: MERCHANT_ADMINISTRATION_SUBMENU },
    { label: 'Merchant Portal', href: '/merchant', icon: Package, children: MERCHANT_SUBMENU },
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
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  React.useEffect(() => {
    const activeParent = menuItems.find(item => item.children?.some(child => pathname === child.href));
    if (activeParent) {
      setOpenMenu(activeParent.href);
    } else {
      setOpenMenu(null);
    }
  }, [pathname, menuItems]);

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href;
    const hasChildren = Boolean(item.children?.length);
    const isOpen = hasChildren && openMenu === item.href;

    return (
      <div key={item.href} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={item.href}
            className={cn(
              'flex items-center gap-3 flex-1 px-4 py-3 rounded-xl transition-all duration-200 group',
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

          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setOpenMenu(openMenu === item.href ? null : item.href);
              }}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200',
                isOpen ? 'bg-white/10 text-white hover:bg-white/15' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : null}
        </div>

        {hasChildren && isOpen ? (
          <div className="ml-8 space-y-1">
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm',
                    childActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <child.icon className={cn(
                    'h-4 w-4',
                    childActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  )} />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0 z-40 border-r border-white/5">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
          <Package className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">DBARc</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map(renderNavItem)}
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

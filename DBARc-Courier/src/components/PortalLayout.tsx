'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/shared/api/api-client';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { ChevronDown, Building2, MapPin, User, LogOut, Settings, Key } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const { user, activeBusinessId, activeOfficeId, setActiveBusinessId, setActiveOfficeId, refreshUser } = useAuth();
  const { businessName, logoUrl } = useTenant();

  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dbarc-token');
    if (!token) {
      router.push('/login');
    } else {
      apiClient.get('/users/me?populate=shipper,offices,role_definition,tenant.logo')
        .then((res) => {
          const userData = res.data;
          const roleType = (
            userData?.role?.type || 
            userData?.role_type || 
            userData?.role?.name || 
            (typeof userData?.role === 'string' ? userData?.role : '')
          ).toString().toLowerCase();

          const isSuperAdmin = 
            roleType.includes('super_admin') || 
            roleType.includes('super admin') ||
            userData?.role_type === 'SUPER_ADMIN' ||
            userData?.isAdminUser;

          if (isSuperAdmin) {
            localStorage.removeItem('token');
            localStorage.removeItem('dbarc-token');
            localStorage.removeItem('user');
            router.push('/login');
            return;
          }

          localStorage.setItem('user', JSON.stringify(userData));
          refreshUser();
          setIsAuthenticated(true);
        })
        .catch((err) => {
          console.warn('Failed to fetch user context:', err.message);
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('dbarc-token');
            localStorage.removeItem('user');
            router.push('/login');
            return;
          }
          const existingUserStr = localStorage.getItem('user');
          if (existingUserStr) {
            refreshUser();
            setIsAuthenticated(true);
          } else {
            router.push('/login');
          }
        });
    }
  }, [router]);

  const isShipperUser = React.useMemo(() => {
    if (!user) return false;
    if (user.shipper_roles && Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0) return true;
    const roleType = (
      user.role?.type || 
      user.role_type || 
      user.role?.name || 
      (typeof user.role === 'string' ? user.role : '')
    ).toString().toLowerCase();
    if (roleType.includes('shipper')) return true;
    if (user.user_type === 'shipper' || user.type === 'shipper') return true;
    if (user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : !!user.shipper)) {
      const hasCourierRole = Array.isArray(user.role_definition) && user.role_definition.some((r: any) => 
        ['admin', 'courier', 'super admin', 'rider', 'front desk'].some(c => (r.role_name || '').toLowerCase().includes(c))
      );
      if (!hasCourierRole) return true;
    }
    const email = (user.email || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    if (email.includes('shipper') || username.includes('shipper')) return true;
    return false;
  }, [user]);

  const userRoles = React.useMemo(() => {
    if (!user) return [];
    if (user.shipper_roles && Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0) {
      return user.shipper_roles;
    }
    if (isShipperUser) {
      return ['Shipper Admin'];
    }
    return Array.isArray(user.role_definition)
      ? user.role_definition.map((r: any) => r.role_name)
      : [];
  }, [user, isShipperUser]);

  const showShipmentBooking = React.useMemo(() => {
    if (!user) return false;
    return true;
  }, [user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* TopNavBar */}
      <header className="bg-surface-container-lowest dark:bg-surface-dim h-[64px] w-full sticky top-0 z-50 border-b border-outline-variant dark:border-outline shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between px-4 md:px-6 w-full max-w-[1920px] mx-auto h-full gap-md">
          <div className="flex items-center gap-md">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 object-contain" />
            ) : (
              <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">{businessName}</span>
            )}
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-[600px] relative hidden md:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary-container transition-all outline-none"
              placeholder="Search shipments, fleet, or orders..."
              type="text"
            />
          </div>

          <div className="flex items-center gap-sm">
            {/* Shippers Switcher */}
            {user?.shipper && Array.isArray(user.shipper) && user.shipper.length > 0 && (
              <div className="relative group mr-2">
                <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user.shipper.find((s: any) => s.id === activeBusinessId)?.name || 'Select Shipper'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    {user.shipper.map((biz: any) => (
                      <button
                        key={biz.id}
                        onClick={() => setActiveBusinessId(biz.id)}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          activeBusinessId === biz.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {biz.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Offices Switcher */}
            {user?.offices && Array.isArray(user.offices) && user.offices.length > 0 && (
              <div className="relative group mr-2">
                <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user.offices.find((o: any) => o.id === activeOfficeId)?.name || 'Select Office'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    {user.offices.map((office: any) => (
                      <button
                        key={office.id}
                        onClick={() => setActiveOfficeId(office.id)}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          activeOfficeId === office.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {office.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors duration-200 active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors duration-200 active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined text-on-surface-variant">help</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-full hover:bg-surface-container-low transition-colors duration-200 active:scale-95 cursor-pointer border border-transparent hover:border-outline-variant"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-on-surface">{user?.fullName || user?.username || 'Employee'}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{userRoles[0] || 'User'}</p>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              </button>
              
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-outline-variant bg-slate-50">
                    <p className="font-bold text-sm text-on-surface truncate">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/auth/change-password" onClick={() => setProfileDropdownOpen(false)} className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors">
                      <Key className="w-4 h-4 text-primary" /> Change Password
                    </Link>
                  </div>
                  <div className="p-2 border-t border-outline-variant">
                    <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('dbarc-token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error-container/20 hover:text-error rounded-lg flex items-center gap-2 transition-colors font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)] max-w-[1920px] w-full mx-auto flex-1">
        {/* SideNavBar */}
        <aside className="hidden lg:flex flex-col p-sm gap-xs w-64 border-r border-outline-variant dark:border-outline bg-surface dark:bg-surface-dim shrink-0 h-[calc(100vh-64px)] sticky top-[64px] overflow-y-auto custom-scrollbar">
          <React.Suspense fallback={
            <div className="h-48 flex items-center justify-center text-outline">
              <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
            </div>
          }>
            <SideNavigation showShipmentBooking={showShipmentBooking} />
          </React.Suspense>
          <div className="mt-auto p-sm">
            <div className="bg-surface-container-low rounded-xl p-md border border-outline-variant">
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Storage Status</p>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full mb-2">
                <div className="bg-primary w-3/4 h-full rounded-full"></div>
              </div>
              <p className="text-[10px] font-medium text-outline">75% capacity reached</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-lg overflow-y-auto custom-scrollbar bg-slate-50">
          {children}
        </main>
      </div>

      {/* Mobile Bottom NavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-outline-variant flex items-center justify-around z-50">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 cursor-pointer ${pathname === '/' ? 'text-primary' : 'text-on-surface-variant'
            }`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-semibold">Home</span>
        </Link>
        <Link
          href="/tracking"
          className={`flex flex-col items-center gap-1 cursor-pointer ${pathname.startsWith('/tracking') ? 'text-primary' : 'text-on-surface-variant'
            }`}
        >
          <span className="material-symbols-outlined">location_on</span>
          <span className="text-[10px] font-medium">Track</span>
        </Link>
        <Link
          href="/orders"
          className={`flex flex-col items-center gap-1 cursor-pointer ${pathname.startsWith('/orders') ? 'text-primary' : 'text-on-surface-variant'
            }`}
        >
          <span className="material-symbols-outlined">local_shipping</span>
          <span className="text-[10px] font-medium">Orders</span>
        </Link>
        <Link
          href="/reports/customer"
          className={`flex flex-col items-center gap-1 cursor-pointer ${pathname.startsWith('/reports') ? 'text-primary' : 'text-on-surface-variant'
            }`}
        >
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="text-[10px] font-medium">Reports</span>
        </Link>
      </nav>

      {/* FAB for Quick Actions */}
      {showShipmentBooking && (
        <Link
          href="/shipments/book"
          title="Book New Shipment (Quick Action)"
          aria-label="Book New Shipment"
          className="fixed bottom-24 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all lg:bottom-8 z-40 cursor-pointer group"
        >
          <span className="material-symbols-outlined text-[32px]">add</span>
          <span className="absolute right-16 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden sm:block">
            Book New Shipment
          </span>
        </Link>
      )}
    </div>
  );
}

function SideNavigation({ showShipmentBooking }: { showShipmentBooking: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pathname.startsWith('/reports') || pathname.startsWith('/invoices')) {
      setExpandedMenu('reports');
    } else if (pathname.startsWith('/order-api') || pathname.startsWith('/stitch-unified') || pathname.startsWith('/velocity-corporate')) {
      setExpandedMenu('interfaces');
    } else if (pathname.startsWith('/shipments/book') || pathname.startsWith('/orders') || pathname.startsWith('/bulk-shipment') || pathname.startsWith('/cargo-distribution')) {
      setExpandedMenu('shipment');
    } else if (pathname.startsWith('/administration')) {
      setExpandedMenu('admin');
    } else if (pathname.startsWith('/operations')) {
      setExpandedMenu('operations');
    } else if (pathname.startsWith('/customer-service')) {
      setExpandedMenu('customerservice');
    }
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const isShipper = React.useMemo(() => {
    if (!user) return false;
    if (user.shipper_roles && Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0) return true;
    const roleType = (
      user.role?.type || 
      user.role_type || 
      user.role?.name || 
      (typeof user.role === 'string' ? user.role : '')
    ).toString().toLowerCase();
    if (roleType.includes('shipper')) return true;
    if (user.user_type === 'shipper' || user.type === 'shipper') return true;
    if (user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : !!user.shipper)) {
      const hasCourierRole = Array.isArray(user.role_definition) && user.role_definition.some((r: any) => 
        ['admin', 'courier', 'super admin', 'rider', 'front desk'].some(c => (r.role_name || '').toLowerCase().includes(c))
      );
      if (!hasCourierRole) return true;
    }
    const email = (user.email || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    if (email.includes('shipper') || username.includes('shipper')) return true;
    return false;
  }, [user]);

  const isActive = (path: string) => pathname === path;

  const NavLink = ({ href, icon, label, exact = true }: { href: string, icon: string, label: string, exact?: boolean }) => {
    const active = exact ? isActive(href) : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${
          active
            ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
            : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
        <span className="font-label-md text-label-md">{label}</span>
      </Link>
    );
  };

  const renderCourierReportsAndInvoices = () => (
    <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
      <button onClick={() => toggleMenu('reports')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="font-label-md text-label-md">Reports & Invoices</span>
        </div>
        <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'reports' ? 'rotate(180deg)' : '' }}>expand_more</span>
      </button>
      {expandedMenu === 'reports' && (
        <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
          <NavLink href="/reports/customer" icon="assignment_ind" label="Customer Report" />
          <NavLink href="/reports/dispatch" icon="local_shipping" label="Dispatch Report" />
          <NavLink href="/reports/monthly-invoice" icon="receipt_long" label="Monthly Invoice" />
          <NavLink href="/invoices/customer" icon="request_quote" label="Customer Invoice" />
          <NavLink href="/invoices/cod-settlement" icon="price_check" label="COD Settlement" />
        </div>
      )}
    </div>
  );

  const renderCourierAdministration = () => (
    <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
      <button onClick={() => toggleMenu('admin')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined">shield</span>
          <span className="font-label-md text-label-md">Administration</span>
        </div>
        <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'admin' ? 'rotate(180deg)' : '' }}>expand_more</span>
      </button>
      
      {expandedMenu === 'admin' && (
        <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center p-xs font-bold text-outline uppercase tracking-wider text-[10px] select-none">
            Courier Management
          </div>
          
          <Link
            href="/administration/plans"
            className={`flex items-center gap-md p-sm font-semibold rounded-lg cursor-pointer active:opacity-80 transition-all ${
              pathname === '/administration/plans'
                ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">assignment</span>
            <span className="font-label-md text-label-md">Tariff Plans</span>
          </Link>

          <Link
            href="/administration/employees?type=shipper"
            className={`flex items-center gap-md p-sm font-semibold rounded-lg cursor-pointer active:opacity-80 transition-all ${
              pathname === '/administration/employees' && !pathname.includes('type=courier')
                ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span className="font-label-md text-label-md">Shippers Directory</span>
          </Link>

          <Link
            href="/administration/employees?type=courier"
            className="flex items-center gap-md p-sm font-semibold rounded-lg cursor-pointer active:opacity-80 transition-all text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[20px]">badge</span>
            <span className="font-label-md text-label-md">Courier Staff</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <nav className="flex flex-col gap-1">
      {/* 1. Dashboard */}
      <NavLink href="/" icon="dashboard" label="Dashboard" />
      <NavLink href="/tracking" icon="location_on" label="Tracking" />

      {isShipper ? (
        /* ==================== SHIPPER MERCHANT MENU (EXCLUSIVE) ==================== */
        <>
          <NavLink href="/orders" icon="list_alt" label="Booked Orders" />
          <NavLink href="/shipments/book?tab=manual" icon="add_box" label="Book Order" />
          <NavLink href="/load-sheet" icon="route" label="Load Sheet" />
          <NavLink href="/pickup-information" icon="local_shipping" label="Pickup Info" />
          <NavLink href="/shipper-advise" icon="quick_reference_all" label="Shipper Advice" />

          {/* Booking & Bulk Section */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <button onClick={() => toggleMenu('shipment')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">inventory_2</span>
                <span className="font-label-md text-label-md">Shipment Booking</span>
              </div>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'shipment' ? 'rotate(180deg)' : '' }}>expand_more</span>
            </button>
            {expandedMenu === 'shipment' && (
              <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <NavLink href="/shipments/book?tab=manual" icon="local_shipping" label="Single Booking" />
                <NavLink href="/shipments/book?tab=bulk" icon="upload_file" label="Bulk CSV Upload" />
                <NavLink href="/cargo-distribution" icon="route" label="Cargo Dispatch" />
              </div>
            )}
          </div>

          {/* Billing & Invoices Section */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <button onClick={() => toggleMenu('reports')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">receipt_long</span>
                <span className="font-label-md text-label-md">Billing &amp; COD</span>
              </div>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'reports' ? 'rotate(180deg)' : '' }}>expand_more</span>
            </button>
            {expandedMenu === 'reports' && (
              <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <NavLink href="/invoices/customer" icon="request_quote" label="Customer Invoices" />
                <NavLink href="/invoices/cod-settlement" icon="price_check" label="COD Settlement" />
                <NavLink href="/reports/customer" icon="assignment_ind" label="Customer Report" />
              </div>
            )}
          </div>

          {/* E-Commerce & Storefront Section */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <button onClick={() => toggleMenu('interfaces')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">integration_instructions</span>
                <span className="font-label-md text-label-md">Store &amp; Integrations</span>
              </div>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'interfaces' ? 'rotate(180deg)' : '' }}>expand_more</span>
            </button>
            {expandedMenu === 'interfaces' && (
              <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <NavLink href="/order-api" icon="api" label="Order API &amp; Webhook" />
                <NavLink href="/store" icon="shopping_bag" label="Sample Shirt Store" />
              </div>
            )}
          </div>

          {/* Store Team Section (Only Sub-Accounts for this Shipper) */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <NavLink href="/administration/employees?type=team" icon="group" label="My Store Team" />
          </div>
        </>
      ) : (
        /* ==================== COURIER OPERATIONS MENU (EXCLUSIVE) ==================== */
        <>
          {/* 2. Operation */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <button onClick={() => toggleMenu('operations')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">move_to_inbox</span>
                <span className="font-label-md text-label-md">Operation</span>
              </div>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'operations' ? 'rotate(180deg)' : '' }}>expand_more</span>
            </button>
            {expandedMenu === 'operations' && (
              <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <NavLink href="/operations/arrivals" icon="move_to_inbox" label="Arrivals" />
                <NavLink href="/operations/bulk-arrivals" icon="upload_file" label="Bulk Arrivals" />
                <NavLink href="/operations/manifestation" icon="inventory" label="Manifestation" />
                <NavLink href="/operations/demanifestation" icon="unarchive" label="DeManifestation" />
                <NavLink href="/operations/delivery-sheet" icon="assignment" label="Delivery Sheet" />
                <NavLink href="/operations/de-runsheet" icon="payments" label="De-Runsheet (Cashier)" />
              </div>
            )}
          </div>

          {/* 3. Customer Services */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <button onClick={() => toggleMenu('customerservice')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">support_agent</span>
                <span className="font-label-md text-label-md">Customer Services</span>
              </div>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'customerservice' ? 'rotate(180deg)' : '' }}>expand_more</span>
            </button>
            {expandedMenu === 'customerservice' && (
              <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <NavLink href="/customer-service/arrival-summary" icon="table_chart" label="Arrival Summary" />
                <NavLink href="/customer-service/riders-summary" icon="badge" label="Riders Summary" />
                <NavLink href="/customer-service/order-report" icon="analytics" label="Order Report" />
              </div>
            )}
          </div>

          {/* 4. Reports & Invoices */}
          {renderCourierReportsAndInvoices()}

          {/* 5. Administration */}
          {renderCourierAdministration()}
        </>
      )}

      {/* Settings */}
      <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
        <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-md text-label-md">Settings</span>
        </a>
      </div>
    </nav>
  );
}

'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/shared/api/api-client';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { ChevronDown, Building2, MapPin, LogOut, Key, CreditCard } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const { user, activeBusinessId, activeOfficeId, isShipper, isShipperAdmin, isShipperEmployee, setActiveBusinessId, setActiveOfficeId, refreshUser } = useAuth();
  const { businessName, logoUrl } = useTenant();

  // Enforce route protection: Shipper Employee cannot access any /administration routes
  React.useEffect(() => {
    if (isShipperEmployee && pathname?.startsWith('/administration')) {
      router.push('/');
    }
  }, [isShipperEmployee, pathname, router]);

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
          // Reset any previous activeBusinessId/activeOfficeId so user gets courier context immediately
          localStorage.removeItem('activeBusinessId');
          localStorage.removeItem('activeOfficeId');
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
  }, [router, refreshUser]);

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
      const hasCourierRole = Array.isArray(user.role_definition) && user.role_definition.some((r: { role_name?: string }) =>
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
      ? user.role_definition.map((r: { role_name?: string }) => r.role_name || '')
      : [];
  }, [user, isShipperUser]);

  const userInitials = React.useMemo(() => {
    if (isShipperUser) {
      const shipperName = (user?.shipper && Array.isArray(user.shipper) && user.shipper[0]?.name) || '';
      if (shipperName) {
        const parts = shipperName.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return shipperName.slice(0, 2).toUpperCase();
      }
    }
    const name = user?.fullName || user?.username || 'WC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [user, isShipperUser]);

  // Quick Action FAB for shipment booking
  const showShipmentBooking = true;

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
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">{businessName}</span>
                <span className="text-xs font-semibold text-slate-500 hidden xl:inline">
                  [Digital Business Automation for Routing & Courier]
                </span>
              </div>
            )}
            {isShipperUser && (
              <span className="bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-xs tracking-wider shrink-0">
                Merchant
              </span>
            )}
          </div>

          {/* Welcome Message for Shipper */}
          {isShipperUser && (
            <div className="hidden xl:flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <span className="text-slate-400">Welcome,</span>
              <span className="font-extrabold text-slate-900 tracking-tight">
                {(user?.shipper && Array.isArray(user.shipper) && user.shipper[0]?.name) || user?.fullName || user?.username || 'Wears Clothing'}!
              </span>
            </div>
          )}

          {/* Global Search */}
          <div className="flex-1 max-w-[500px] relative hidden md:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full bg-surface-container-low border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary-container transition-all outline-none"
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
                    {user.shipper.find((s: { id: number; name: string }) => s.id === activeBusinessId)?.name || 'Select Shipper'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    {user.shipper.map((biz: { id: number; name: string }) => (
                      <button
                        key={biz.id}
                        onClick={() => setActiveBusinessId(biz.id)}
                        className={`w-full text-left px-4 py-2 text-sm ${activeBusinessId === biz.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
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
                    {user.offices.find((o: { id: number; name: string }) => o.id === activeOfficeId)?.name || 'Select Office'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    {user.offices.map((office: { id: number; name: string }) => (
                      <button
                        key={office.id}
                        onClick={() => setActiveOfficeId(office.id)}
                        className={`w-full text-left px-4 py-2 text-sm ${activeOfficeId === office.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
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
                <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-800 bg-[#0c4a42] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {userInitials}
                </div>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-outline-variant bg-slate-50">
                    <p className="font-bold text-sm text-on-surface truncate">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {(isShipperAdmin || isShipper) && (
                      <Link
                        href="/profile/payment-method"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 text-primary" /> Configure Payment Method
                      </Link>
                    )}
                    <Link href="/auth/change-password" onClick={() => setProfileDropdownOpen(false)} className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors">
                      <Key className="w-4 h-4 text-primary" /> Change Password
                    </Link>
                  </div>
                  <div className="p-2 border-t border-outline-variant">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        sessionStorage.clear();
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
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = React.useMemo(() => {
    if (!pathname) return false;

    const [hrefPath, hrefQuery] = href.split('?');

    // 1. Pathname matching
    let isPathMatch = false;
    if (hrefPath === '/') {
      isPathMatch = pathname === '/';
    } else if (exact) {
      isPathMatch = pathname === hrefPath;
    } else {
      isPathMatch = pathname === hrefPath || pathname.startsWith(hrefPath + '/');
    }

    if (!isPathMatch) return false;

    // 2. Query parameter matching if href defines specific parameters
    if (hrefQuery) {
      const targetParams = new URLSearchParams(hrefQuery);
      for (const [key, value] of targetParams.entries()) {
        const currentVal = searchParams?.get(key);

        // Special handling for booking tab:
        // /shipments/book defaults to 'manual' if tab param is missing
        if (key === 'tab') {
          if (value === 'manual') {
            if (currentVal && currentVal !== 'manual') return false;
          } else {
            if (currentVal !== value) return false;
          }
        } else {
          if (currentVal !== value) return false;
        }
      }
      return true;
    }

    // 3. Fallbacks for links without query params
    // If href is /shipments/book without query, don't highlight if on ?tab=bulk
    if (hrefPath === '/shipments/book') {
      const currentTab = searchParams?.get('tab');
      if (currentTab === 'bulk') return false;
    }

    // If href is /administration/employees without query, don't match if ?type=... is present
    if (hrefPath === '/administration/employees') {
      const currentType = searchParams?.get('type');
      if (currentType) return false;
    }

    return true;
  }, [href, pathname, searchParams, exact]);

  return (
    <Link
      href={href}
      className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${active
        ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-primary dark:text-primary-fixed shadow-2xs font-extrabold'
        : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
        }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-label-md text-label-md">{label}</span>
    </Link>
  );
}

function SideNavigation({ showShipmentBooking }: { showShipmentBooking: boolean }) {
  const pathname = usePathname();
  const { isShipper, isShipperAdmin, isShipperEmployee } = useAuth();
  const isCourierAdmin = !isShipper && !isShipperAdmin && !isShipperEmployee;

  const activeMenuFromPath = React.useMemo(() => {
    if (isShipper && (pathname.startsWith('/financials') || pathname.startsWith('/invoices'))) {
      return 'reports';
    } else if (!isShipper && pathname.startsWith('/invoices/cod-settlement')) {
      return 'financials';
    } else if (
      pathname.startsWith('/reports') ||
      pathname.startsWith('/invoices') ||
      pathname.startsWith('/customer-service')
    ) {
      return 'reports';
    } else if (
      pathname.startsWith('/order-api') ||
      pathname.startsWith('/stitch-unified') ||
      pathname.startsWith('/velocity-corporate') ||
      pathname.startsWith('/store')
    ) {
      return 'interfaces';
    } else if (
      pathname.startsWith('/shipments/book') ||
      pathname.startsWith('/bulk-shipment') ||
      pathname.startsWith('/cargo-distribution')
    ) {
      return 'shipment';
    } else if (
      pathname === '/operations/de-runsheet' ||
      pathname === '/administration/expenses' ||
      pathname === '/administration/plans' ||
      pathname.startsWith('/administration/plans') ||
      pathname.startsWith('/financials')
    ) {
      return isShipper ? 'reports' : 'financials';
    } else if (pathname.startsWith('/administration')) {
      return 'admin';
    } else if (pathname.startsWith('/operations')) {
      return 'operations';
    }
    return null;
  }, [pathname, isShipper]);

  const [toggledMenu, setToggledMenu] = React.useState<string | null>(null);
  const [lastPath, setLastPath] = React.useState<string>(pathname);

  // When pathname changes, synchronize state during render
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setToggledMenu(null);
  }

  const expandedMenu = toggledMenu !== null ? (toggledMenu === '__none__' ? null : toggledMenu) : activeMenuFromPath;

  const toggleMenu = (menu: string) => {
    setToggledMenu(expandedMenu === menu ? '__none__' : menu);
  };

  const renderCourierReportsAndInvoices = () => (
    <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
      <button onClick={() => toggleMenu('reports')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="font-label-md text-label-md">Reports</span>
        </div>
        <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'reports' ? 'rotate(180deg)' : '' }}>expand_more</span>
      </button>
      {expandedMenu === 'reports' && (
        <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
          <NavLink href="/reports/customer" icon="assignment_ind" label="Customer Report" />
          <NavLink href="/reports/dispatch" icon="local_shipping" label="Dispatch Report" />
          <NavLink href="/customer-service/arrival-summary" icon="table_chart" label="Arrival Summary" />
          <NavLink href="/customer-service/riders-summary" icon="badge" label="Riders Summary" />
          <NavLink href="/customer-service/order-report" icon="analytics" label="Order Report" />
          <NavLink href="/reports/profit-loss" icon="balance" label="Profit & Loss Statement" />
          <NavLink href="/reports/expenses" icon="query_stats" label="Executive Expense Report" />
          <NavLink href="/reports/monthly-invoice" icon="receipt_long" label="Monthly Invoice" />
          <NavLink href="/invoices/customer" icon="request_quote" label="Customer Invoice" />
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

          <NavLink href="/administration/zones" icon="map" label="Zone Setup" />
          <NavLink href="/administration/routes" icon="route" label="Route Setup" />
          <NavLink href="/administration/offices" icon="domain" label="Offices & Hubs" />

          {isCourierAdmin && (
            <NavLink href="/administration/sales-person" icon="badge" label="Sales Person" />
          )}

          {isCourierAdmin && (
            <NavLink href="/administration/shippers" icon="storefront" label="Shipper Setup" />
          )}

          {isCourierAdmin && (
            <NavLink href="/administration/employees?type=shipper" icon="local_shipping" label="Shippers Directory" />
          )}

          <NavLink href="/administration/employees?type=courier" icon="badge" label="Courier Staff" />
          <NavLink href="/administration/self-service" icon="local_shipping" label="Self Service Areas (2PL)" />
          <NavLink href="/administration/tpl-setup" icon="hub" label="3PL Partner Setup" />
          <NavLink href="/administration/shipper-tpl" icon="alt_route" label="Shipper 3PL Setup" />
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
          <NavLink href="/orders" icon="list_alt" label="Orders List" />

          {showShipmentBooking && (
            <NavLink href="/shipments/book?tab=manual" icon="add_box" label="Book Now" />
          )}

          <NavLink href="/shipments/book?tab=bulk" icon="upload_file" label="Bulk Orders" />
          <NavLink href="/airway-bill" icon="description" label="Airway Bill" />
          <NavLink href="/load-sheet" icon="route" label="Load Sheet" />
          <NavLink href="/pickup-information" icon="local_shipping" label="Pickup Info" />
          <NavLink href="/shipper-advise" icon="quick_reference_all" label="Shipper Advice" />

          {/* Booking & Bulk Section (Hidden if showShipmentBooking is false) */}
          {/* {showShipmentBooking && (
            <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
              <button onClick={() => toggleMenu('shipment')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined">inventory_2</span>
                  <span className="font-label-md text-label-md">Shipment Booking</span>
                </div>
                <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'shipment' ? 'rotate(180deg)' : '' }}>expand_more</span>
              </button>

            </div>
          )} */}

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
                <NavLink href="/financials/shipper-invoices" icon="receipt_long" label="Invoices" />
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

          {/* Store Team Section (Only for Shipper Admin, hidden for Shipper Employee) */}
          {!isShipperEmployee && (
            <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
              <NavLink href="/administration/employees?type=team" icon="group" label="My Store Team" />
            </div>
          )}
        </>
      ) : (
        /* ==================== COURIER OPERATIONS MENU (EXCLUSIVE) ==================== */
        <>
          <NavLink href="/shipments/book" icon="add_box" label="Book Now" />
          <NavLink href="/orders" icon="list_alt" label="Orders List" />
          <NavLink href="/airway-bill" icon="description" label="Airway Bill" />

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
                <NavLink href="/operations/route-assignment" icon="alt_route" label="Route Assignment" />
                <NavLink href="/operations/delivery-sheet" icon="assignment" label="Delivery Sheet" />
              </div>
            )}
          </div>

          {/* 3. Financials */}
          <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
            <button onClick={() => toggleMenu('financials')} className="w-full flex items-center justify-between gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined">account_balance</span>
                <span className="font-label-md text-label-md">Financials</span>
              </div>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: expandedMenu === 'financials' ? 'rotate(180deg)' : '' }}>expand_more</span>
            </button>
            {expandedMenu === 'financials' && (
              <div className="pl-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                {isCourierAdmin && (
                  <NavLink href="/financials/shipper-invoices" icon="receipt_long" label="Shipper Invoices" />
                )}
                {isCourierAdmin && (
                  <NavLink href="/administration/plans" icon="assignment" label="Tariff Plans" />
                )}
                <NavLink href="/invoices/cod-settlement" icon="price_check" label="COD Settlement" />
                <NavLink href="/operations/de-runsheet" icon="payments" label="De-Runsheet (Cashier)" />
                {isCourierAdmin && (
                  <NavLink href="/administration/expenses" icon="receipt" label="Expense Management" />
                )}
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

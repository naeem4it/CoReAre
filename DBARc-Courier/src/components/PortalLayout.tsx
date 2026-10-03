'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/shared/api/api-client';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { ChevronDown, Building2, MapPin, LogOut, Key, CreditCard, Menu, X, Search } from 'lucide-react';
import { authStorage } from '@/shared/utils/auth-storage';

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const [mobileSearchQuery, setMobileSearchQuery] = React.useState('');

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileSearchQuery.trim()) return;
    const q = mobileSearchQuery.trim();
    setMobileDrawerOpen(false);
    setMobileSearchQuery('');
    router.push(`/tracking?search=${encodeURIComponent(q)}`);
  };

  const {
    user,
    activeBusinessId,
    activeOfficeId,
    isShipper,
    isShipperAdmin,
    isShipperEmployee,
    setActiveBusinessId,
    setActiveOfficeId,
    refreshUser,
  } = useAuth();
  const { logoUrl } = useTenant();

  const isCourierAdmin = !isShipper && !isShipperAdmin && !isShipperEmployee;

  // Enforce route protection: Shipper Employee cannot access any /administration routes
  React.useEffect(() => {
    if (isShipperEmployee && pathname?.startsWith('/administration')) {
      router.push('/');
    }
  }, [isShipperEmployee, pathname, router]);

  const authCheckedRef = React.useRef(false);

  React.useEffect(() => {
    if (authCheckedRef.current) return;
    authCheckedRef.current = true;

    const token = authStorage.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const existingUser = authStorage.getUser();
    if (existingUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthenticated(true);
    }

    apiClient
      .get('/users/me?populate=shipper,offices,role_definition,tenant.logo')
      .then((res) => {
        const userData = res.data;
        const roleType = (
          userData?.role?.type ||
          userData?.role_type ||
          userData?.role?.name ||
          (typeof userData?.role === 'string' ? userData?.role : '')
        )
          .toString()
          .toLowerCase();

        const isSuperAdmin =
          roleType.includes('super_admin') ||
          roleType.includes('super admin') ||
          userData?.role_type === 'SUPER_ADMIN' ||
          userData?.isAdminUser;

        if (isSuperAdmin) {
          authStorage.clearSession();
          router.push('/login');
          return;
        }

        authStorage.setSession(token, userData, activeBusinessId, activeOfficeId);
        refreshUser();
        setIsAuthenticated(true);
      })
      .catch((err) => {
        console.warn('Failed to fetch user context:', err.message);
        if (err.response?.status === 401) {
          authStorage.clearSession();
          router.push('/login');
          return;
        }
        if (existingUser) {
          refreshUser();
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      });
  }, [router, refreshUser, activeBusinessId, activeOfficeId]);

  // Close menus on route changes or search param changes
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileDrawerOpen(false);
    setActiveDropdown(null);
    setProfileDropdownOpen(false);
  }, [pathname, searchParams]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
        setActiveDropdown(null);
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  // Click outside listener for desktop nav dropdowns & profile
  const navContainerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isShipperUser = React.useMemo(() => {
    if (!user) return false;
    if (user.shipper_roles && Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0) return true;
    const roleType = (
      user.role?.type ||
      user.role_type ||
      user.role?.name ||
      (typeof user.role === 'string' ? user.role : '')
    )
      .toString()
      .toLowerCase();
    if (roleType.includes('shipper')) return true;
    if (user.user_type === 'shipper' || user.type === 'shipper') return true;
    if (user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : !!user.shipper)) {
      const hasCourierRole =
        Array.isArray(user.role_definition) &&
        user.role_definition.some((r: { role_name?: string }) =>
          ['admin', 'courier', 'super admin', 'rider', 'front desk'].some((c) =>
            (r.role_name || '').toLowerCase().includes(c)
          )
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

  const showShipmentBooking = true;

  // Active section identification for highlighting top-level dropdown buttons
  const isSectionActive = React.useCallback(
    (section: string) => {
      if (!pathname) return false;
      if (section === 'booking') {
        return (
          pathname.startsWith('/tracking') ||
          pathname.startsWith('/orders') ||
          pathname.startsWith('/shipments') ||
          pathname.startsWith('/airway-bill') ||
          pathname.startsWith('/bulk-shipment') ||
          pathname.startsWith('/load-sheet') ||
          pathname.startsWith('/pickup-information') ||
          pathname.startsWith('/shipper-advise')
        );
      }
      if (section === 'operations') {
        return pathname.startsWith('/operations');
      }
      if (section === 'financials') {
        return (
          pathname.startsWith('/invoices/cod-settlement') ||
          pathname === '/operations/de-runsheet' ||
          pathname.startsWith('/financials') ||
          pathname.startsWith('/administration/plans') ||
          pathname === '/administration/expenses'
        );
      }
      if (section === 'reports') {
        return (
          pathname.startsWith('/reports') ||
          pathname.startsWith('/invoices/customer') ||
          pathname.startsWith('/customer-service')
        );
      }
      if (section === 'admin') {
        return (
          pathname.startsWith('/administration') &&
          !pathname.startsWith('/administration/plans') &&
          pathname !== '/administration/expenses'
        );
      }
      if (section === 'billing') {
        return (
          pathname.startsWith('/financials/shipper-invoices') ||
          pathname.startsWith('/invoices/customer') ||
          pathname.startsWith('/reports/customer')
        );
      }
      if (section === 'interfaces') {
        return (
          pathname.startsWith('/order-api') ||
          pathname.startsWith('/store') ||
          pathname.startsWith('/stitch-unified') ||
          pathname.startsWith('/velocity-corporate')
        );
      }
      return false;
    },
    [pathname]
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full"
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* ========================================================================= */}
      {/* FIXED / STICKY TOP NAVIGATION BAR (2 ROWS)                                */}
      {/* ========================================================================= */}
      <header
        ref={navContainerRef}
        className="w-full sticky top-0 z-40 bg-[#E6F0EB] text-[#1B3B2F] border-b border-[#C8DFD4] shadow-xs select-none"
      >
        {/* ----------------------------------------------------------------------- */}
        {/* ROW 1: BRANDING, SEARCH BOX & UTILITY CONTROLS                          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 w-full max-w-[1600px] mx-auto h-[60px] sm:h-[64px] gap-3 lg:gap-6">
          
          {/* Start: Hamburger Trigger (< lg) + Logo + Merchant Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Hamburger Toggle Button (< lg) */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#2D5A47] hover:bg-[#DCEAE3] hover:text-[#112920] active:scale-95 transition-all cursor-pointer border border-[#C8DFD4] bg-white/80"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo Link */}
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
              {logoUrl ? (
                <div className="h-10 max-w-[150px] sm:max-w-[180px] flex items-center justify-start shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Tenant Logo"
                    className="max-h-9 sm:max-h-10 max-w-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-[#2D5A47] flex items-center justify-center shrink-0 shadow-xs text-white">
                    <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M 18 24 H 42 C 68 24, 86 36, 86 54 C 86 64, 80 72, 70 78 C 76 70, 78 62, 78 54 C 78 42, 64 34, 44 34 H 28 L 18 42 Z"
                        fill="#FFFFFF"
                      />
                      <path
                        d="M 16 78 C 22 84, 34 86, 48 86 C 64 86, 76 78, 80 66 C 72 74, 60 76, 48 76 C 34 76, 26 70, 26 58 C 26 50, 32 44, 40 40 C 30 42, 22 50, 22 62 C 22 68, 18 72, 16 78 Z"
                        fill="#FFFFFF"
                        opacity="0.85"
                      />
                    </svg>
                  </div>
                  <span className="font-bold text-lg sm:text-xl text-[#1B3B2F] tracking-tight leading-none hidden xs:inline">
                    DBARc
                  </span>
                </div>
              )}
            </Link>

            {isShipperUser && (
              <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider shrink-0">
                Merchant
              </span>
            )}

            {/* Welcome Message for Shipper */}
            {isShipperUser && (
              <div className="hidden 2xl:flex items-center gap-1 text-xs text-[#1B3B2F] pl-2 border-l border-[#C8DFD4]">
                <span className="text-[#3E6B58]">Welcome,</span>
                <span className="font-bold text-[#112920] max-w-[140px] truncate">
                  {(user?.shipper && Array.isArray(user.shipper) && user.shipper[0]?.name) ||
                    user?.fullName ||
                    user?.username ||
                    'Merchant'}
                  !
                </span>
              </div>
            )}
          </div>

          {/* Center: Global Search Box */}
          <div className="flex-1 max-w-[460px] lg:max-w-[540px] relative hidden md:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#3E6B58]">
              <Search className="w-4 h-4 text-[#2D5A47]" />
            </div>
            <input
              className="w-full bg-white border border-[#C8DFD4] rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-[#112920] placeholder:text-slate-400 focus:border-[#2D5A47] focus:ring-1 focus:ring-[#2D5A47] transition-all outline-none shadow-2xs"
              placeholder="Search shipments, fleet, or orders..."
              type="text"
            />
          </div>

          {/* End: Switchers, Notification Bell & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Shippers Switcher */}
            {user?.shipper && Array.isArray(user.shipper) && user.shipper.length > 0 && (
              <div className="relative group hidden sm:block">
                <button className="flex items-center gap-1.5 bg-white hover:bg-[#DCEAE3] px-2.5 py-1.5 rounded-lg transition-colors border border-[#C8DFD4] text-[#1B3B2F] shadow-2xs text-xs font-medium cursor-pointer">
                  <Building2 className="w-3.5 h-3.5 text-[#2D5A47]" />
                  <span className="max-w-[90px] xl:max-w-[120px] truncate">
                    {user.shipper.find((s: { id: number; name: string }) => s.id === activeBusinessId)?.name ||
                      'Shipper'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#3E6B58]" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    {user.shipper.map((biz: { id: number; name: string }) => (
                      <button
                        key={biz.id}
                        onClick={() => setActiveBusinessId(biz.id)}
                        className={`w-full text-left px-4 py-2 text-xs cursor-pointer ${
                          activeBusinessId === biz.id
                            ? 'bg-[#E6F0EB] text-[#1B3B2F] font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
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
              <div className="relative group hidden sm:block">
                <button className="flex items-center gap-1.5 bg-white hover:bg-[#DCEAE3] px-2.5 py-1.5 rounded-lg transition-colors border border-[#C8DFD4] text-[#1B3B2F] shadow-2xs text-xs font-medium cursor-pointer">
                  <MapPin className="w-3.5 h-3.5 text-[#2D5A47]" />
                  <span className="max-w-[90px] xl:max-w-[120px] truncate">
                    {user.offices.find((o: { id: number; name: string }) => o.id === activeOfficeId)?.name || 'Office'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#3E6B58]" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    {user.offices.map((office: { id: number; name: string }) => (
                      <button
                        key={office.id}
                        onClick={() => setActiveOfficeId(office.id)}
                        className={`w-full text-left px-4 py-2 text-xs cursor-pointer ${
                          activeOfficeId === office.id
                            ? 'bg-[#E6F0EB] text-[#1B3B2F] font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {office.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notification Bell */}
            <button
              type="button"
              className="p-1.5 rounded-full text-[#2D5A47] hover:text-[#112920] hover:bg-[#DCEAE3] transition-colors active:scale-95 cursor-pointer"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-full hover:bg-[#DCEAE3] transition-colors active:scale-95 cursor-pointer border border-transparent hover:border-[#C8DFD4]"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-[#112920] max-w-[110px] truncate leading-tight">
                    {user?.fullName || user?.username || 'Employee'}
                  </p>
                  <p className="text-[9px] text-[#2D5A47] uppercase tracking-wider font-semibold leading-tight">
                    {userRoles[0] || 'User'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#2D5A47] bg-[#1E3E31] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {userInitials}
                </div>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#C8DFD4] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50">
                    <p className="font-bold text-xs text-slate-800 truncate">{user?.fullName || user?.username}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {(isShipperAdmin || isShipper) && (
                      <Link
                        href="/profile/payment-method"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-[#E6F0EB] hover:text-[#1B3B2F] rounded-lg flex items-center gap-2 transition-colors font-medium"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#2D5A47]" /> Configure Payment Method
                      </Link>
                    )}
                    <Link
                      href="/auth/change-password"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-[#E6F0EB] hover:text-[#1B3B2F] rounded-lg flex items-center gap-2 transition-colors font-medium"
                    >
                      <Key className="w-3.5 h-3.5 text-[#2D5A47]" /> Change Password
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-[#E6F0EB] hover:text-[#1B3B2F] rounded-lg flex items-center gap-2 transition-colors font-medium"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#2D5A47]">settings</span> Settings
                    </Link>
                  </div>
                  <div className="p-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        authStorage.clearSession();
                        window.location.href = '/login';
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 2: DEDICATED HORIZONTAL NAVIGATION BAR (DESKTOP >= lg)              */}
        {/* ----------------------------------------------------------------------- */}
        <div className="border-t border-[#C8DFD4] bg-[#E6F0EB] hidden lg:flex w-full shadow-2xs relative z-40 overflow-visible">
          <div className="px-4 sm:px-6 lg:px-8 w-full max-w-[1600px] mx-auto min-h-[44px] flex items-center justify-between gap-4 overflow-visible">
            <nav className="flex items-center gap-1 xl:gap-1.5 flex-1 flex-wrap lg:flex-nowrap overflow-visible py-1">
              {/* Common Direct Links */}
              <TopNavLink href="/" icon="dashboard" label="Dashboard" />

              {isShipper ? (
                /* ==================== SHIPPER MERCHANT TOP LINKS ==================== */
                <>
                  {/* Booking Dropdown */}
                  <TopNavDropdown
                    label="Booking"
                    icon="inventory_2"
                    id="booking"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('booking')}
                  >
                    <TopNavDropdownItem
                      href="/tracking"
                      icon="location_on"
                      label="Tracking"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/orders"
                      icon="list_alt"
                      label="Orders List"
                      onClick={() => setActiveDropdown(null)}
                    />
                    {showShipmentBooking && (
                      <TopNavDropdownItem
                        href="/shipments/book?tab=manual"
                        icon="add_box"
                        label="Book Now"
                        onClick={() => setActiveDropdown(null)}
                      />
                    )}
                    <TopNavDropdownItem
                      href="/airway-bill"
                      icon="description"
                      label="Airways Bill"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/shipments/book?tab=bulk"
                      icon="upload_file"
                      label="Bulk Orders"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/load-sheet"
                      icon="route"
                      label="Load Sheet"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/pickup-information"
                      icon="local_shipping"
                      label="Pickup Info"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/shipper-advise"
                      icon="quick_reference_all"
                      label="Shipper Advice"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>

                  {/* Billing & COD Dropdown */}
                  <TopNavDropdown
                    label="Billing & COD"
                    icon="receipt_long"
                    id="billing"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('billing')}
                  >
                    <TopNavDropdownItem
                      href="/financials/shipper-invoices"
                      icon="receipt_long"
                      label="Invoices"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/invoices/customer"
                      icon="request_quote"
                      label="Customer Invoices"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/reports/customer"
                      icon="assignment_ind"
                      label="Customer Report"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>

                  {/* Store & Integrations Dropdown */}
                  <TopNavDropdown
                    label="Store & Integrations"
                    icon="integration_instructions"
                    id="interfaces"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('interfaces')}
                  >
                    <TopNavDropdownItem
                      href="/order-api"
                      icon="api"
                      label="Order API & Webhook"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/store"
                      icon="shopping_bag"
                      label="Sample Shirt Store"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>

                  {/* Store Team */}
                  {!isShipperEmployee && (
                    <TopNavLink href="/administration/employees?type=team" icon="group" label="Team" />
                  )}
                </>
              ) : (
                /* ==================== COURIER OPERATIONS TOP LINKS ==================== */
                <>
                  {/* Booking Dropdown */}
                  <TopNavDropdown
                    label="Booking"
                    icon="inventory_2"
                    id="booking"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('booking')}
                  >
                    <TopNavDropdownItem
                      href="/tracking"
                      icon="location_on"
                      label="Tracking"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/orders"
                      icon="list_alt"
                      label="Orders List"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/shipments/book"
                      icon="add_box"
                      label="Book Now"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/airway-bill"
                      icon="description"
                      label="Airways Bill"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>

                  {/* 1. Operations Dropdown */}
                  <TopNavDropdown
                    label="Operation"
                    icon="move_to_inbox"
                    id="operations"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('operations')}
                  >
                    <TopNavDropdownItem
                      href="/operations/arrivals"
                      icon="move_to_inbox"
                      label="Arrivals"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/operations/bulk-arrivals"
                      icon="upload_file"
                      label="Bulk Arrivals"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/operations/manifestation"
                      icon="inventory"
                      label="Manifestation"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/operations/demanifestation"
                      icon="unarchive"
                      label="DeManifestation"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/operations/route-assignment"
                      icon="alt_route"
                      label="Rider Route Assignment"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/operations/delivery-sheet"
                      icon="assignment"
                      label="Delivery Sheet"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>

                  {/* 2. Financials Dropdown */}
                  <TopNavDropdown
                    label="Financials"
                    icon="account_balance"
                    id="financials"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('financials')}
                  >
                    {isCourierAdmin && (
                      <TopNavDropdownItem
                        href="/financials/shipper-invoices"
                        icon="receipt_long"
                        label="Shipper Invoices"
                        onClick={() => setActiveDropdown(null)}
                      />
                    )}
                    {isCourierAdmin && (
                      <TopNavDropdownItem
                        href="/administration/plans"
                        icon="assignment"
                        label="Tariff Plans"
                        onClick={() => setActiveDropdown(null)}
                      />
                    )}
                    <TopNavDropdownItem
                      href="/invoices/cod-settlement"
                      icon="price_check"
                      label="Rider Closing"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/operations/de-runsheet"
                      icon="payments"
                      label="De-Runsheet (Cashier)"
                      onClick={() => setActiveDropdown(null)}
                    />
                    {isCourierAdmin && (
                      <TopNavDropdownItem
                        href="/administration/expenses"
                        icon="receipt"
                        label="Expense Management"
                        onClick={() => setActiveDropdown(null)}
                      />
                    )}
                  </TopNavDropdown>

                  {/* 3. Reports & Invoices Dropdown */}
                  <TopNavDropdown
                    label="Reports"
                    icon="bar_chart"
                    id="reports"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('reports')}
                  >
                    <TopNavDropdownItem
                      href="/reports/customer"
                      icon="assignment_ind"
                      label="Customer Report"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/reports/dispatch"
                      icon="local_shipping"
                      label="Dispatch Report"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/customer-service/arrival-summary"
                      icon="table_chart"
                      label="Arrival Summary"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/customer-service/riders-summary"
                      icon="badge"
                      label="Riders Summary"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/customer-service/order-report"
                      icon="analytics"
                      label="Order Report"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/reports/profit-loss"
                      icon="balance"
                      label="Profit & Loss Statement"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/reports/expenses"
                      icon="query_stats"
                      label="Executive Expense Report"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/reports/monthly-invoice"
                      icon="receipt_long"
                      label="Monthly Invoice"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/invoices/customer"
                      icon="request_quote"
                      label="Customer Invoice"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>

                  {/* 4. Administration Dropdown */}
                  <TopNavDropdown
                    label="Administration"
                    icon="shield"
                    id="admin"
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    isSectionActive={isSectionActive('admin')}
                  >
                    <div className="px-3 py-1 font-bold text-outline uppercase tracking-wider text-[10px] select-none">
                      Courier Management
                    </div>
                    <TopNavDropdownItem
                      href="/administration/zones"
                      icon="map"
                      label="Zone Setup"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/administration/routes"
                      icon="route"
                      label="Route Setup"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/administration/offices"
                      icon="domain"
                      label="Offices & Hubs"
                      onClick={() => setActiveDropdown(null)}
                    />
                    {isCourierAdmin && (
                      <TopNavDropdownItem
                        href="/administration/sales-person"
                        icon="badge"
                        label="Sales Person"
                        onClick={() => setActiveDropdown(null)}
                      />
                    )}
                    {isCourierAdmin && (
                      <TopNavDropdownItem
                        href="/administration/employees?type=shipper"
                        icon="local_shipping"
                        label="Shippers Directory"
                        onClick={() => setActiveDropdown(null)}
                      />
                    )}
                    <TopNavDropdownItem
                      href="/administration/employees?type=courier"
                      icon="badge"
                      label="Courier Staff"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/administration/self-service"
                      icon="local_shipping"
                      label="Self Service Areas (2PL)"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/administration/tpl-setup"
                      icon="hub"
                      label="3PL Partner Setup"
                      onClick={() => setActiveDropdown(null)}
                    />
                    <TopNavDropdownItem
                      href="/administration/shipper-tpl"
                      icon="alt_route"
                      label="Shipper 3PL Setup"
                      onClick={() => setActiveDropdown(null)}
                    />
                  </TopNavDropdown>
                </>
              )}
            </nav>

            {/* Direct Settings Link at far right of Row 2 */}
            <div className="shrink-0 pl-2 border-l border-[#C8DFD4]">
              <TopNavLink href="/settings" icon="settings" label="Settings" />
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE RESPONSIVE SLIDE-OVER DRAWER SHEET (< 1024px)                       */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop overlay with blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 w-[310px] sm:w-[350px] bg-[#E6F0EB] text-[#1B3B2F] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="h-[64px] px-4 flex items-center justify-between border-b border-[#C8DFD4] shrink-0 bg-[#E6F0EB]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#2D5A47] flex items-center justify-center shadow-xs text-white">
                  <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 18 24 H 42 C 68 24, 86 36, 86 54 C 86 64, 80 72, 70 78 C 76 70, 78 62, 78 54 C 78 42, 64 34, 44 34 H 28 L 18 42 Z"
                      fill="#FFFFFF"
                    />
                    <path
                      d="M 16 78 C 22 84, 34 86, 48 86 C 64 86, 76 78, 80 66 C 72 74, 60 76, 48 76 C 34 76, 26 70, 26 58 C 26 50, 32 44, 40 40 C 30 42, 22 50, 22 62 C 22 68, 18 72, 16 78 Z"
                      fill="#FFFFFF"
                      opacity="0.85"
                    />
                  </svg>
                </div>
                <span className="font-bold text-lg text-[#1B3B2F] tracking-tight">DBARc Express</span>
                {isShipperUser && (
                  <span className="bg-amber-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs">
                    Merchant
                  </span>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-[#DCEAE3] active:scale-95 transition-all cursor-pointer border border-[#C8DFD4] bg-white/60"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile User Info & Switchers Card */}
            <div className="p-3 border-b border-[#C8DFD4] bg-white/60 space-y-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#2D5A47] bg-[#1E3E31] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#112920] truncate">
                    {user?.fullName || user?.username || 'Employee'}
                  </p>
                  <p className="text-[10px] text-[#2D5A47] uppercase font-semibold tracking-wider">
                    {userRoles[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Mobile Switchers */}
              <div className="flex items-center gap-2 pt-1">
                {user?.shipper && Array.isArray(user.shipper) && user.shipper.length > 0 && (
                  <div className="flex-1">
                    <select
                      value={activeBusinessId || ''}
                      onChange={(e) => setActiveBusinessId(Number(e.target.value))}
                      className="w-full text-xs bg-white border border-[#C8DFD4] rounded-lg px-2 py-1.5 text-[#1B3B2F] font-medium outline-none"
                    >
                      {user.shipper.map((biz: { id: number; name: string }) => (
                        <option key={biz.id} value={biz.id}>
                          {biz.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {user?.offices && Array.isArray(user.offices) && user.offices.length > 0 && (
                  <div className="flex-1">
                    <select
                      value={activeOfficeId || ''}
                      onChange={(e) => setActiveOfficeId(Number(e.target.value))}
                      className="w-full text-xs bg-white border border-[#C8DFD4] rounded-lg px-2 py-1.5 text-[#1B3B2F] font-medium outline-none"
                    >
                      {user.offices.map((office: { id: number; name: string }) => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Drawer Search Box */}
            <form onSubmit={handleMobileSearch} className="px-3 pt-2.5 pb-1 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#2D5A47] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tracking, CN#, orders..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#C8DFD4] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#112920] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2D5A47] shadow-2xs"
                />
              </div>
            </form>

            {/* Mobile Drawer Navigation Links (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {/* Direct Links */}
              <MobileNavLink href="/" icon="dashboard" label="Dashboard" onClose={() => setMobileDrawerOpen(false)} />

              {isShipper ? (
                /* SHIPPER MOBILE NAVIGATION */
                <>
                  {/* Booking Accordion */}
                  <MobileNavAccordion
                    label="Booking"
                    icon="inventory_2"
                    defaultOpen={isSectionActive('booking')}
                  >
                    <MobileNavLink
                      href="/tracking"
                      icon="location_on"
                      label="Tracking"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/orders"
                      icon="list_alt"
                      label="Orders List"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    {showShipmentBooking && (
                      <MobileNavLink
                        href="/shipments/book?tab=manual"
                        icon="add_box"
                        label="Book Now"
                        isSubItem
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    )}
                    <MobileNavLink
                      href="/airway-bill"
                      icon="description"
                      label="Airways Bill"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/shipments/book?tab=bulk"
                      icon="upload_file"
                      label="Bulk Orders"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/load-sheet"
                      icon="route"
                      label="Load Sheet"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/pickup-information"
                      icon="local_shipping"
                      label="Pickup Info"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/shipper-advise"
                      icon="quick_reference_all"
                      label="Shipper Advice"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>

                  {/* Billing & COD Accordion */}
                  <MobileNavAccordion
                    label="Billing & COD"
                    icon="receipt_long"
                    defaultOpen={isSectionActive('billing')}
                  >
                    <MobileNavLink
                      href="/financials/shipper-invoices"
                      icon="receipt_long"
                      label="Invoices"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/invoices/customer"
                      icon="request_quote"
                      label="Customer Invoices"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/reports/customer"
                      icon="assignment_ind"
                      label="Customer Report"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>

                  {/* Store & Integrations Accordion */}
                  <MobileNavAccordion
                    label="Store & Integrations"
                    icon="integration_instructions"
                    defaultOpen={isSectionActive('interfaces')}
                  >
                    <MobileNavLink
                      href="/order-api"
                      icon="api"
                      label="Order API & Webhook"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/store"
                      icon="shopping_bag"
                      label="Sample Shirt Store"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>

                  {/* My Store Team */}
                  {!isShipperEmployee && (
                    <MobileNavLink
                      href="/administration/employees?type=team"
                      icon="group"
                      label="My Store Team"
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  )}
                </>
              ) : (
                /* COURIER MOBILE NAVIGATION */
                <>
                  {/* Booking Accordion */}
                  <MobileNavAccordion
                    label="Booking"
                    icon="inventory_2"
                    defaultOpen={isSectionActive('booking')}
                  >
                    <MobileNavLink
                      href="/tracking"
                      icon="location_on"
                      label="Tracking"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/orders"
                      icon="list_alt"
                      label="Orders List"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/shipments/book"
                      icon="add_box"
                      label="Book Now"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/airway-bill"
                      icon="description"
                      label="Airways Bill"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>

                  {/* Operations Accordion */}
                  <MobileNavAccordion
                    label="Operation"
                    icon="move_to_inbox"
                    defaultOpen={isSectionActive('operations')}
                  >
                    <MobileNavLink
                      href="/operations/arrivals"
                      icon="move_to_inbox"
                      label="Arrivals"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/operations/bulk-arrivals"
                      icon="upload_file"
                      label="Bulk Arrivals"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/operations/manifestation"
                      icon="inventory"
                      label="Manifestation"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/operations/demanifestation"
                      icon="unarchive"
                      label="DeManifestation"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/operations/route-assignment"
                      icon="alt_route"
                      label="Rider Route Assignment"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/operations/delivery-sheet"
                      icon="assignment"
                      label="Delivery Sheet"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>

                  {/* Financials Accordion */}
                  <MobileNavAccordion
                    label="Financials"
                    icon="account_balance"
                    defaultOpen={isSectionActive('financials')}
                  >
                    {isCourierAdmin && (
                      <MobileNavLink
                        href="/financials/shipper-invoices"
                        icon="receipt_long"
                        label="Shipper Invoices"
                        isSubItem
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    )}
                    {isCourierAdmin && (
                      <MobileNavLink
                        href="/administration/plans"
                        icon="assignment"
                        label="Tariff Plans"
                        isSubItem
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    )}
                    <MobileNavLink
                      href="/invoices/cod-settlement"
                      icon="price_check"
                      label="Rider Closing"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/operations/de-runsheet"
                      icon="payments"
                      label="De-Runsheet (Cashier)"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    {isCourierAdmin && (
                      <MobileNavLink
                        href="/administration/expenses"
                        icon="receipt"
                        label="Expense Management"
                        isSubItem
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    )}
                  </MobileNavAccordion>

                  {/* Reports Accordion */}
                  <MobileNavAccordion
                    label="Reports & Invoices"
                    icon="bar_chart"
                    defaultOpen={isSectionActive('reports')}
                  >
                    <MobileNavLink
                      href="/reports/customer"
                      icon="assignment_ind"
                      label="Customer Report"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/reports/dispatch"
                      icon="local_shipping"
                      label="Dispatch Report"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/customer-service/arrival-summary"
                      icon="table_chart"
                      label="Arrival Summary"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/customer-service/riders-summary"
                      icon="badge"
                      label="Riders Summary"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/customer-service/order-report"
                      icon="analytics"
                      label="Order Report"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/reports/profit-loss"
                      icon="balance"
                      label="Profit & Loss Statement"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/reports/expenses"
                      icon="query_stats"
                      label="Executive Expense Report"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/reports/monthly-invoice"
                      icon="receipt_long"
                      label="Monthly Invoice"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/invoices/customer"
                      icon="request_quote"
                      label="Customer Invoice"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>

                  {/* Administration Accordion */}
                  <MobileNavAccordion
                    label="Administration"
                    icon="shield"
                    defaultOpen={isSectionActive('admin')}
                  >
                    <MobileNavLink
                      href="/administration/zones"
                      icon="map"
                      label="Zone Setup"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/administration/routes"
                      icon="route"
                      label="Route Setup"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/administration/offices"
                      icon="domain"
                      label="Offices & Hubs"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    {isCourierAdmin && (
                      <MobileNavLink
                        href="/administration/sales-person"
                        icon="badge"
                        label="Sales Person"
                        isSubItem
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    )}
                    {isCourierAdmin && (
                      <MobileNavLink
                        href="/administration/employees?type=shipper"
                        icon="local_shipping"
                        label="Shippers Directory"
                        isSubItem
                        onClose={() => setMobileDrawerOpen(false)}
                      />
                    )}
                    <MobileNavLink
                      href="/administration/employees?type=courier"
                      icon="badge"
                      label="Courier Staff"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/administration/self-service"
                      icon="local_shipping"
                      label="Self Service Areas (2PL)"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/administration/tpl-setup"
                      icon="hub"
                      label="3PL Partner Setup"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                    <MobileNavLink
                      href="/administration/shipper-tpl"
                      icon="alt_route"
                      label="Shipper 3PL Setup"
                      isSubItem
                      onClose={() => setMobileDrawerOpen(false)}
                    />
                  </MobileNavAccordion>
                </>
              )}

              {/* Settings Link */}
              <MobileNavLink href="/settings" icon="settings" label="Settings" onClose={() => setMobileDrawerOpen(false)} />
            </div>

            {/* Mobile Drawer Footer Actions */}
            <div className="p-3 border-t border-[#C8DFD4] bg-white/60 space-y-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  authStorage.clearSession();
                  window.location.href = '/login';
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors font-semibold cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA (FULL WIDTH CLEAN LAYOUT WITHOUT LEFT SIDEBAR OFFSET)   */}
      {/* ========================================================================= */}
      <div className="flex flex-col min-h-[calc(100vh-64px)] w-full flex-1">
        <main className="portal-main-container flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 overflow-y-auto custom-scrollbar bg-slate-50">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px)                                    */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#C8DFD4] flex items-center justify-around z-40 shadow-lg px-2 pb-[env(safe-area-inset-bottom,0px)]">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg ${
            pathname === '/' ? 'text-primary font-bold' : 'text-[#3E6B58] hover:text-[#112920]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="text-[10px] leading-tight">Home</span>
        </Link>
        <Link
          href="/tracking"
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg ${
            pathname.startsWith('/tracking') ? 'text-primary font-bold' : 'text-[#3E6B58] hover:text-[#112920]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">location_on</span>
          <span className="text-[10px] leading-tight">Track</span>
        </Link>
        <Link
          href="/orders"
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg ${
            pathname.startsWith('/orders') ? 'text-primary font-bold' : 'text-[#3E6B58] hover:text-[#112920]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">local_shipping</span>
          <span className="text-[10px] leading-tight">Orders</span>
        </Link>
        <Link
          href="/airway-bill"
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg ${
            pathname.startsWith('/airway-bill') ? 'text-primary font-bold' : 'text-[#3E6B58] hover:text-[#112920]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span className="text-[10px] leading-tight">AWB</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-1 cursor-pointer transition-colors py-1 px-2 rounded-lg text-[#3E6B58] hover:text-[#112920] active:scale-95"
          aria-label="Open full menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </nav>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={null}>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </React.Suspense>
  );
}

// =============================================================================
// SUBCOMPONENTS: DESKTOP TOP NAV LINK & DROPDOWNS
// =============================================================================

function useRouteMatch(href: string, exact: boolean = false) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useMemo(() => {
    if (!pathname) return false;
    const [hrefPath, hrefQuery] = href.split('?');

    let isPathMatch = false;
    if (hrefPath === '/') {
      isPathMatch = pathname === '/';
    } else if (exact) {
      isPathMatch = pathname === hrefPath;
    } else {
      isPathMatch = pathname === hrefPath || pathname.startsWith(hrefPath + '/');
    }

    if (!isPathMatch) return false;

    if (hrefQuery) {
      const targetParams = new URLSearchParams(hrefQuery);
      for (const [key, value] of targetParams.entries()) {
        const currentVal = searchParams?.get(key);
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

    if (hrefPath === '/shipments/book') {
      const currentTab = searchParams?.get('tab');
      if (currentTab === 'bulk') return false;
    }

    if (hrefPath === '/administration/employees') {
      const currentType = searchParams?.get('type');
      if (currentType) return false;
    }

    return true;
  }, [href, pathname, searchParams, exact]);
}

function TopNavLink({
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
  const active = useRouteMatch(href, exact);

  return (
    <Link
      href={href}
      scroll={false}
      data-active={active ? 'true' : undefined}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs 2xl:text-sm font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0 ${
        active
          ? 'bg-white text-[#0D9488] shadow-2xs font-extrabold border border-[#C8DFD4]'
          : 'text-[#1B3B2F] hover:bg-[#DCEAE3] hover:text-[#112920]'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function TopNavDropdown({
  label,
  icon,
  id,
  activeDropdown,
  setActiveDropdown,
  isSectionActive,
  children,
}: {
  label: string;
  icon: string;
  id: string;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  isSectionActive: boolean;
  children: React.ReactNode;
}) {
  const isOpen = activeDropdown === id;
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveDropdown(isOpen ? null : id);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs 2xl:text-sm font-semibold whitespace-nowrap cursor-pointer transition-all ${
          isOpen || isSectionActive
            ? 'bg-white text-[#0D9488] shadow-2xs font-extrabold border border-[#C8DFD4]'
            : 'text-[#1B3B2F] hover:bg-[#DCEAE3] hover:text-[#112920]'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-1 min-w-[220px] max-w-[290px] bg-white rounded-xl shadow-2xl border border-[#C8DFD4] p-1.5 flex flex-col gap-0.5 z-[100] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TopNavDropdownItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  const active = useRouteMatch(href);

  return (
    <Link
      href={href}
      scroll={false}
      {...(onClick ? { onClick } : {})}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
        active
          ? 'bg-[#E6F0EB] text-[#0D9488] font-bold'
          : 'text-slate-700 hover:bg-[#F0F7F4] hover:text-[#1B3B2F]'
      }`}
    >
      <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

// =============================================================================
// SUBCOMPONENTS: MOBILE DRAWER LINKS & ACCORDION
// =============================================================================

function MobileNavLink({
  href,
  icon,
  label,
  isSubItem = false,
  onClose,
}: {
  href: string;
  icon: string;
  label: string;
  isSubItem?: boolean;
  onClose?: () => void;
}) {
  const active = useRouteMatch(href);

  return (
    <Link
      href={href}
      scroll={false}
      {...(onClose ? { onClick: onClose } : {})}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all min-h-[42px] ${
        isSubItem ? 'ml-3 text-[11px]' : ''
      } ${
        active
          ? 'bg-white text-[#0D9488] font-extrabold shadow-2xs border border-[#C8DFD4]'
          : 'text-[#1B3B2F] hover:bg-[#DCEAE3]'
      }`}
    >
      <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function MobileNavAccordion({
  label,
  icon,
  defaultOpen = false,
  children,
}: {
  label: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="flex flex-col border-t border-[#C8DFD4]/60 pt-1 mt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#1B3B2F] hover:bg-[#DCEAE3] transition-colors cursor-pointer min-h-[42px]"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
          <span>{label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 text-slate-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="pl-2 space-y-0.5 animate-in slide-in-from-top-2 duration-150">{children}</div>}
    </div>
  );
}

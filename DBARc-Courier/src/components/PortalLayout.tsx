'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/shared/api/api-client';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [loggedInUser, setLoggedInUser] = React.useState<any>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dbarc-token');
    if (!token) {
      router.push('/login');
    } else {
      // Fetch current user details with populated relations
      apiClient.get('/users/me')
        .then((res) => {
          localStorage.setItem('user', JSON.stringify(res.data));
          setLoggedInUser(res.data);
          setIsAuthenticated(true);
        })
        .catch((err) => {
          console.error('Failed to fetch user context:', err);
          // If auth token is invalid, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('dbarc-token');
          localStorage.removeItem('user');
          router.push('/login');
        });
    }
  }, [router]);

  const userRoles = React.useMemo(() => {
    if (!loggedInUser) return [];
    return Array.isArray(loggedInUser.role_definition)
      ? loggedInUser.role_definition.map((r: any) => r.role_name)
      : [];
  }, [loggedInUser]);

  const showShipmentBooking = React.useMemo(() => {
    if (!loggedInUser) return false;
    return (
      loggedInUser.role?.type === 'super_admin' ||
      userRoles.includes('Super Admin') ||
      userRoles.includes('Admin')
    );
  }, [loggedInUser, userRoles]);

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
        <div className="flex items-center justify-between px-lg w-full max-w-[1280px] mx-auto h-full gap-md">
          <div className="flex items-center gap-md">
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">Fly Courier</span>
            <nav className="hidden md:flex items-center gap-md ml-lg">
              <Link
                href="/"
                className={`pb-1 font-semibold font-body-md text-body-md transition-all active:scale-95 cursor-pointer ${pathname === '/'
                    ? 'text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed'
                    : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed'
                  }`}
              >
                Dashboard
              </Link>
              <Link
                href="/shipments"
                className={`pb-1 font-semibold font-body-md text-body-md transition-all active:scale-95 cursor-pointer ${pathname.startsWith('/shipments')
                    ? 'text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed'
                    : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed'
                  }`}
              >
                Shipments
              </Link>
              <a className="text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed font-body-md text-body-md transition-all active:scale-95 cursor-pointer">
                Fleet
              </a>
              <a className="text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed font-body-md text-body-md transition-all active:scale-95 cursor-pointer">
                Invoices
              </a>
            </nav>
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-[600px] relative hidden md:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary-container transition-all outline-none"
              placeholder="Search shipments, fleet, or customers..."
              type="text"
            />
          </div>

          <div className="flex items-center gap-sm">
            <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors duration-200 active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors duration-200 active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined text-on-surface-variant">help</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('dbarc-token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
              className="p-2 rounded-full hover:bg-error-container/20 text-error hover:text-error transition-colors duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
              title="Logout"
            >
              <span className="material-symbols-outlined text-red-600">logout</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant ml-2">
              <img
                alt="User profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfrNw28bnjOpyL4SHcMjfqmNhg7QBnJKqapM_h5C3zx3d5rE6Z5n4tjx3m8K_a76ZNxy2jckgp4horBbe2E4FsHFoVO_tf4yseSLswpo7i_TOJiMMvUd0WDOE85ise7nFUgWWIq6vse8UJhz4ldxJgfUxapUCp5B-uyNal8PFmEE4NMEi0EcObkIkmRWrj9SJGdWqxUV0-CXKgJuGONLqVh17oIWYfdYl2eVZFAcDwLvyMjIWw5vKCvDDsk7Oi8k9Fq6oOd8VtHnY"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)] max-w-[1280px] w-full mx-auto flex-1">
        {/* SideNavBar */}
        <aside className="hidden lg:flex flex-col p-sm gap-xs w-64 border-r border-outline-variant dark:border-outline bg-surface dark:bg-surface-dim shrink-0">
          {showShipmentBooking && (
            <div className="mb-lg p-sm">
              <Link
                href="/shipments/book"
                className="w-full bg-primary-container text-on-primary-container py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-xs hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer animate-in fade-in duration-200"
              >
                <span className="material-symbols-outlined">add</span>
                New Shipment
              </Link>
            </div>
          )}
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
          href="/shipments"
          className={`flex flex-col items-center gap-1 cursor-pointer ${pathname.startsWith('/shipments') ? 'text-primary' : 'text-on-surface-variant'
            }`}
        >
          <span className="material-symbols-outlined">local_shipping</span>
          <span className="text-[10px] font-medium">Ships</span>
        </Link>
        <button className="flex flex-col items-center gap-1 text-on-surface-variant cursor-pointer">
          <span className="material-symbols-outlined">location_on</span>
          <span className="text-[10px] font-medium">Track</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-on-surface-variant cursor-pointer">
          <span className="material-symbols-outlined">group</span>
          <span className="text-[10px] font-medium">Cust</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-on-surface-variant cursor-pointer">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* FAB for Quick Actions */}
      {showShipmentBooking && (
        <Link
          href="/shipments/book"
          className="fixed bottom-24 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all lg:bottom-8 z-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[32px]">add</span>
        </Link>
      )}
    </div>
  );
}

function SideNavigation({ showShipmentBooking }: { showShipmentBooking: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab');

  const [loggedInUser, setLoggedInUser] = React.useState<any>(null);

  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setLoggedInUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const isShipper = !!loggedInUser?.shipper;

  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/"
        className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${pathname === '/'
            ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
            : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
          }`}
      >
        <span className="material-symbols-outlined">dashboard</span>
        <span className="font-label-md text-label-md">Overview</span>
      </Link>

      {showShipmentBooking && (
        <Link
          href="/shipments/book"
          className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${pathname === '/shipments/book' && tab !== 'bulk'
              ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
              : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
            }`}
        >
          <span className="material-symbols-outlined">local_shipping</span>
          <span className="font-label-md text-label-md">Booking</span>
        </Link>
      )}
      <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
        <span className="material-symbols-outlined">location_on</span>
        <span className="font-label-md text-label-md">Tracking</span>
      </a>
      <Link
        href="/shipments/book?tab=bulk"
        className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${pathname === '/shipments/book' && tab === 'bulk'
            ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
            : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
          }`}
      >
        <span className="material-symbols-outlined">inventory_2</span>
        <span className="font-label-md text-label-md">Load Sheets</span>
      </Link>
      <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
        <span className="material-symbols-outlined">group</span>
        <span className="font-label-md text-label-md">Customers</span>
      </a>
      {/* Administration and User Accounts Submenus */}
      <div className="flex flex-col gap-1 border-t border-outline-variant pt-2 mt-1">
        <div className="flex items-center gap-md p-sm font-bold text-secondary dark:text-secondary-fixed-dim select-none">
          <span className="material-symbols-outlined">shield</span>
          <span className="font-label-md text-label-md">Administration</span>
        </div>
        
        <div className="pl-4 flex flex-col gap-0.5">
          <div className="flex items-center p-xs font-bold text-outline uppercase tracking-wider text-[10px] select-none">
            User Accounts
          </div>
          
          {isShipper ? (
            <Link
              href="/administration/employees?type=shipper"
              className={`flex items-center gap-md p-sm font-semibold rounded-lg cursor-pointer active:opacity-80 transition-all ${
                pathname.startsWith('/administration')
                  ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                  : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">badge</span>
              <span className="font-label-md text-label-md">Add/Edit Employee</span>
            </Link>
          ) : (
            <>
              <Link
                href="/administration/employees?type=shipper"
                className={`flex items-center gap-md p-sm font-semibold rounded-lg cursor-pointer active:opacity-80 transition-all ${
                  pathname.startsWith('/administration') && searchParams?.get('type') === 'shipper'
                    ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                    : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                <span className="font-label-md text-label-md">Add/Edit Shipper</span>
              </Link>

              <Link
                href="/administration/employees?type=courier"
                className={`flex items-center gap-md p-sm font-semibold rounded-lg cursor-pointer active:opacity-80 transition-all ${
                  pathname.startsWith('/administration') && (searchParams?.get('type') === 'courier' || !searchParams?.get('type'))
                    ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                    : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span className="font-label-md text-label-md">Add/Edit Employee</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all border-t border-outline-variant pt-2 mt-1">
        <span className="material-symbols-outlined">settings</span>
        <span className="font-label-md text-label-md">Settings</span>
      </a>
    </nav>
  );
}

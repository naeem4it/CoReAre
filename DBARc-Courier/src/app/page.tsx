'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CourierStats } from '@/features/courier/ui/CourierStats';
import { FleetDistributionMap } from '@/features/courier/ui/FleetDistributionMap';
import { LiveOperationsFeed } from '@/features/courier/ui/LiveOperationsFeed';
import { CourierShipmentsTable } from '@/features/courier/ui/CourierShipmentsTable';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState('Overview');
  const [activeTimeframe, setActiveTimeframe] = React.useState('24h');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dbarc-token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

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
              <a
                className={`pb-1 font-semibold font-body-md text-body-md transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Overview'
                    ? 'text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed'
                    : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed'
                }`}
                onClick={() => setActiveTab('Overview')}
              >
                Dashboard
              </a>
              <a
                className={`pb-1 font-semibold font-body-md text-body-md transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'Shipments'
                    ? 'text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed'
                    : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed'
                }`}
                onClick={() => setActiveTab('Shipments')}
              >
                Shipments
              </a>
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
          <div className="mb-lg p-sm">
            <button className="w-full bg-primary-container text-on-primary-container py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-xs hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer">
              <span className="material-symbols-outlined">add</span>
              New Shipment
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            <a
              onClick={() => setActiveTab('Overview')}
              className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${
                activeTab === 'Overview'
                  ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                  : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-label-md text-label-md">Overview</span>
            </a>

            <a
              onClick={() => setActiveTab('Shipments')}
              className={`flex items-center gap-md p-sm font-bold rounded-lg cursor-pointer active:opacity-80 transition-all ${
                activeTab === 'Shipments'
                  ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed'
                  : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">local_shipping</span>
              <span className="font-label-md text-label-md">Booking</span>
            </a>
            <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
              <span className="material-symbols-outlined">location_on</span>
              <span className="font-label-md text-label-md">Tracking</span>
            </a>
            <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="font-label-md text-label-md">Load Sheets</span>
            </a>
            <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
              <span className="material-symbols-outlined">group</span>
              <span className="font-label-md text-label-md">Customers</span>
            </a>
            <a className="flex items-center gap-md p-sm text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-lg cursor-pointer active:opacity-80 transition-all">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-label-md text-label-md">Settings</span>
            </a>
          </nav>
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
          {activeTab === 'Overview' ? (
            <>
              {/* Page Header & Filters */}
              <header className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-md">
                <div>
                  <h1 className="font-display-lg text-display-lg text-on-surface">Logistics Mastery</h1>
                  <p className="text-on-surface-variant font-body-md text-body-md">Real-time oversight of global operations</p>
                </div>
                <div className="flex items-center gap-sm">
                  <div className="flex bg-white rounded-lg border border-outline-variant p-1 shadow-sm">
                    <button
                      className={`px-3 py-1.5 rounded text-label-md font-label-md cursor-pointer ${
                        activeTimeframe === '24h'
                          ? 'bg-secondary-container text-on-secondary-container font-semibold'
                          : 'hover:bg-surface-container-low'
                      }`}
                      onClick={() => setActiveTimeframe('24h')}
                    >
                      24h
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded text-label-md font-label-md cursor-pointer ${
                        activeTimeframe === '7d'
                          ? 'bg-secondary-container text-on-secondary-container font-semibold'
                          : 'hover:bg-surface-container-low'
                      }`}
                      onClick={() => setActiveTimeframe('7d')}
                    >
                      7d
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded text-label-md font-label-md cursor-pointer ${
                        activeTimeframe === '30d'
                          ? 'bg-secondary-container text-on-secondary-container font-semibold'
                          : 'hover:bg-surface-container-low'
                      }`}
                      onClick={() => setActiveTimeframe('30d')}
                    >
                      30d
                    </button>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-lg text-body-md font-medium shadow-sm active:scale-95 transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                      <span>May 14, 2026</span>
                    </button>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-lg text-body-md font-medium shadow-sm active:scale-95 transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">location_city</span>
                      <span>Karachi</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* Stat Grid */}
              <CourierStats />

              {/* Bento Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                <FleetDistributionMap />
                <LiveOperationsFeed />
              </div>

              {/* Shipments Table */}
              <CourierShipmentsTable />
            </>
          ) : (
            <div className="p-lg bg-white rounded-xl border border-outline-variant shadow-sm min-h-[400px] flex flex-col justify-center items-center text-center">
              <span className="material-symbols-outlined text-[64px] text-outline mb-4">construction</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">{activeTab} Page</h2>
              <p className="text-on-surface-variant font-body-md text-body-md max-w-sm">
                This page layout for {activeTab} is currently under construction. Please use the Overview tab to view the primary dashboard metrics.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom NavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-outline-variant flex items-center justify-around z-50">
        <button
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'Overview' ? 'text-primary' : 'text-on-surface-variant'
          }`}
          onClick={() => setActiveTab('Overview')}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'Shipments' ? 'text-primary' : 'text-on-surface-variant'
          }`}
          onClick={() => setActiveTab('Shipments')}
        >
          <span className="material-symbols-outlined">local_shipping</span>
          <span className="text-[10px] font-medium">Ships</span>
        </button>
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
      <button className="fixed bottom-24 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all lg:bottom-8 z-40 cursor-pointer">
        <span className="material-symbols-outlined text-[32px]">add</span>
      </button>
    </div>
  );
}

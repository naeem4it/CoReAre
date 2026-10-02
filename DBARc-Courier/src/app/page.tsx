'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { CourierStats } from '@/features/courier/ui/CourierStats';
import { CourierAnalyticsCharts } from '@/features/courier/ui/CourierAnalyticsCharts';
import { ShipperDashboard } from '@/features/shipper/ui/ShipperDashboard';
import { useTenant } from '@/components/TenantProvider';
import { useAuth } from '@/components/AuthProvider';
import { Store } from 'lucide-react';
import { getDefaultDateRange } from '@/shared/utils/date';

export default function DashboardPage() {
  const { businessName } = useTenant();
  const { user, isShipper } = useAuth();

  // Allow admins or staff to preview shipper desktop if desired
  const [adminViewMode, setAdminViewMode] = React.useState<'courier' | 'shipper' | null>(null);

  // If user is a shipper, show Shipper Desktop. If admin selected preview, honor that.
  const showShipperDesktop = isShipper || adminViewMode === 'shipper';

  // Helper for today's date formatted as YYYY-MM-DD
  const todayStr = React.useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const currentDateDisplay = React.useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Dynamic date range default: past 30 days up to today (in local system time)
  const defaultRange = React.useMemo(() => getDefaultDateRange(30), []);
  const [fromDate, setFromDate] = React.useState<string>(defaultRange.fromDate);
  const [toDate, setToDate] = React.useState<string>(defaultRange.toDate);

  // Dynamic Shipper Business Name for Dashboard Title
  const shipperName = React.useMemo(() => {
    if (!user) return '';
    const activeBizIdStr = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;
    const activeBizId = activeBizIdStr ? Number(activeBizIdStr) : null;
    
    if (user.shipper) {
      if (Array.isArray(user.shipper) && user.shipper.length > 0) {
        if (activeBizId) {
          const found = user.shipper.find((s: { id?: number; name?: string }) => s.id === activeBizId);
          if (found?.name) return found.name;
        }
        return user.shipper[0].name;
      } else if (typeof user.shipper === 'object' && user.shipper.name) {
        return user.shipper.name;
      }
    }
    return '';
  }, [user]);

  const dashboardHeading = shipperName ? `${shipperName} Dashboard` : 'Operations Dashboard';

  // Dynamic business location address/city
  const businessLocation = React.useMemo(() => {
    if (!user) return 'Karachi';
    const cityFromShipper = Array.isArray(user.shipper) ? user.shipper[0]?.city : user.shipper?.city;
    const addressFromShipper = Array.isArray(user.shipper) ? user.shipper[0]?.address : user.shipper?.address;
    const cityFromTenant = user.tenant?.city || user.tenant?.address;
    const officeName = Array.isArray(user.offices) ? user.offices[0]?.name : undefined;

    const loc = cityFromShipper || addressFromShipper || cityFromTenant || officeName || 'Karachi';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object' && loc !== null) {
      return loc.CityName || loc.name || loc.address || 'Karachi';
    }
    return 'Karachi';
  }, [user]);

  // Selected status filter triggered by clicking tiles
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');

  // If rendering Shipper Desktop
  if (showShipperDesktop) {
    return (
      <PortalLayout>
        {/* Admin preview banner */}
        {!isShipper && (
          <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs shadow-2xs">
            <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-700" />
              Viewing Shipper Merchant Desktop Preview
            </span>
            <button
              onClick={() => setAdminViewMode('courier')}
              className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-lg font-bold hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
            >
              Switch to Courier Operations
            </button>
          </div>
        )}
        <ShipperDashboard />
      </PortalLayout>
    );
  }

  // Courier Operations Dashboard
  return (
    <PortalLayout>
      {/* Page Header & Date Range Controls */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-lg gap-md">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface font-bold">
            {dashboardHeading}
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Real-time oversight of operations & logistics
          </p>
        </div>

        {/* Dynamic Controls: From & To Date Range, Current Date, Business Location, View Mode */}
        <div className="flex flex-wrap items-center gap-sm">
          {/* Quick Shipper View Toggle Button for Admin */}
          <button
            type="button"
            onClick={() => setAdminViewMode('shipper')}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs text-emerald-900 transition-colors cursor-pointer"
            title="Preview Shipper Merchant Desktop"
          >
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span>Shipper View</span>
          </button>

          {/* Quick Date Presets: All Time, Today, 7 Days, 30 Days */}
          <div className="flex items-center gap-1 bg-white border border-outline-variant rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                !fromDate && !toDate
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="View all 517+ bookings with no date restriction"
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate(todayStr);
                setToDate(todayStr);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                fromDate === todayStr && toDate === todayStr
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const r7 = getDefaultDateRange(7);
                setFromDate(r7.fromDate);
                setToDate(r7.toDate);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                fromDate && toDate && fromDate !== todayStr && fromDate === getDefaultDateRange(7).fromDate
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate(defaultRange.fromDate);
                setToDate(defaultRange.toDate);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                fromDate === defaultRange.fromDate && toDate === defaultRange.toDate
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* From & To Date Range Inputs */}
          <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-xl p-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 cursor-pointer"
              />
            </div>
            <span className="text-slate-300 font-bold">-</span>
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Current Date Display Badge */}
          <div className="flex items-center gap-2 bg-white border border-outline-variant px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
            <span>{currentDateDisplay}</span>
          </div>

          {/* Business Location Badge */}
          <div className="flex items-center gap-2 bg-white border border-outline-variant px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-primary">location_city</span>
            <span>{businessLocation}</span>
          </div>
        </div>
      </header>

      {/* Stat Grid with Date Filtering & Clickable Filter Tiles */}
      <CourierStats 
        fromDate={fromDate} 
        toDate={toDate} 
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />

      {/* Courier Admin Analytics Charts & Visualizations */}
      <CourierAnalyticsCharts
        fromDate={fromDate}
        toDate={toDate}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />
    </PortalLayout>
  );
}

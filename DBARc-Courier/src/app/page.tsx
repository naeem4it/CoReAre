'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { CourierStats } from '@/features/courier/ui/CourierStats';
import { FleetDistributionMap } from '@/features/courier/ui/FleetDistributionMap';
import { LiveOperationsFeed } from '@/features/courier/ui/LiveOperationsFeed';
import { CourierShipmentsTable } from '@/features/courier/ui/CourierShipmentsTable';
import { useTenant } from '@/components/TenantProvider';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardPage() {
  const { businessName } = useTenant();
  const { user } = useAuth();

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

  // From and To Date state for filtering (defaulted to 1 day / today)
  const [fromDate, setFromDate] = React.useState<string>(todayStr);
  const [toDate, setToDate] = React.useState<string>(todayStr);

  // Dynamic Shipper Business Name for Dashboard Title
  const shipperName = React.useMemo(() => {
    if (!user) return '';
    const activeBizIdStr = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;
    const activeBizId = activeBizIdStr ? Number(activeBizIdStr) : null;
    
    if (user.shipper) {
      if (Array.isArray(user.shipper) && user.shipper.length > 0) {
        if (activeBizId) {
          const found = user.shipper.find((s: any) => s.id === activeBizId);
          if (found?.name) return found.name;
        }
        return user.shipper[0].name;
      } else if (typeof user.shipper === 'object' && user.shipper.name) {
        return user.shipper.name;
      }
    }
    return '';
  }, [user]);

  const dashboardHeading = shipperName ? `${shipperName} Dashboard` : (businessName ? `${businessName} Dashboard` : 'Dashboard');

  // Dynamic business location address/city
  const businessLocation = React.useMemo(() => {
    if (!user) return 'Karachi';
    const cityFromShipper = Array.isArray(user.shipper) ? user.shipper[0]?.city : user.shipper?.city;
    const addressFromShipper = Array.isArray(user.shipper) ? user.shipper[0]?.address : user.shipper?.address;
    const cityFromTenant = user.tenant?.city || user.tenant?.address;
    const officeName = Array.isArray(user.offices) ? user.offices[0]?.name : undefined;

    return cityFromShipper || addressFromShipper || cityFromTenant || officeName || 'Karachi';
  }, [user]);

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

        {/* Dynamic Controls: From & To Date Range, Current Date, Business Location */}
        <div className="flex flex-wrap items-center gap-sm">
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

      {/* Stat Grid with Date Filtering */}
      <CourierStats fromDate={fromDate} toDate={toDate} />

      {/* Shipments Table with Date Filtering */}
      <CourierShipmentsTable fromDate={fromDate} toDate={toDate} />

      {/* Bento Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-xl">
        <FleetDistributionMap />
        <LiveOperationsFeed />
      </div>
    </PortalLayout>
  );
}

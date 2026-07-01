'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { CourierStats } from '@/features/courier/ui/CourierStats';
import { FleetDistributionMap } from '@/features/courier/ui/FleetDistributionMap';
import { LiveOperationsFeed } from '@/features/courier/ui/LiveOperationsFeed';
import { CourierShipmentsTable } from '@/features/courier/ui/CourierShipmentsTable';

export default function DashboardPage() {
  const [activeTimeframe, setActiveTimeframe] = React.useState('24h');

  return (
    <PortalLayout>
      {/* Page Header & Filters */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-md">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Logistics Mastery</h1>
          <p className="text-on-surface-variant font-body-md text-body-md">Real-time oversight of global operations</p>
        </div>
        <div className="flex items-center gap-sm">
          <div className="flex bg-white rounded-lg border border-outline-variant p-1 shadow-sm">
            <button
              className={`px-3 py-1.5 rounded text-label-md font-label-md cursor-pointer ${activeTimeframe === '24h'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'hover:bg-surface-container-low'
                }`}
              onClick={() => setActiveTimeframe('24h')}
            >
              24h
            </button>
            <button
              className={`px-3 py-1.5 rounded text-label-md font-label-md cursor-pointer ${activeTimeframe === '7d'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'hover:bg-surface-container-low'
                }`}
              onClick={() => setActiveTimeframe('7d')}
            >
              7d
            </button>
            <button
              className={`px-3 py-1.5 rounded text-label-md font-label-md cursor-pointer ${activeTimeframe === '30d'
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
    </PortalLayout>
  );
}

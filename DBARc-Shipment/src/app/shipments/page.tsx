'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { CourierShipmentsTable } from '@/features/courier/ui/CourierShipmentsTable';

export default function ShipmentsPage() {
  return (
    <PortalLayout>
      <div className="space-y-lg">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md animate-in fade-in duration-200">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Shipments Management</h1>
            <p className="text-on-surface-variant font-body-md text-body-md">
              Manage all shipments, assign to riders, and track delivery status.
            </p>
          </div>
          <button className="bg-primary-container text-on-primary-container py-2.5 px-4 rounded-xl font-semibold flex items-center gap-xs hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer shadow-sm">
            <span className="material-symbols-outlined text-[20px]">group_add</span>
            Bulk Assign
          </button>
        </div>

        {/* Courier Shipments Table Component */}
        <CourierShipmentsTable />
      </div>
    </PortalLayout>
  );
}

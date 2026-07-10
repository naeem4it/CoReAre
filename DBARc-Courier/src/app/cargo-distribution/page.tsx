'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { LoadSheet } from '@/types/generated/load-sheet.types';
import Link from 'next/link';
import { format } from '@/shared/lib/utils';

export default function CargoDistributionPage() {
  const [loadSheets, setLoadSheets] = React.useState<LoadSheet[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = React.useState('');
  
  const fetchCargoDistributions = async () => {
    try {
      setLoading(true);
      const params: any = {
        populate: ['origin_hub', 'destination_hub', 'rider', 'parcels'],
        sort: ['createdAt:desc']
      };
      
      if (statusFilter && statusFilter !== 'All Statuses') {
        params.filters = { status: { $eq: statusFilter } };
      }
      
      const response = await apiClient.get('/load-sheets', { params });
      setLoadSheets(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch cargo distributions:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCargoDistributions();
  }, [statusFilter]);

  const getStatusBadgeColors = (status?: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Dispatched':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'On-Route':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-lg">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">Cargo Distribution (Dispatch)</h1>
          <p className="text-body-md text-secondary mt-1">Manage cargo grouping, route dispatches, and driver assignments.</p>
        </div>
        <div className="flex items-center gap-sm">
          <button className="bg-white border border-outline-variant text-secondary h-10 px-4 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 cursor-pointer shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export List
          </button>
          <Link
            href="/cargo-distribution/create"
            className="bg-primary text-white h-10 px-4 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Dispatch Sheet
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="p-4 border-b border-outline-variant bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              placeholder="Search by Sheet ID, Destination, or Rider..."
              className="w-full bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-4 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
            />
          </div>
          <div className="flex items-center gap-sm w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-outline-variant rounded-lg py-2 px-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Dispatched">Dispatched</option>
              <option value="On-Route">On-Route</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="font-semibold text-label-md text-on-surface-variant p-4 border-b border-outline-variant whitespace-nowrap">Sheet ID</th>
                <th className="font-semibold text-label-md text-on-surface-variant p-4 border-b border-outline-variant whitespace-nowrap">Origin / Dest Hub</th>
                <th className="font-semibold text-label-md text-on-surface-variant p-4 border-b border-outline-variant whitespace-nowrap">Cargo Count</th>
                <th className="font-semibold text-label-md text-on-surface-variant p-4 border-b border-outline-variant whitespace-nowrap">Departure Schedule</th>
                <th className="font-semibold text-label-md text-on-surface-variant p-4 border-b border-outline-variant whitespace-nowrap">Assigned Rider/Driver</th>
                <th className="font-semibold text-label-md text-on-surface-variant p-4 border-b border-outline-variant whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-outline">
                    <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
                    <p className="mt-2 text-sm">Loading dispatches...</p>
                  </td>
                </tr>
              ) : loadSheets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-outline">
                    <span className="material-symbols-outlined text-[48px] mb-2 opacity-20">local_shipping</span>
                    <p className="text-lg font-bold text-on-surface-variant">No cargo distributions found</p>
                    <p className="text-sm mt-1">Adjust filters or create a new dispatch sheet.</p>
                  </td>
                </tr>
              ) : (
                loadSheets.map((sheet) => (
                  <tr key={sheet.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-sm text-primary group-hover:underline">{sheet.sheet_id}</div>
                      <div className="text-xs text-outline">{sheet.date_created ? format(new Date(sheet.date_created), 'MMM d, yyyy') : 'No Date'}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-on-surface font-medium">
                      <div className="flex flex-col">
                        <span>{sheet.origin_hub?.name || 'N/A'}</span>
                        <span className="text-xs text-outline flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">arrow_downward</span> {sheet.destination_hub?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-on-surface font-bold">
                      {sheet.parcels?.length || 0} <span className="font-normal text-outline text-xs ml-1">Parcels</span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-on-surface">
                      {sheet.departure_schedule ? format(new Date(sheet.departure_schedule), 'MMM d, h:mm a') : 'TBD'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-on-surface">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] text-slate-500">person</span>
                        </div>
                        <span className="font-medium">{sheet.rider?.user?.fullName || sheet.rider?.user?.username || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColors(sheet.status)}`}>
                        {sheet.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}

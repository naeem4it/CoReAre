'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { LoadSheet } from '@/types/generated/load-sheet.types';

export default function BulkShipmentPage() {
  const [loadSheets, setLoadSheets] = React.useState<LoadSheet[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = React.useState('');
  
  const fetchLoadSheets = async () => {
    try {
      setLoading(true);
      const params: any = {
        populate: ['origin_hub', 'parcels'],
        sort: ['createdAt:desc']
      };
      
      if (statusFilter && statusFilter !== 'All Statuses') {
        params.filters = { status: { $eq: statusFilter } };
      }
      
      const response = await apiClient.get('/load-sheets', { params });
      setLoadSheets(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch load sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLoadSheets();
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
    <div className="p-lg max-w-[1280px] mx-auto w-full flex flex-col gap-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Load Sheet Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Review and create cargo distribution sheets for scheduled departures.</p>
        </div>
        <div className="flex items-center gap-sm">
          <button className="px-md py-sm border border-outline text-on-surface font-label-md text-label-md rounded hover:bg-surface-container-high transition-colors flex items-center gap-xs active:scale-95">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded hover:opacity-90 transition-colors flex items-center gap-xs active:scale-95 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            Create LoadSheet
          </button>
        </div>
      </div>
      {/* Filters Section (Bento Inspired Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm bg-white p-sm border border-outline-variant rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-xs">
          <label className="font-label-md text-label-md text-outline">Date Range</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">calendar_today</span>
            <input className="w-full pl-xl pr-sm py-xs bg-surface-container-low border border-outline-variant rounded font-body-md text-body-md focus:ring-primary focus:border-primary" type="date" />
          </div>
        </div>
        <div className="flex flex-col gap-xs">
          <label className="font-label-md text-label-md text-outline">Station / Branch</label>
          <select className="w-full px-sm py-xs bg-surface-container-low border border-outline-variant rounded font-body-md text-body-md focus:ring-primary focus:border-primary">
            <option>All Stations</option>
            <option>Central Hub - Karachi</option>
            <option>Northern Depot - Islamabad</option>
          </select>
        </div>
        <div className="flex flex-col gap-xs">
          <label className="font-label-md text-label-md text-outline">Sheet Status</label>
          <select 
            className="w-full px-sm py-xs bg-surface-container-low border border-outline-variant rounded font-body-md text-body-md focus:ring-primary focus:border-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Dispatched">Dispatched</option>
            <option value="On-Route">On-Route</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
        <div className="flex items-end">
          <button 
            onClick={fetchLoadSheets}
            className="w-full py-xs bg-secondary text-on-secondary font-label-md text-label-md rounded hover:bg-on-secondary-fixed-variant transition-colors flex items-center justify-center gap-xs h-[40px]"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            Search Sheets
          </button>
        </div>
      </div>
      {/* Reference Layout Visual (Inspired by Image 3) */}
      <div className="relative rounded-xl overflow-hidden border border-outline-variant shadow-lg h-[240px] group">
        <img alt="Legacy Interface Reference" className="w-full h-full object-cover grayscale opacity-20 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBgeTQoKSKRuq2KSWQ0788l1QkFM8KaVQrt3Qisv18gmt75LKn5ycJ-aIYr4vBvAanKnUzpwS41uLUCfHkLlvOqN3dY2OgNovJw5ntSPQ9RjCUmIQL33piZW7oBR7XkGyxinrIOfAaE6MlxAqfA1Wvj3JHrwYqpxu7BOMf2TzRWDsis0PjQ9ED74ZRFJP3X-GdIcXo4izIgnd5NJOZbdf6-2kasiSO6oKrR00bYkbYYwjYyJU7sa1DL4a3uGzksCK2ZJsawxqmLiU" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-transparent to-surface pointer-events-none"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-xl text-center">
          <span className="bg-primary/10 text-primary px-sm py-xs rounded-full font-label-md text-label-md mb-sm border border-primary/20">Operational Context</span>
          <h3 className="font-display-lg text-display-lg text-on-surface">Precision Freight Management</h3>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-xs">We've modernized the Load Sheet interface for improved legibility and faster data entry, maintaining the core logic of the original system while enhancing visual hierarchy.</p>
        </div>
      </div>
      {/* Data Table Section */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h4 className="font-headline-md text-headline-md text-on-surface">Recent Load Sheets</h4>
          <div className="flex items-center gap-sm">
            <span className="text-label-md font-label-md text-outline">
              Showing {loadSheets.length} sheet{loadSheets.length !== 1 ? 's' : ''}
            </span>
            <div className="flex border border-outline-variant rounded overflow-hidden">
              <button className="px-xs py-xs bg-surface-container-high hover:bg-outline-variant transition-colors border-r border-outline-variant disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="px-xs py-xs bg-surface-container-high hover:bg-outline-variant transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-outline">
              <span className="material-symbols-outlined animate-spin text-[32px] mb-2">refresh</span>
              <p>Loading load sheets...</p>
            </div>
          ) : loadSheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-outline">
              <span className="material-symbols-outlined text-[32px] mb-2">inbox</span>
              <p>No load sheets found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Sheet ID</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Date Created</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Origin Station</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Shipments</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loadSheets.map((sheet) => (
                  <tr key={sheet.id} className="data-table-row transition-colors hover:bg-[#f8fafc]">
                    <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-bold">{sheet.sheet_id || `LS-${sheet.id}`}</td>
                    <td className="px-md py-md font-body-md text-body-md text-on-surface">
                      {sheet.date_created ? new Date(sheet.date_created).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-md py-md font-body-md text-body-md text-on-surface">
                      {sheet.origin_hub?.name || 'N/A'}
                    </td>
                    <td className="px-md py-md font-tabular-nums text-tabular-nums text-on-surface">
                      {sheet.parcels?.length || 0} Units
                    </td>
                    <td className="px-md py-md">
                      <span className={`inline-flex items-center px-sm py-0.5 rounded-full text-label-md font-label-md border ${getStatusBadgeColors(sheet.status)}`}>
                        {sheet.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-md py-md text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary transition-colors p-xs">visibility</button>
                      <button className="material-symbols-outlined text-outline hover:text-primary transition-colors p-xs">print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </PortalLayout>
  );
}

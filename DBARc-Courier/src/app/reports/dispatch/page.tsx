'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';

export default function DispatchReportPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [rows, setRows] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState(0);

  const totalPending = rows.filter(r => !['Delivered', 'Returned', 'Ready To Return'].includes(r.status)).length;
  const estimatedRevenue = rows.reduce((a, r) => a + (Number(r.delivery_charges) || 0), 0);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let url = '/parcels?populate[destination_city]=*&populate[shipper]=*&sort[0]=createdAt:desc&pagination[pageSize]=100';
      if (fromDate) url += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) url += `&filters[createdAt][$lte]=${toDate}T23:59:59`;
      if (searchQuery) url += `&filters[$or][0][tracking_number][$containsi]=${encodeURIComponent(searchQuery)}&filters[$or][1][recipient_name][$containsi]=${encodeURIComponent(searchQuery)}`;

      const res = await apiClient.get(url);
      setRows(res.data?.data || []);
      setTotalCount(res.data?.meta?.pagination?.total || 0);
    } catch (err) {
      console.error('Dispatch report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PortalLayout>
      <div className="flex-1 p-lg max-w-[1280px] w-full mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-base">Dispatch Report</h2>
            <div className="flex items-center gap-xs text-secondary font-body-md text-body-md">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span>Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <div className="flex gap-sm">
            <button className="flex items-center gap-xs px-md py-sm border border-outline-variant bg-white rounded-lg font-label-md text-label-md text-secondary hover:bg-surface-container-low transition-all">
              <span className="material-symbols-outlined">download</span>
              Export PDF
            </button>
            <button className="flex items-center gap-xs px-md py-sm border border-outline-variant bg-white rounded-lg font-label-md text-label-md text-secondary hover:bg-surface-container-low transition-all">
              <span className="material-symbols-outlined">print</span>
              Print Report
            </button>
          </div>
        </div>
        
        {/* Bento Layout Content */}
        <div className="grid grid-cols-12 gap-lg">
          {/* Filters Card (Left Column) */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm sticky top-[96px]">
              <h3 className="font-headline-md text-headline-md text-on-background mb-md">Report Filters</h3>
              <div className="space-y-md">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-secondary uppercase tracking-wider">From Date</label>
                  <div className="relative group">
                    <input 
                      className="w-full border border-outline-variant rounded-lg px-sm py-sm font-body-md text-body-md focus:ring-2 focus:ring-primary outline-none transition-transform duration-200 group-focus-within:scale-[1.02]" 
                      type="date" 
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-secondary uppercase tracking-wider">To Date</label>
                  <div className="relative group">
                    <input 
                      className="w-full border border-outline-variant rounded-lg px-sm py-sm font-body-md text-body-md focus:ring-2 focus:ring-primary outline-none transition-transform duration-200 group-focus-within:scale-[1.02]" 
                      type="date" 
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-secondary uppercase tracking-wider">Search Term</label>
                  <div className="relative group">
                    <input 
                      className="w-full border border-outline-variant rounded-lg px-sm py-sm font-body-md text-body-md focus:ring-2 focus:ring-primary outline-none transition-transform duration-200 group-focus-within:scale-[1.02]" 
                      placeholder="CN, Consignee, Ref..." 
                      type="text"
                    />
                    <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  </div>
                </div>
                <button
                  onClick={fetchReport}
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-sm rounded-lg font-label-md text-label-md font-bold mt-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isLoading ? 'Loading...' : 'Apply Filter'}
                </button>
                <button className="w-full text-primary font-label-md text-label-md font-semibold py-xs hover:underline transition-all">
                  Reset All
                </button>
              </div>
            </div>
          </div>
          
          {/* Report Table / Empty State (Right Column) */}
          <div className="col-span-12 lg:col-span-9 space-y-lg">
            {/* KPI Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                <p className="font-label-md text-label-md text-secondary mb-base">Total Shipments</p>
                <div className="flex items-center gap-sm">
                  <span className="font-headline-lg text-headline-lg text-on-background">{totalCount}</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                <p className="font-label-md text-label-md text-secondary mb-base">Pending Delivery</p>
                <h4 className="font-headline-lg text-headline-lg text-on-background">{totalPending}</h4>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                <p className="font-label-md text-label-md text-secondary mb-base">Estimated Revenue</p>
                <h4 className="font-headline-lg text-headline-lg text-on-background">Rs.{estimatedRevenue.toLocaleString()}</h4>
              </div>
            </div>
            
            {/* Main Data Table Container */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">CN NO. #</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Booking Date</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Arrival Date</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Consignee</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Reference No.</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Destination</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant text-right whitespace-nowrap">Weight</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant text-right whitespace-nowrap">Cash Collect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p, i) => (
                      <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                        <td className="px-md py-sm font-label-md text-primary font-semibold">{p.tracking_number || String(p.id)}</td>
                        <td className="px-md py-sm font-body-md">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="px-md py-sm font-body-md">{p.arrival_date ? new Date(p.arrival_date).toLocaleDateString() : '-'}</td>
                        <td className="px-md py-sm font-body-md">{p.recipient_name || '-'}</td>
                        <td className="px-md py-sm font-body-md">{p.shipper_reference || '-'}</td>
                        <td className="px-md py-sm font-body-md">{p.destination_city?.name || p.destination_city || '-'}</td>
                        <td className="px-md py-sm text-right font-tabular-nums">{p.weight ? `${p.weight} KG` : '-'}</td>
                        <td className="px-md py-sm text-right font-tabular-nums font-semibold">Rs.{Number(p.cod_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {rows.length === 0 && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center p-xl text-center">
                <div className="relative mb-lg group">
                  <div className="absolute inset-0 bg-primary opacity-10 rounded-full blur-3xl scale-150 group-hover:scale-[2] transition-transform duration-700"></div>
                  <img alt="No records found" className="relative z-10 w-full max-w-[400px] h-auto rounded-lg shadow-xl opacity-60 mix-blend-multiply transition-all duration-500 hover:opacity-100 hover:scale-[1.02]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhgXH0g5WJL6k2xvqQ86Y-lwjz6JpTsnYBH8XfSctPF7ZLJ2KA7wf36d6WCE9xwqUj8okw8Y1OgCI7y7B3jIVk7TLp7ll3chkhrunuMnnPJ5CYE6ZfEzGrEMjMpfEQlz-Z_msGqwwBdiJDfY-Dpfe25EqAca0P54S2YsVYXzXd7MOym4hxt1nR1MurEtdtIAAKwyq3txWiPYOiCEZQUgUXXnWPNq0BUceOzyCZZ95DvTLzDMfnpjSAdsC8JntfujuQFmrkQuyh1_4" />
                </div>
                <div className="max-w-[340px] relative z-10">
                  <h3 className="font-headline-md text-headline-md text-on-background mb-sm">No Dispatches Found</h3>
                  <p className="font-body-md text-body-md text-secondary mb-xl">We couldn't find any dispatch records matching your current filter criteria. Try adjusting your dates or search term.</p>
                  <div className="flex justify-center gap-md">
                    <button className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-lg font-label-md text-label-md font-bold hover:shadow-lg transition-all active:scale-95" onClick={() => window.location.reload()}>
                      <span className="material-symbols-outlined">refresh</span>
                      Clear &amp; Refresh
                    </button>
                  </div>
                </div>
              </div>
              )}
              
              {/* Footer / Pagination (Placeholder) */}
              <div className="p-md bg-surface-container-low flex items-center justify-between border-t border-outline-variant">
                <p className="font-label-md text-label-md text-secondary">Showing {rows.length} of {totalCount} entries</p>
                <div className="flex gap-sm">
                  <button className="p-xs rounded-lg border border-outline-variant text-outline opacity-50 cursor-not-allowed" disabled>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button className="p-xs rounded-lg border border-outline-variant text-outline opacity-50 cursor-not-allowed" disabled>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

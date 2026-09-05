'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, UserCheck, Search } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface RiderSummaryRow {
  sNo: number;
  riderCode: string;
  riderName: string;
  totalAlignedCount: number;
  totalAlignedAmount: number;
  outForDeliveryCount: number;
  outForDeliveryAmount: number;
  pendingCount: number;
  pendingAmount: number;
  returnedCount: number;
  returnedAmount: number;
  deliveredCount: number;
  deliveredAmount: number;
  ratio: number;
}

export default function CustomerServiceRidersSummaryPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [summaryData, setSummaryData] = React.useState<RiderSummaryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchRiderSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/parcels?populate[rider]=*&pagination[pageSize]=1000';
      if (fromDate) url += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) url += `&filters[createdAt][$lte]=${toDate}T23:59:59`;

      const res = await apiClient.get(url);
      const parcels: any[] = res.data?.data || [];

      const groups: Record<string, { riderCode: string; riderName: string; parcels: any[] }> = {};
      for (const p of parcels) {
        const rider = p.rider;
        if (!rider) continue;
        const key = String(rider.id);
        if (!groups[key]) {
          groups[key] = {
            riderCode: String(rider.id),
            riderName: rider.name || rider.attributes?.name || `Rider #${rider.id}`,
            parcels: [],
          };
        }
        groups[key].parcels.push(p);
      }

      const rows: RiderSummaryRow[] = Object.values(groups).map((g, i) => {
        const total = g.parcels.length;
        const delivered = g.parcels.filter(p => p.status === 'Delivered').length;
        const returned = g.parcels.filter(p => ['Ready To Return', 'Returned'].includes(p.status)).length;
        const ofd = g.parcels.filter(p => p.status === 'Out For Delivery').length;
        const pending = Math.max(0, total - delivered - returned - ofd);
        const totalAmt = g.parcels.reduce((a, p) => a + (Number(p.cod_amount) || 0), 0);
        const deliveredAmt = g.parcels.filter(p => p.status === 'Delivered').reduce((a, p) => a + (Number(p.cod_amount) || 0), 0);
        return {
          sNo: i + 1,
          riderCode: g.riderCode,
          riderName: g.riderName,
          totalAlignedCount: total,
          totalAlignedAmount: totalAmt,
          outForDeliveryCount: ofd,
          outForDeliveryAmount: g.parcels.filter(p => p.status === 'Out For Delivery').reduce((a, p) => a + (Number(p.cod_amount) || 0), 0),
          pendingCount: pending,
          pendingAmount: 0,
          returnedCount: returned,
          returnedAmount: g.parcels.filter(p => ['Ready To Return', 'Returned'].includes(p.status)).reduce((a, p) => a + (Number(p.cod_amount) || 0), 0),
          deliveredCount: delivered,
          deliveredAmount: deliveredAmt,
          ratio: total > 0 ? Math.round((delivered / total) * 100) : 0,
        };
      });

      rows.sort((a, b) => b.deliveredCount - a.deliveredCount);
      setSummaryData(rows);
    } catch (err) {
      console.error('Failed to load rider summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  React.useEffect(() => { fetchRiderSummary(); }, [fetchRiderSummary]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery) return summaryData;
    return summaryData.filter(row =>
      row.riderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.riderCode.includes(searchQuery)
    );
  }, [summaryData, searchQuery]);

  const handleExportExcel = () => {
    const header = 'Rider Code,Rider Name,Total Aligned,Out For Delivery,Pending,Returned,Delivered,Ratio %\n';
    const rows = filteredData.map(r => `"${r.riderCode}","${r.riderName}",${r.totalAlignedCount},${r.outForDeliveryCount},${r.pendingCount},${r.returnedCount},${r.deliveredCount},${r.ratio}%`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riders_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">

        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">CustomerService / Riders Summary</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRiderSummary()}
              disabled={isLoading}
              className="bg-primary hover:bg-primary-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isLoading ? 'Loading...' : 'Apply Filters'}
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Filters Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by rider code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Rider Performance Summary ({filteredData.length} Riders)
            </span>
            {isLoading && <span className="text-xs text-slate-400 font-normal animate-pulse">Loading data...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">S.No#</th>
                  <th className="p-3.5">Rider Code</th>
                  <th className="p-3.5">Rider Name</th>
                  <th className="p-3.5 text-center bg-slate-200">Total Aligned</th>
                  <th className="p-3.5 text-center">Out For Delivery</th>
                  <th className="p-3.5 text-center">Pending</th>
                  <th className="p-3.5 text-center">Returned</th>
                  <th className="p-3.5 text-center bg-emerald-50 text-emerald-800">Delivered</th>
                  <th className="p-3.5 text-center bg-amber-50 text-amber-900">Ratio %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      {isLoading ? 'Loading rider performance data...' : 'No rider data available. Select a date range and apply filters.'}
                    </td>
                  </tr>
                ) : filteredData.map((r) => (
                  <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-400">{r.sNo}</td>
                    <td className="p-3.5 font-bold font-mono text-slate-900">{r.riderCode}</td>
                    <td className="p-3.5 font-bold text-slate-900">{r.riderName}</td>
                    <td className="p-3.5 text-center font-bold bg-slate-50">
                      <div>{r.totalAlignedCount}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Rs.{r.totalAlignedAmount.toLocaleString()}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div>{r.outForDeliveryCount}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Rs.{r.outForDeliveryAmount.toLocaleString()}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div>{r.pendingCount}</div>
                    </td>
                    <td className="p-3.5 text-center text-red-600">
                      <div>{r.returnedCount}</div>
                      <div className="text-[10px] font-normal">Rs.{r.returnedAmount.toLocaleString()}</div>
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-700 bg-emerald-50/50">
                      <div>{r.deliveredCount}</div>
                      <div className="text-[10px] text-emerald-600 font-normal">Rs.{r.deliveredAmount.toLocaleString()}</div>
                    </td>
                    <td className="p-3.5 text-center font-black text-amber-700 bg-amber-50/50 text-sm">
                      {r.ratio}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}

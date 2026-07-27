'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, Search, UserCheck, TrendingUp } from 'lucide-react';

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

const RIDER_SUMMARY_DATA: RiderSummaryRow[] = [
  {
    sNo: 1,
    riderCode: '2022',
    riderName: 'Zulqadar',
    totalAlignedCount: 159,
    totalAlignedAmount: 588476,
    outForDeliveryCount: 26,
    outForDeliveryAmount: 102372,
    pendingCount: 7,
    pendingAmount: 25858,
    returnedCount: 0,
    returnedAmount: 0,
    deliveredCount: 126,
    deliveredAmount: 460246,
    ratio: 79
  },
  {
    sNo: 2,
    riderCode: '2038',
    riderName: 'M Ahmad Raza',
    totalAlignedCount: 105,
    totalAlignedAmount: 472896,
    outForDeliveryCount: 0,
    outForDeliveryAmount: 0,
    pendingCount: 26,
    pendingAmount: 108701,
    returnedCount: 0,
    returnedAmount: 0,
    deliveredCount: 79,
    deliveredAmount: 364195,
    ratio: 75
  },
  {
    sNo: 3,
    riderCode: '2095',
    riderName: 'Muhammad Sheraz',
    totalAlignedCount: 132,
    totalAlignedAmount: 477917,
    outForDeliveryCount: 20,
    outForDeliveryAmount: 80855,
    pendingCount: 15,
    pendingAmount: 57102,
    returnedCount: 0,
    returnedAmount: 0,
    deliveredCount: 97,
    deliveredAmount: 339960,
    ratio: 73
  },
  {
    sNo: 4,
    riderCode: '2851',
    riderName: 'Hamza Baloch',
    totalAlignedCount: 98,
    totalAlignedAmount: 340500,
    outForDeliveryCount: 5,
    outForDeliveryAmount: 15000,
    pendingCount: 4,
    pendingAmount: 12000,
    returnedCount: 2,
    returnedAmount: 6500,
    deliveredCount: 87,
    deliveredAmount: 307000,
    ratio: 88
  }
];

export default function CustomerServiceRidersSummaryPage() {
  const [fromDate, setFromDate] = React.useState('2026-06-01');
  const [toDate, setToDate] = React.useState('2026-06-06');
  const [selectedCity, setSelectedCity] = React.useState('Lahore');
  const [selectedRider, setSelectedRider] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredData = React.useMemo(() => {
    return RIDER_SUMMARY_DATA.filter(row => {
      const matchRider = selectedRider === 'ALL' || row.riderName.toLowerCase().includes(selectedRider.toLowerCase());
      const matchSearch = row.riderName.toLowerCase().includes(searchQuery.toLowerCase()) || row.riderCode.includes(searchQuery);
      return matchRider && matchSearch;
    });
  }, [selectedRider, searchQuery]);

  const handleExportExcel = () => {
    const header = "Rider Code,Rider Name,Total Shipments Aligned,Out For Delivery,Pending,Returned,Delivered,Delivery Ratio %\n";
    const rows = filteredData.map(r => `"${r.riderCode}","${r.riderName}",${r.totalAlignedCount},${r.outForDeliveryCount},${r.pendingCount},${r.returnedCount},${r.deliveredCount},${r.ratio}%`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riders_Summary_Report_${fromDate}_to_${toDate}.csv`;
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
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Filters Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="Lahore">Lahore</option>
                <option value="Karachi">Karachi</option>
                <option value="Rawalpindi">Rawalpindi</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rider</label>
              <select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">ALL Riders</option>
                <option value="Zulqadar">Zulqadar (2022)</option>
                <option value="M Ahmad Raza">M Ahmad Raza (2038)</option>
                <option value="Muhammad Sheraz">Muhammad Sheraz (2095)</option>
                <option value="Hamza Baloch">Hamza Baloch (2851)</option>
              </select>
            </div>
          </div>

          <div className="relative pt-2">
            <Search className="w-4 h-4 absolute left-3 top-[18px] text-slate-400" />
            <input
              type="text"
              placeholder="Search by rider code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Rider Performance Summary ({filteredData.length} Riders)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">S.No#</th>
                  <th className="p-3.5">Rider Code</th>
                  <th className="p-3.5">Rider Name</th>
                  <th className="p-3.5 text-center bg-slate-200">Total Shipments Aligned</th>
                  <th className="p-3.5 text-center">Shipments Out for Delivery</th>
                  <th className="p-3.5 text-center">Shipments Pending</th>
                  <th className="p-3.5 text-center">Shipments Returned</th>
                  <th className="p-3.5 text-center bg-emerald-50 text-emerald-800">Shipments Delivered</th>
                  <th className="p-3.5 text-center bg-amber-50 text-amber-900">Delivery Ratio %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.map((r) => (
                  <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-400">{r.sNo}</td>
                    <td className="p-3.5 font-bold font-mono text-slate-900">{r.riderCode}</td>
                    <td className="p-3.5 font-bold text-slate-900">{r.riderName}</td>
                    <td className="p-3.5 text-center font-bold bg-slate-50">
                      <div>{r.totalAlignedCount}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Rs.{r.totalAlignedAmount}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div>{r.outForDeliveryCount}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Rs.{r.outForDeliveryAmount}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div>{r.pendingCount}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Rs.{r.pendingAmount}</div>
                    </td>
                    <td className="p-3.5 text-center text-red-600">
                      <div>{r.returnedCount}</div>
                      <div className="text-[10px] font-normal">Rs.{r.returnedAmount}</div>
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-700 bg-emerald-50/50">
                      <div>{r.deliveredCount}</div>
                      <div className="text-[10px] text-emerald-600 font-normal">Rs.{r.deliveredAmount}</div>
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

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, Search, FileSpreadsheet, DollarSign } from 'lucide-react';

interface OperationsOrderRow {
  sNo: number;
  shipper: string;
  flyCn: string;
  tplCn: string;
  tplName: string;
  origin: string;
  dest: string;
  bookingDate: string;
  arrivalDate: string;
  statusDate: string;
  status: string;
  weight: number;
  chargedWt: number;
  cod: number;
  charges: number;
  tplCharges: number;
  profitLoss: number;
  invoice: string;
}

const ORDER_REPORT_DATA: OperationsOrderRow[] = [
  {
    sNo: 1,
    shipper: 'Wears Clothing',
    flyCn: '400796333',
    tplCn: '22320663494071',
    tplName: 'Trax',
    origin: 'LHE',
    dest: 'NPR',
    bookingDate: '2026-06-02',
    arrivalDate: '2026-06-02',
    statusDate: '2026-06-04',
    status: 'Delivered',
    weight: 1.0,
    chargedWt: 1.0,
    cod: 2049,
    charges: 201,
    tplCharges: 0,
    profitLoss: 201,
    invoice: 'Invoice Generated'
  },
  {
    sNo: 2,
    shipper: 'Wears Clothing',
    flyCn: '400796328',
    tplCn: '22328963494023',
    tplName: 'Trax',
    origin: 'LHE',
    dest: 'RLK',
    bookingDate: '2026-06-02',
    arrivalDate: '2026-06-02',
    statusDate: '2026-06-04',
    status: 'Delivered',
    weight: 1.0,
    chargedWt: 1.0,
    cod: 620,
    charges: 201,
    tplCharges: 0,
    profitLoss: 201,
    invoice: 'Invoice Pending'
  },
  {
    sNo: 3,
    shipper: 'Dr. Arooba Organics Lahore',
    flyCn: '400798861',
    tplCn: '3PL-994812',
    tplName: 'Leopard',
    origin: 'LHE',
    dest: 'KHI',
    bookingDate: '2026-06-03',
    arrivalDate: '2026-06-03',
    statusDate: '2026-06-05',
    status: 'Delivered',
    weight: 0.8,
    chargedWt: 0.8,
    cod: 1850,
    charges: 180,
    tplCharges: 110,
    profitLoss: 70,
    invoice: 'Invoice Generated'
  }
];

export default function CustomerServiceOrderReportPage() {
  const [fromDate, setFromDate] = React.useState('2026-06-01');
  const [toDate, setToDate] = React.useState('2026-06-06');
  const [selectedCustomer, setSelectedCustomer] = React.useState('Wears Clothing');
  const [selectedStatus, setSelectedStatus] = React.useState('All');
  const [originCity, setOriginCity] = React.useState('ALL');
  const [destinationCity, setDestinationCity] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredData = React.useMemo(() => {
    return ORDER_REPORT_DATA.filter(r => {
      const matchCustomer = selectedCustomer === 'ALL' || r.shipper.toLowerCase().includes(selectedCustomer.toLowerCase());
      const matchStatus = selectedStatus === 'All' || r.status === selectedStatus;
      const matchOrigin = originCity === 'ALL' || r.origin === originCity;
      const matchDest = destinationCity === 'ALL' || r.dest === destinationCity;
      const matchSearch = r.flyCn.includes(searchQuery) || r.tplCn.includes(searchQuery) || r.shipper.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCustomer && matchStatus && matchOrigin && matchDest && matchSearch;
    });
  }, [selectedCustomer, selectedStatus, originCity, destinationCity, searchQuery]);

  const handleExportExcel = () => {
    const header = "Shipper,Fly CN#,TPL CN#,TPL Name,Origin,Dest,Booking Date,Arrival Date,Status Date,Status,Weight,Charged Wt,COD,Charges,TPL Charges,Profit/Loss,Invoice\n";
    const rows = filteredData.map(r => `"${r.shipper}","${r.flyCn}","${r.tplCn}","${r.tplName}","${r.origin}","${r.dest}","${r.bookingDate}","${r.arrivalDate}","${r.statusDate}","${r.status}",${r.weight},${r.chargedWt},${r.cod},${r.charges},${r.tplCharges},${r.profitLoss},"${r.invoice}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Operations_Order_Report_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">CustomerService / Order report</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">ALL Customers</option>
                <option value="Wears Clothing">Wears Clothing</option>
                <option value="Dr. Arooba Organics Lahore">Dr. Arooba Organics Lahore</option>
                <option value="Dari Mooch Cash">Dari Mooch Cash</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Delivered">Delivered</option>
                <option value="Ready To Return">Ready To Return</option>
                <option value="Out For Delivery">Out For Delivery</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Origin / Dest City</label>
              <div className="flex items-center gap-1">
                <select
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl py-2 px-2 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="ALL">Origin: ALL</option>
                  <option value="LHE">LHE</option>
                  <option value="KHI">KHI</option>
                </select>
                <select
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl py-2 px-2 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="ALL">Dest: ALL</option>
                  <option value="NPR">NPR</option>
                  <option value="RLK">RLK</option>
                  <option value="KHI">KHI</option>
                </select>
              </div>
            </div>
          </div>

          <div className="relative pt-2">
            <Search className="w-4 h-4 absolute left-3 top-[18px] text-slate-400" />
            <input
              type="text"
              placeholder="Search Fly CN#, 3PL CN#, or shipper..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Order Operations Report ({filteredData.length} Entries)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">S.No</th>
                  <th className="p-3">Shipper</th>
                  <th className="p-3">Fly CN#</th>
                  <th className="p-3">3PL CN#</th>
                  <th className="p-3">3PL Name</th>
                  <th className="p-3 text-center">Origin</th>
                  <th className="p-3 text-center">Dest</th>
                  <th className="p-3">Booking Date</th>
                  <th className="p-3">Arrival Date</th>
                  <th className="p-3">Status Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Weight</th>
                  <th className="p-3 text-center">Charged Wt</th>
                  <th className="p-3 text-right">COD</th>
                  <th className="p-3 text-right">Charges</th>
                  <th className="p-3 text-right">3PL Charges</th>
                  <th className="p-3 text-right text-emerald-700">Profit/Loss</th>
                  <th className="p-3">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.map((r) => (
                  <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-400">{r.sNo}</td>
                    <td className="p-3 font-bold text-slate-900">{r.shipper}</td>
                    <td className="p-3 font-bold text-primary">{r.flyCn}</td>
                    <td className="p-3 font-mono text-slate-600">{r.tplCn}</td>
                    <td className="p-3 font-bold text-slate-700">{r.tplName}</td>
                    <td className="p-3 text-center font-bold">{r.origin}</td>
                    <td className="p-3 text-center font-bold">{r.dest}</td>
                    <td className="p-3 text-slate-600">{r.bookingDate}</td>
                    <td className="p-3 text-slate-600">{r.arrivalDate}</td>
                    <td className="p-3 text-slate-600">{r.statusDate}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">{r.weight.toFixed(2)}</td>
                    <td className="p-3 text-center">{r.chargedWt.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">Rs.{r.cod}</td>
                    <td className="p-3 text-right text-slate-700">Rs.{r.charges}</td>
                    <td className="p-3 text-right text-slate-700">Rs.{r.tplCharges}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">Rs.{r.profitLoss}</td>
                    <td className="p-3 text-slate-500">{r.invoice}</td>
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

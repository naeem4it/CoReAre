'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, Search, RefreshCw, Filter, Package } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { 
  SHIPMENT_STATUSES, 
  ALL_12_SHIPMENT_STATUSES, 
  normalizeShipmentStatus, 
  getDbStatusQueryValues 
} from '@/shared/constants/shipment-statuses';

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

export default function CustomerServiceOrderReportPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState('All');
  const [originCity, setOriginCity] = React.useState('ALL');
  const [destinationCity, setDestinationCity] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [reportData, setReportData] = React.useState<OperationsOrderRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchReport = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/parcels?populate[shipper]=*&populate[destination_city]=*&populate[source_city]=*&populate[pickup_location][populate]=*&pagination[pageSize]=1000&sort[0]=createdAt:desc';
      if (fromDate) url += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) url += `&filters[createdAt][$lte]=${toDate}T23:59:59`;

      if (selectedStatus !== 'All') {
        const dbVals = getDbStatusQueryValues(selectedStatus);
        const statusQ = dbVals.map((v, idx) => `filters[status][$in][${idx}]=${encodeURIComponent(v)}`).join('&');
        url += `&${statusQ}`;
      }

      const res = await apiClient.get(url);
      const parcels: any[] = res.data?.data || [];

      const rows: OperationsOrderRow[] = parcels.map((p, i) => {
        const canonicalStatus = normalizeShipmentStatus(p.status);

        return {
          sNo: i + 1,
          shipper: p.shipper?.name || p.pickup_location?.shipper?.name || 'Unknown',
          flyCn: p.tracking_number || String(p.id),
          tplCn: p.poly_tracking || p.tpl_tracking || '-',
          tplName: p.tpl_name || p.carrier || '-',
          origin: p.source_city?.name || p.source_city?.CityName || p.pickup_location?.city?.name || 'N/A',
          dest: p.destination_city?.name || p.destination_city?.CityName || p.destination_city || 'N/A',
          bookingDate: p.createdAt ? p.createdAt.split('T')[0] : '',
          arrivalDate: p.arrival_date ? p.arrival_date.split('T')[0] : '',
          statusDate: p.updatedAt ? p.updatedAt.split('T')[0] : '',
          status: canonicalStatus,
          weight: Number(p.weight) || 0,
          chargedWt: Number(p.charged_weight) || Number(p.weight) || 0,
          cod: Number(p.cod_amount) || 0,
          charges: Number(p.delivery_charges) || 0,
          tplCharges: Number(p.tpl_charges) || 0,
          profitLoss: (Number(p.delivery_charges) || 0) - (Number(p.tpl_charges) || 0),
          invoice: p.invoice ? 'Invoice Generated' : 'Invoice Pending',
        };
      });

      setReportData(rows);
    } catch (err) {
      console.error('Failed to load order report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, selectedStatus]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const customerOptions = React.useMemo(() => {
    return Array.from(new Set(reportData.map(r => r.shipper).filter(Boolean))).sort();
  }, [reportData]);

  const originCityOptions = React.useMemo(() => {
    return Array.from(new Set(reportData.map(r => r.origin).filter(o => o && o !== 'N/A'))).sort();
  }, [reportData]);

  const destinationCityOptions = React.useMemo(() => {
    return Array.from(new Set(reportData.map(r => r.dest).filter(d => d && d !== 'N/A'))).sort();
  }, [reportData]);

  const filteredData = React.useMemo(() => {
    return reportData.filter(r => {
      const matchCustomer = selectedCustomer === 'ALL' || r.shipper.toLowerCase().includes(selectedCustomer.toLowerCase());
      const matchOrigin = originCity === 'ALL' || r.origin.toLowerCase() === originCity.toLowerCase();
      const matchDest = destinationCity === 'ALL' || r.dest.toLowerCase() === destinationCity.toLowerCase();
      const matchStatus = selectedStatus === 'All' || r.status === selectedStatus;
      const matchSearch = !searchQuery || (
        r.flyCn.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.tplCn.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.shipper.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchCustomer && matchOrigin && matchDest && matchStatus && matchSearch;
    });
  }, [reportData, selectedCustomer, originCity, destinationCity, selectedStatus, searchQuery]);

  const handleExportExcel = () => {
    const header = "Shipper,Fly CN#,TPL CN#,TPL Name,Origin,Dest,Booking Date,Arrival Date,Status Date,Status,Weight,Charged Wt,COD,Charges,TPL Charges,Profit/Loss,Invoice\n";
    const rows = filteredData.map(r => `"${r.shipper}","${r.flyCn}","${r.tplCn}","${r.tplName}","${r.origin}","${r.dest}","${r.bookingDate}","${r.arrivalDate}","${r.statusDate}","${r.status}",${r.weight},${r.chargedWt},${r.cod},${r.charges},${r.tplCharges},${r.profitLoss},"${r.invoice}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Operations_Order_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case SHIPMENT_STATUSES.DELIVERED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case SHIPMENT_STATUSES.OUT_FOR_DELIVERY:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case SHIPMENT_STATUSES.IN_TRANSIT:
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case SHIPMENT_STATUSES.ARRIVED_ORIGIN:
      case SHIPMENT_STATUSES.ARRIVED_DEST:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case SHIPMENT_STATUSES.PICKED_UP_BY_RIDER:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case SHIPMENT_STATUSES.NOT_ARRIVED:
      case SHIPMENT_STATUSES.DELIVERY_FAILED:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case SHIPMENT_STATUSES.READY_FOR_RETURN:
      case SHIPMENT_STATUSES.RETURN_TO_SHIPPER:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case SHIPMENT_STATUSES.LOST_DAMAGE:
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">Customer Service / Order Report</h1>
            <p className="text-xs text-slate-400">Master reporting view displaying all 12 operational shipment lifecycle statuses.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => fetchReport()}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
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
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer / Shipper</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">ALL Customers</option>
                {customerOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Filter with all 12 statuses */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shipment Status (All 12)</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="All">All 12 Statuses</option>
                {ALL_12_SHIPMENT_STATUSES.map((s, idx) => (
                  <option key={s} value={s}>{idx + 1}. {s}</option>
                ))}
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
                  {originCityOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <select
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl py-2 px-2 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="ALL">Dest: ALL</option>
                  {destinationCityOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="relative pt-2">
            <Search className="w-4 h-4 absolute left-3 top-[18px] text-slate-400" />
            <input
              type="text"
              placeholder="Search Fly CN#, 3PL CN#, or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Order Operations Master Report ({filteredData.length} Entries)</span>
            {isLoading && <span className="text-xs text-slate-400 font-normal animate-pulse">Loading orders...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">S.No</th>
                  <th className="p-3">Shipper</th>
                  <th className="p-3">Fly CN#</th>
                  <th className="p-3">3PL CN#</th>
                  <th className="p-3 text-center">Origin</th>
                  <th className="p-3 text-center">Dest</th>
                  <th className="p-3">Booking Date</th>
                  <th className="p-3">Arrival Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Weight</th>
                  <th className="p-3 text-right">COD</th>
                  <th className="p-3 text-right">Charges</th>
                  <th className="p-3 text-right text-emerald-700">Profit/Loss</th>
                  <th className="p-3">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-400">
                      {isLoading ? 'Loading order report data...' : 'No orders matched the selected filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((r) => (
                    <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-400">{r.sNo}</td>
                      <td className="p-3 font-bold text-slate-900">{r.shipper}</td>
                      <td className="p-3 font-bold font-mono text-primary">{r.flyCn}</td>
                      <td className="p-3 font-mono text-slate-600">{r.tplCn}</td>
                      <td className="p-3 text-center font-bold">{r.origin}</td>
                      <td className="p-3 text-center font-bold">{r.dest}</td>
                      <td className="p-3 text-slate-600">{r.bookingDate}</td>
                      <td className="p-3 text-slate-600">{r.arrivalDate || '-'}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">{r.weight.toFixed(2)} kg</td>
                      <td className="p-3 text-right font-bold text-slate-900">Rs.{r.cod.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-700">Rs.{r.charges.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">Rs.{r.profitLoss.toLocaleString()}</td>
                      <td className="p-3 text-slate-500">{r.invoice}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}

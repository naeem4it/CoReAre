'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { Download, RefreshCw } from 'lucide-react';

interface InvoiceLedgerRow {
  id: string;
  cnNo: string;
  bookDate: string;
  arrivalDate: string;
  consignee: string;
  origin: string;
  destination: string;
  weight: number;
  cashCollect: number;
  serviceCharges: number;
}

export default function MonthlyInvoiceReportPage() {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

  const [fromDate, setFromDate] = React.useState(defaultFrom);
  const [toDate, setToDate] = React.useState(defaultTo);
  const [rows, setRows] = React.useState<InvoiceLedgerRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 25;

  // KPI computed from loaded data
  const totalRevenue = rows.reduce((a, r) => a + r.cashCollect, 0);
  const totalCharges = rows.reduce((a, r) => a + r.serviceCharges, 0);

  const fetchReport = React.useCallback(async (pg = 1) => {
    setIsLoading(true);
    try {
      let url = `/parcels?populate[origin_city]=*&populate[destination_city]=*&populate[shipper]=*&pagination[page]=${pg}&pagination[pageSize]=${PAGE_SIZE}&sort[0]=createdAt:desc`;
      if (fromDate) url += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) url += `&filters[createdAt][$lte]=${toDate}T23:59:59`;

      const res = await apiClient.get(url);
      const parcels: any[] = res.data?.data || [];
      setTotalCount(res.data?.meta?.pagination?.total || 0);

      const mapped: InvoiceLedgerRow[] = parcels.map(p => ({
        id: String(p.id),
        cnNo: p.tracking_number || String(p.id),
        bookDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        arrivalDate: p.arrival_date ? new Date(p.arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending',
        consignee: p.recipient_name || p.shipper?.name || '-',
        origin: p.origin_city?.name || p.pickup_location?.city?.name || 'N/A',
        destination: p.destination_city?.name || p.destination_city || 'N/A',
        weight: Number(p.weight) || 0,
        cashCollect: Number(p.cod_amount) || 0,
        serviceCharges: Number(p.delivery_charges) || 0,
      }));

      setRows(mapped);
      setPage(pg);
    } catch (err) {
      console.error('Monthly invoice error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  React.useEffect(() => { fetchReport(1); }, [fetchReport]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Revenue breakdown by destination
  const cityBreakdown = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.destination] = (map[r.destination] || 0) + r.cashCollect;
    }
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([city, amt]) => ({ city, amt, pct: Math.round((amt / max) * 100) }));
  }, [rows]);

  return (
    <PortalLayout>
      <div className="flex-1 overflow-y-auto p-lg space-y-lg">
        {/* Page Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-background">Monthly Invoice Report</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Review and manage logistical revenue for the current billing cycle.</p>
          </div>
          <div className="flex flex-wrap items-end gap-sm">
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">Date From</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="h-[40px] px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">Date To</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="h-[40px] px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <button
              onClick={() => fetchReport(1)}
              disabled={isLoading}
              className="h-[40px] px-md bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center gap-xs transition-all hover:opacity-90 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Generate'}
            </button>
            <button className="h-[40px] px-md bg-surface-container-high hover:bg-surface-container-highest rounded-lg font-label-md text-label-md flex items-center gap-xs transition-all">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Bento Grid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          {/* Total Revenue KPI */}
          <div className="col-span-1 md:col-span-2 bg-primary text-on-primary p-md rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="absolute top-0 right-0 p-lg opacity-10">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
            <div className="relative z-10">
              <p className="font-label-md text-label-md uppercase tracking-widest opacity-80">Total COD Collection</p>
              <h3 className="font-display-lg text-[48px] leading-tight font-black">
                {isLoading ? '...' : `Rs.${totalRevenue.toLocaleString()}`}
              </h3>
            </div>
            <div className="relative z-10 flex items-center gap-xs mt-md">
              <span className="bg-primary-container text-on-primary-container px-xs py-0.5 rounded text-[10px] font-bold">
                {totalCount} Parcels
              </span>
              <span className="text-[12px] opacity-70">in selected period</span>
            </div>
          </div>
          {/* Total Parcels KPI */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-secondary-container text-on-secondary-container rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <span className="text-secondary font-bold text-[12px]">{rows.length} loaded</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Total Parcels</p>
              <h3 className="font-headline-lg text-headline-lg">{isLoading ? '...' : totalCount.toLocaleString()}</h3>
            </div>
          </div>
          {/* Service Charges KPI */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-tertiary-fixed text-on-tertiary-fixed rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Service Charges</p>
              <h3 className="font-headline-lg text-headline-lg">{isLoading ? '...' : `Rs.${totalCharges.toLocaleString()}`}</h3>
            </div>
          </div>
        </div>

        {/* Invoice Ledger Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-md py-sm border-b border-outline-variant flex items-center justify-between">
            <h4 className="font-headline-md text-headline-md">Invoice Ledger</h4>
            <div className="flex items-center gap-xs">
              <button onClick={() => fetchReport(page)} className="p-xs hover:bg-surface-container-low rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">refresh</span>
              </button>
            </div>
          </div>
          <div className="invoice-ledger-container overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm font-label-md text-label-md text-outline">CN NO #</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Booking Date</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Arrival Date</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Consignee</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Origin</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Destination</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline text-right">Weight</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline text-right">Cash Collect</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline text-right">Service Charges</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-md py-12 text-center text-on-surface-variant">
                      {isLoading ? 'Loading invoice data...' : 'No invoice records found for this period. Select a date range and click Generate.'}
                    </td>
                  </tr>
                ) : rows.map(r => (
                  <tr key={r.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                    <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-semibold">{r.cnNo}</td>
                    <td className="px-md py-md">{r.bookDate}</td>
                    <td className="px-md py-md">{r.arrivalDate}</td>
                    <td className="px-md py-md">{r.consignee}</td>
                    <td className="px-md py-md">{r.origin}</td>
                    <td className="px-md py-md">{r.destination}</td>
                    <td className="px-md py-md text-right font-tabular-nums">{r.weight ? `${r.weight} kg` : '-'}</td>
                    <td className="px-md py-md text-right font-tabular-nums">Rs.{r.cashCollect.toLocaleString()}</td>
                    <td className="px-md py-md text-right font-tabular-nums">Rs.{r.serviceCharges.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-surface-container-low font-bold">
                    <td className="px-md py-sm text-right font-label-md text-label-md uppercase tracking-wider" colSpan={7}>Page Total</td>
                    <td className="px-md py-sm text-right font-tabular-nums text-primary">Rs.{rows.reduce((a, r) => a + r.cashCollect, 0).toLocaleString()}</td>
                    <td className="px-md py-sm text-right font-tabular-nums text-primary">Rs.{rows.reduce((a, r) => a + r.serviceCharges, 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Pagination */}
          <div className="px-md py-sm border-t border-outline-variant flex items-center justify-between">
            <p className="font-label-md text-label-md text-outline">Showing {rows.length} of {totalCount.toLocaleString()} results</p>
            <div className="flex items-center gap-xs">
              <button
                onClick={() => fetchReport(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-low disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="font-bold text-sm px-2">{page} / {totalPages}</span>
              <button
                onClick={() => fetchReport(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isLoading}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-low disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
            <h5 className="font-headline-md text-headline-md mb-md">Revenue Breakdown by Destination</h5>
            <div className="space-y-sm">
              {cityBreakdown.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No data available. Generate report to see breakdown.</p>
              ) : cityBreakdown.map(({ city, amt, pct }) => (
                <div key={city} className="flex flex-col gap-base">
                  <div className="flex justify-between font-label-md text-label-md">
                    <span>{city}</span>
                    <span className="font-tabular-nums">Rs.{amt.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-center items-center text-center space-y-sm">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>
            <h5 className="font-headline-md text-headline-md">Monthly Report</h5>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[300px]">
              Select a date range and click Generate to load invoice records for reconciliation.
            </p>
            <button onClick={() => fetchReport(1)} className="text-primary font-bold hover:underline">
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

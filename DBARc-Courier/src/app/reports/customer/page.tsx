'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, RefreshCw } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface CustomerReportRow {
  id: string;
  sNo: number;
  trackingNumber: string;
  invoiceNo: string;
  bookDate: string;
  arrivalDate: string;
  vendor: string;
  reference: string;
  consigneeName: string;
  consigneeAddress: string;
  status: string;
  cod: number;
}

export default function CustomerReportPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [selectedCity, setSelectedCity] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [rows, setRows] = React.useState<CustomerReportRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 25;

  const fetchReport = React.useCallback(async (pg = 1) => {
    setIsLoading(true);
    try {
      let url = `/parcels?populate[shipper]=*&populate[destination_city]=*&pagination[page]=${pg}&pagination[pageSize]=${PAGE_SIZE}&sort[0]=createdAt:desc`;
      if (fromDate) url += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) url += `&filters[createdAt][$lte]=${toDate}T23:59:59`;
      if (selectedStatus) url += `&filters[status][$eq]=${encodeURIComponent(selectedStatus)}`;
      if (selectedCity) url += `&filters[destination_city][name][$eq]=${encodeURIComponent(selectedCity)}`;

      const res = await apiClient.get(url);
      const parcels: any[] = res.data?.data || [];
      setTotalCount(res.data?.meta?.pagination?.total || 0);

      const mapped: CustomerReportRow[] = parcels.map((p, i) => ({
        id: String(p.id),
        sNo: (pg - 1) * PAGE_SIZE + i + 1,
        trackingNumber: p.tracking_number || String(p.id),
        invoiceNo: p.invoice?.invoice_number || p.invoice_no || '-',
        bookDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        arrivalDate: p.arrival_date ? new Date(p.arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : p.status === 'Arrived' ? 'Arrived' : '-',
        vendor: p.tpl_name || p.carrier || p.shipper?.name || 'Own Fleet',
        reference: p.shipper_reference || p.reference || '-',
        consigneeName: p.recipient_name || '-',
        consigneeAddress: p.recipient_address || '-',
        status: p.status || '-',
        cod: Number(p.cod_amount) || 0,
      }));

      setRows(mapped);
      setPage(pg);
    } catch (err) {
      console.error('Failed to load customer report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, selectedCity, selectedStatus]);

  React.useEffect(() => { fetchReport(1); }, [fetchReport]);

  const handleExportCSV = () => {
    const header = 'S.No,Tracking #,Invoice #,Book Date,Arr. Date,Vendor,Reference,Consignee Name,Consignee Address,Status,COD\n';
    const data = rows.map(r => `${r.sNo},"${r.trackingNumber}","${r.invoiceNo}","${r.bookDate}","${r.arrivalDate}","${r.vendor}","${r.reference}","${r.consigneeName}","${r.consigneeAddress}","${r.status}",${r.cod}`).join('\n');
    const blob = new Blob([header + data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <PortalLayout>
      <div className="flex-1 w-full max-w-[1280px] mx-auto p-lg pb-16">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Detailed Customers Report</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Review comprehensive logistical data and customer performance metrics.</p>
          </div>
          <div className="flex items-center gap-sm">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-xs px-md py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-semibold hover:bg-surface-container-low transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => fetchReport(1)}
              disabled={isLoading}
              className="flex items-center gap-xs px-md py-2 bg-primary text-on-primary rounded-lg text-body-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Report Criteria Section */}
        <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm mb-lg">
          <div className="flex items-center gap-xs mb-md border-b border-outline-variant pb-sm">
            <span className="material-symbols-outlined text-primary">filter_alt</span>
            <h3 className="font-headline-md text-headline-md">Report Criteria</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">DATE FROM</label>
              <input className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">DATE TO</label>
              <input className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">SELECT CITY</label>
              <select className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                <option value="">All Cities</option>
                <option value="Karachi">Karachi</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Faisalabad">Faisalabad</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Multan">Multan</option>
              </select>
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">STATUS TYPE</label>
              <select className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Arrived">Arrived</option>
                <option value="Out For Delivery">Out For Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Ready To Return">Ready To Return</option>
                <option value="Returned">Returned</option>
              </select>
            </div>
          </div>
          <div className="mt-md flex justify-end">
            <button
              onClick={() => fetchReport(1)}
              className="bg-secondary-container text-on-secondary-container px-xl py-2 rounded-lg font-bold hover:bg-secondary-fixed transition-colors active:scale-95"
            >
              Generate Report
            </button>
          </div>
        </section>

        {/* Data Table Container */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-sm bg-surface-container-low flex justify-between items-center border-b border-outline-variant">
            <span className="font-label-md text-label-md text-on-surface-variant px-sm">
              {isLoading ? 'Loading...' : `SHOWING ${rows.length} OF ${totalCount.toLocaleString()} ENTRIES`}
            </span>
            <div className="flex gap-xs items-center">
              <button
                onClick={() => fetchReport(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1 hover:bg-surface-container-high rounded disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="text-sm font-bold px-2">{page} / {totalPages}</span>
              <button
                onClick={() => fetchReport(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1 hover:bg-surface-container-high rounded disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">S.NO</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Tracking #</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Invoice #</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Book Date</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Arr. Date</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Vendor</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Reference</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cons. Name</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cons. Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-sm py-12 text-center text-on-surface-variant">
                      {isLoading ? 'Loading parcel data...' : 'No records found. Adjust filters and generate report.'}
                    </td>
                  </tr>
                ) : rows.map((r, index) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-background transition-colors h-[48px] cursor-pointer ${selectedRow === index ? 'bg-primary/5' : ''}`}
                    onClick={() => setSelectedRow(index === selectedRow ? null : index)}
                  >
                    <td className="px-sm py-xs font-tabular-nums text-tabular-nums">{String(r.sNo).padStart(2, '0')}</td>
                    <td className="px-sm py-xs font-body-md text-body-md font-semibold text-primary">{r.trackingNumber}</td>
                    <td className="px-sm py-xs font-body-md text-body-md">{r.invoiceNo}</td>
                    <td className="px-sm py-xs font-tabular-nums text-tabular-nums">{r.bookDate}</td>
                    <td className="px-sm py-xs font-tabular-nums text-tabular-nums">{r.arrivalDate}</td>
                    <td className="px-sm py-xs font-body-md text-body-md">{r.vendor}</td>
                    <td className="px-sm py-xs font-body-md text-body-md">{r.reference}</td>
                    <td className="px-sm py-xs">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        r.status === 'Delivered' ? 'bg-tertiary-fixed text-on-tertiary-fixed' :
                        r.status === 'Ready To Return' || r.status === 'Returned' ? 'bg-error-container text-on-error-container' :
                        'bg-surface-variant text-on-surface-variant'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-sm py-xs font-body-md text-body-md">{r.consigneeName}</td>
                    <td className="px-sm py-xs font-body-md text-body-md truncate max-w-[200px]">{r.consigneeAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-lg right-lg w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-90 z-50">
        <span className="material-symbols-outlined text-[28px]">support_agent</span>
      </button>
    </PortalLayout>
  );
}

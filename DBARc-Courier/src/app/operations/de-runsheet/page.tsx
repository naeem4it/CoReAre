'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { 
  CheckCircle2, 
  Search, 
  Printer, 
  RefreshCw, 
  Save, 
  Package, 
  User, 
  Calendar,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface RunsheetParcel {
  id: number;
  trackingNumber: string;
  consigneeName: string;
  destination: string;
  status: string;
  paymentType: 'COD' | 'PAID';
  codAmount: number;
}

interface DeliverySheetSummary {
  id: number;
  sheetNumber: string;
  riderName: string;
  date: string;
  status: string;
  parcels: RunsheetParcel[];
}

export default function DeRunsheetPage() {
  const [searchSheetNo, setSearchSheetNo] = React.useState('');
  const [selectedSheet, setSelectedSheet] = React.useState<DeliverySheetSummary | null>(null);
  const [pastSheets, setPastSheets] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [cashSurrendered, setCashSurrendered] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch recent active delivery sheets
  const fetchRecentSheets = React.useCallback(async () => {
    try {
      const res = await apiClient.get('/delivery-sheets?sort[0]=createdAt:desc&pagination[limit]=15&populate=*');
      setPastSheets(res.data?.data || []);
    } catch (err) {
      console.warn('Could not load delivery sheets:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchRecentSheets();
  }, [fetchRecentSheets]);

  // Load a specific delivery sheet
  const loadSheetDetails = async (sheetNumber: string) => {
    if (!sheetNumber.trim()) return;
    setIsLoading(true);
    try {
      const cleanNo = sheetNumber.trim().replace('#', '');
      const res = await apiClient.get(`/delivery-sheets?filters[sheet_number][$eq]=${cleanNo}&populate[parcels][populate]=*&populate[rider]=*`);
      const sheetData = res.data?.data?.[0];

      if (!sheetData) {
        // Fallback by ID
        const idRes = await apiClient.get(`/delivery-sheets/${cleanNo}?populate[parcels][populate]=*&populate[rider]=*`).catch(() => null);
        if (idRes?.data?.data) {
          populateSheet(idRes.data.data);
          return;
        }
        triggerToast(`Runsheet #${sheetNumber} not found.`, 'error');
        setSelectedSheet(null);
        return;
      }

      populateSheet(sheetData);
    } catch (err: any) {
      triggerToast(err?.message || 'Error fetching runsheet details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const populateSheet = (data: any) => {
    const rawParcels = data.parcels || [];
    const mappedParcels: RunsheetParcel[] = rawParcels.map((p: any) => {
      const pType: 'COD' | 'PAID' = p.payment_type === 'PAID' || Number(p.cod_amount) === 0 ? 'PAID' : 'COD';
      return {
        id: p.id,
        trackingNumber: p.tracking_number,
        consigneeName: p.recipient_name || 'Customer',
        destination: p.destination_city?.name || p.recipient_address?.split(',').pop()?.trim() || 'Destination',
        status: p.status || 'Out For delivery',
        paymentType: pType,
        codAmount: Number(p.cod_amount) || 0,
      };
    });

    const summary: DeliverySheetSummary = {
      id: data.id,
      sheetNumber: String(data.sheet_number || data.id),
      riderName: data.rider?.name || 'Assigned Rider',
      date: data.date ? new Date(data.date).toLocaleDateString() : new Date(data.createdAt || Date.now()).toLocaleDateString(),
      status: data.status || 'Dispatched',
      parcels: mappedParcels,
    };

    setSelectedSheet(summary);
    // Calculate delivered COD amount as default cash
    const defaultCod = mappedParcels
      .filter(p => p.status === 'Delivered' && p.paymentType === 'COD')
      .reduce((sum, p) => sum + p.codAmount, 0);
    setCashSurrendered(String(defaultCod));
    triggerToast(`Runsheet #${summary.sheetNumber} loaded successfully!`, 'success');
  };

  // Metrics Calculations
  const metrics = React.useMemo(() => {
    if (!selectedSheet) return { total: 0, delivered: 0, deliveredCod: 0, deliveredPaid: 0, undelivered: 0, expectedCash: 0 };
    
    const parcels = selectedSheet.parcels;
    const total = parcels.length;
    const delivered = parcels.filter(p => p.status === 'Delivered').length;
    const deliveredPaid = parcels.filter(p => p.status === 'Delivered' && p.paymentType === 'PAID').length;
    const deliveredCodParcels = parcels.filter(p => p.status === 'Delivered' && p.paymentType === 'COD');
    const deliveredCod = deliveredCodParcels.length;
    const undelivered = total - delivered;
    const expectedCash = deliveredCodParcels.reduce((sum, p) => sum + p.codAmount, 0);

    return { total, delivered, deliveredCod, deliveredPaid, undelivered, expectedCash };
  }, [selectedSheet]);

  const cashDiff = React.useMemo(() => {
    const given = Number(cashSurrendered) || 0;
    return given - metrics.expectedCash;
  }, [cashSurrendered, metrics.expectedCash]);

  // Handle Closeout Submission
  const handleReconcile = async () => {
    if (!selectedSheet) return;
    setIsSubmitting(true);
    try {
      // 1. Update delivery sheet status
      await apiClient.put(`/delivery-sheets/${selectedSheet.id}`, {
        data: {
          status: 'Closed',
          cash_reconciled: Number(cashSurrendered) || 0,
          reconciled_at: new Date().toISOString(),
        }
      }).catch((e) => console.warn('Delivery sheet update notice:', e));

      // 2. Mark delivered COD parcels payment status as Collected
      for (const p of selectedSheet.parcels) {
        if (p.status === 'Delivered' && p.paymentType === 'COD') {
          try {
            await apiClient.put(`/parcels/${p.id}`, {
              data: { payment_status: 'Collected' }
            });
          } catch (e) {
            console.warn(`Could not update parcel ${p.trackingNumber}:`, e);
          }
        }
      }

      triggerToast(`Runsheet #${selectedSheet.sheetNumber} successfully reconciled and closed!`, 'success');
      setSelectedSheet(null);
      setSearchSheetNo('');
      fetchRecentSheets();
    } catch (err: any) {
      triggerToast(err?.message || 'Failed to complete cashier closeout.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout>
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success'
            ? <div className="bg-emerald-500 rounded-full p-1 text-white"><CheckCircle2 className="w-4 h-4" /></div>
            : <div className="bg-red-500 rounded-full p-1 text-white"><AlertCircle className="w-4 h-4" /></div>
          }
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hub Operations & Cashier</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / De-Runsheet (Cash Closeout)</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              disabled={!selectedSheet}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Closeout Slip
            </button>
            <button
              onClick={handleReconcile}
              disabled={isSubmitting || !selectedSheet}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Reconciling...' : 'Reconcile & Close Runsheet'}
            </button>
          </div>
        </div>

        {/* Search / Select Runsheet Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Search Delivery Sheet (Runsheet)</label>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Runsheet Number (e.g. 5482910 or #5482910)..."
                value={searchSheetNo}
                onChange={(e) => setSearchSheetNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadSheetDetails(searchSheetNo)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => loadSheetDetails(searchSheetNo)}
              disabled={isLoading || !searchSheetNo.trim()}
              className="w-full sm:w-auto bg-primary hover:bg-primary-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Fetch Runsheet
            </button>
          </div>

          {/* Quick Click from Recent Sheets */}
          {pastSheets.length > 0 && !selectedSheet && (
            <div className="mt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent Active Runsheets:</span>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {pastSheets.slice(0, 6).map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const no = String(s.sheet_number || s.id);
                      setSearchSheetNo(no);
                      loadSheetDetails(no);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-200"
                  >
                    #{s.sheet_number || s.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Sheet Summary & Cashier Audit */}
        {selectedSheet && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sheet Details Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Runsheet Info</span>
                <div className="text-lg font-black font-mono text-slate-900 mt-1">#{selectedSheet.sheetNumber}</div>
                <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                  <User className="w-3.5 h-3.5 text-primary" /> {selectedSheet.riderName}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" /> {selectedSheet.date}
                </div>
              </div>

              {/* Delivery Stats Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Progress</span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {metrics.delivered} / {metrics.total} <span className="text-xs font-normal text-slate-500">Delivered</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    PAID: {metrics.deliveredPaid}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    COD: {metrics.deliveredCod}
                  </span>
                  {metrics.undelivered > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                      Failed: {metrics.undelivered}
                    </span>
                  )}
                </div>
              </div>

              {/* Expected COD Cash Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected COD Cash</span>
                <div className="text-xl font-black font-mono text-primary mt-1">
                  PKR {metrics.expectedCash.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  *Excludes {metrics.deliveredPaid} PAID online order{metrics.deliveredPaid !== 1 ? 's' : ''} (Rs. 0 expected)
                </p>
              </div>

              {/* Cash Reconciliation Card */}
              <div className={`p-4 rounded-2xl border shadow-xs ${
                cashDiff === 0 
                  ? 'bg-emerald-50/70 border-emerald-200' 
                  : cashDiff < 0 
                    ? 'bg-red-50/70 border-red-200' 
                    : 'bg-blue-50/70 border-blue-200'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Physical Cash Surrendered</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold font-mono text-slate-700">PKR</span>
                  <input
                    type="number"
                    value={cashSurrendered}
                    onChange={(e) => setCashSurrendered(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1 px-2.5 text-base font-black font-mono text-slate-900 outline-none focus:border-primary"
                  />
                </div>
                <div className="text-[11px] font-bold mt-1.5 flex items-center justify-between">
                  <span>Balance:</span>
                  {cashDiff === 0 ? (
                    <span className="text-emerald-700">Exact Match (Balanced)</span>
                  ) : cashDiff < 0 ? (
                    <span className="text-red-700">Shortage: PKR {Math.abs(cashDiff).toLocaleString()}</span>
                  ) : (
                    <span className="text-blue-700">Surplus: PKR {cashDiff.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Parcels Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-slate-900">Parcels on Runsheet #{selectedSheet.sheetNumber}</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">{selectedSheet.parcels.length} Items</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Tracking Number</th>
                      <th className="px-4 py-3">Consignee</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3">Delivery Status</th>
                      <th className="px-4 py-3">Payment Type</th>
                      <th className="px-4 py-3 text-right">Expected COD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedSheet.parcels.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-primary">{p.trackingNumber}</td>
                        <td className="px-4 py-3.5 text-slate-800 font-semibold">{p.consigneeName}</td>
                        <td className="px-4 py-3.5 text-slate-600">{p.destination}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Delivered' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : p.status === 'Failed Attempt' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {p.paymentType === 'PAID' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              PAID ONLINE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              CASH ON DELIVERY
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold">
                          {p.paymentType === 'PAID' ? (
                            <span className="text-slate-400 font-normal">Rs. 0 (Prepaid)</span>
                          ) : (
                            <span className="text-slate-900">PKR {p.codAmount.toLocaleString()}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

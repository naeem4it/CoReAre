'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, UserCheck, Search, RefreshCw, Truck, ArrowDownLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, DeliverySheetService } from '@/services/api';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus 
} from '@/shared/constants/shipment-statuses';

interface RiderSummaryRow {
  sNo: number;
  riderId: number | string;
  riderCode: string;
  riderName: string;
  phone: string;
  // Pickup: Picked up by rider
  pickupCount: number;
  // Delivery: Out for Delivery, Delivered, Delivery Failed
  outForDeliveryCount: number;
  outForDeliveryAmount: number;
  deliveredCount: number;
  deliveredAmount: number;
  deliveryFailedCount: number;
  deliveryFailedAmount: number;
  // Return: Ready for Return, Return to Shipper
  readyForReturnCount: number;
  returnToShipperCount: number;
  totalAssigned: number;
  successRatio: number;
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
      // 1. Fetch active riders, delivery-sheets, and parcels
      let dateFilter = '';
      if (fromDate) dateFilter += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) dateFilter += `&filters[createdAt][$lte]=${toDate}T23:59:59`;

      const [ridersRes, sheetsRes, parcelsRes] = await Promise.allSettled([
        RiderService.getAll(),
        DeliverySheetService.getAll(`?sort[0]=createdAt:desc&pagination[pageSize]=500${dateFilter}`),
        apiClient.get(`/parcels?populate[rider]=true&populate[load_sheet][populate]=rider&pagination[pageSize]=1000${dateFilter}`)
      ]);

      const ridersList: any[] = ridersRes.status === 'fulfilled' ? ridersRes.value.data || [] : [];
      const sheetsList: any[] = sheetsRes.status === 'fulfilled' ? sheetsRes.value.data || [] : [];
      const rawParcels: any[] = parcelsRes.status === 'fulfilled' ? parcelsRes.value.data?.data || [] : [];

      // Create a map of active parcels by tracking number
      const parcelByTracking = new Map<string, any>();
      for (const p of rawParcels) {
        if (p.tracking_number) {
          parcelByTracking.set(p.tracking_number.toUpperCase(), p);
        }
      }

      // Initialize rider aggregates
      // Map: riderId -> { riderInfo, assignedParcels: Set<trackingNumber> }
      const riderMap = new Map<string, {
        riderId: number | string;
        riderCode: string;
        riderName: string;
        phone: string;
        parcels: Map<string, any>;
      }>();

      ridersList.forEach((r: any) => {
        const idStr = String(r.id);
        riderMap.set(idStr, {
          riderId: r.id,
          riderCode: r.rider_code || `R-${r.id}`,
          riderName: r.name || r.fullName || r.username || `Rider #${r.id}`,
          phone: r.phone || '',
          parcels: new Map(),
        });
      });

      // 1. Associate parcels directly linked to rider (parcel.rider or load_sheet.rider)
      rawParcels.forEach((p: any) => {
        const directRiderId = p.rider?.id || p.load_sheet?.rider?.id;
        if (directRiderId && riderMap.has(String(directRiderId))) {
          const entry = riderMap.get(String(directRiderId))!;
          entry.parcels.set(p.tracking_number.toUpperCase(), p);
        }
      });

      // 2. Associate parcels assigned through delivery sheets
      sheetsList.forEach((sheet: any) => {
        const sheetRiderId = sheet.rider?.id;
        const sheetRiderName = (sheet.rider_name || '').trim().toLowerCase();

        let targetEntry: any = null;
        if (sheetRiderId && riderMap.has(String(sheetRiderId))) {
          targetEntry = riderMap.get(String(sheetRiderId));
        } else if (sheetRiderName) {
          for (const val of riderMap.values()) {
            if (val.riderName.toLowerCase().includes(sheetRiderName) || sheetRiderName.includes(val.riderName.toLowerCase())) {
              targetEntry = val;
              break;
            }
          }
        }

        if (targetEntry) {
          // Process parcels attached to delivery sheet
          const items = Array.isArray(sheet.parcels_data) ? sheet.parcels_data : sheet.parcels || [];
          items.forEach((item: any) => {
            const trk = (item.shipmentNumber || item.tracking_number || '').toUpperCase();
            if (!trk) return;
            const live = parcelByTracking.get(trk) || item;
            targetEntry.parcels.set(trk, live);
          });
        }
      });

      // Compute stats for each rider strictly from their assigned shipments
      const rows: RiderSummaryRow[] = Array.from(riderMap.values()).map((r, i) => {
        const assignedList = Array.from(r.parcels.values());

        let pickupCount = 0;
        let outForDeliveryCount = 0;
        let outForDeliveryAmount = 0;
        let deliveredCount = 0;
        let deliveredAmount = 0;
        let deliveryFailedCount = 0;
        let deliveryFailedAmount = 0;
        let readyForReturnCount = 0;
        let returnToShipperCount = 0;

        assignedList.forEach((p: any) => {
          const norm = normalizeShipmentStatus(p.status);
          const cod = Number(p.cod_amount || p.amountCollect || 0);

          if (norm === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER) {
            pickupCount++;
          } else if (norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY) {
            outForDeliveryCount++;
            outForDeliveryAmount += cod;
          } else if (norm === SHIPMENT_STATUSES.DELIVERED) {
            deliveredCount++;
            deliveredAmount += cod;
          } else if (norm === SHIPMENT_STATUSES.DELIVERY_FAILED) {
            deliveryFailedCount++;
            deliveryFailedAmount += cod;
          } else if (norm === SHIPMENT_STATUSES.READY_FOR_RETURN) {
            readyForReturnCount++;
          } else if (norm === SHIPMENT_STATUSES.RETURN_TO_SHIPPER) {
            returnToShipperCount++;
          }
        });

        const totalAssigned = assignedList.length;
        const totalDeliveryDecided = deliveredCount + deliveryFailedCount;
        const successRatio = totalDeliveryDecided > 0 ? Math.round((deliveredCount / totalDeliveryDecided) * 100) : 0;

        return {
          sNo: i + 1,
          riderId: r.riderId,
          riderCode: r.riderCode,
          riderName: r.riderName,
          phone: r.phone,
          pickupCount,
          outForDeliveryCount,
          outForDeliveryAmount,
          deliveredCount,
          deliveredAmount,
          deliveryFailedCount,
          deliveryFailedAmount,
          readyForReturnCount,
          returnToShipperCount,
          totalAssigned,
          successRatio,
        };
      });

      // Sort by active workload
      rows.sort((a, b) => b.totalAssigned - a.totalAssigned || b.deliveredCount - a.deliveredCount);
      setSummaryData(rows);
    } catch (err) {
      console.error('Failed to load rider summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  React.useEffect(() => { fetchRiderSummary(); }, [fetchRiderSummary]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return summaryData;
    const q = searchQuery.toLowerCase().trim();
    return summaryData.filter(row =>
      row.riderName.toLowerCase().includes(q) ||
      row.riderCode.toLowerCase().includes(q) ||
      row.phone.includes(q)
    );
  }, [summaryData, searchQuery]);

  const handleExportExcel = () => {
    const header = "Rider Code,Rider Name,Phone,Total Assigned,Pickup (Picked Up),Out For Delivery,Delivered,Delivery Failed,Ready For Return,Return To Shipper,Success Ratio %\n";
    const rows = filteredData.map(r => `"${r.riderCode}","${r.riderName}","${r.phone}",${r.totalAssigned},${r.pickupCount},${r.outForDeliveryCount},${r.deliveredCount},${r.deliveryFailedCount},${r.readyForReturnCount},${r.returnToShipperCount},${r.successRatio}%`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riders_Summary_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">

        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">Customer Service / Riders Summary</h1>
            <p className="text-xs text-slate-400">Rider-centric reporting of actual assigned pickups, active deliveries, and returns.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => fetchRiderSummary()}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Search Rider</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by rider code, name, or phone..."
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
              <UserCheck className="w-4 h-4 text-emerald-400" /> Rider Workload & Operational Summary ({filteredData.length} Riders)
            </span>
            {isLoading && <span className="text-xs text-slate-400 font-normal animate-pulse">Calculating rider metrics...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Rider Code</th>
                  <th className="p-3.5">Rider Name</th>
                  <th className="p-3.5 text-center bg-slate-200">Total Handled</th>
                  <th className="p-3.5 text-center bg-purple-50 text-purple-900">Pickup (Picked Up)</th>
                  <th className="p-3.5 text-center bg-blue-50 text-blue-900">Out For Delivery</th>
                  <th className="p-3.5 text-center bg-emerald-50 text-emerald-900">Delivered</th>
                  <th className="p-3.5 text-center bg-rose-50 text-rose-900">Delivery Failed</th>
                  <th className="p-3.5 text-center bg-amber-50 text-amber-900">Ready For Return</th>
                  <th className="p-3.5 text-center bg-teal-50 text-teal-900">Return to Shipper</th>
                  <th className="p-3.5 text-center bg-amber-100/50 text-amber-950">Success %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                      {isLoading ? 'Loading rider metrics...' : 'No rider workload found for the selected criteria.'}
                    </td>
                  </tr>
                ) : filteredData.map((r) => (
                  <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-400">{r.sNo}</td>
                    <td className="p-3.5 font-bold font-mono text-slate-900">{r.riderCode}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{r.riderName}</div>
                      {r.phone && <div className="text-[10px] text-slate-500 font-mono">{r.phone}</div>}
                    </td>
                    <td className="p-3.5 text-center font-black bg-slate-50 text-slate-900 text-sm">
                      {r.totalAssigned}
                    </td>
                    <td className="p-3.5 text-center bg-purple-50/50 text-purple-950">
                      {r.pickupCount}
                    </td>
                    <td className="p-3.5 text-center bg-blue-50/50 text-blue-950">
                      <div>{r.outForDeliveryCount}</div>
                      {r.outForDeliveryAmount > 0 && (
                        <div className="text-[10px] text-slate-500 font-normal">PKR {r.outForDeliveryAmount.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-center bg-emerald-50/50 text-emerald-900 font-bold">
                      <div>{r.deliveredCount}</div>
                      {r.deliveredAmount > 0 && (
                        <div className="text-[10px] text-emerald-700 font-normal">PKR {r.deliveredAmount.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-center bg-rose-50/50 text-rose-800">
                      <div>{r.deliveryFailedCount}</div>
                      {r.deliveryFailedAmount > 0 && (
                        <div className="text-[10px] text-slate-500 font-normal">PKR {r.deliveryFailedAmount.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-center bg-amber-50/50 text-amber-900">
                      {r.readyForReturnCount}
                    </td>
                    <td className="p-3.5 text-center bg-teal-50/50 text-teal-900">
                      {r.returnToShipperCount}
                    </td>
                    <td className="p-3.5 text-center font-black text-amber-800 bg-amber-50 text-sm">
                      {r.successRatio}%
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

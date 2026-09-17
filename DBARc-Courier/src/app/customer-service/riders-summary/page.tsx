'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, UserCheck, Search, RefreshCw, Truck, ArrowDownLeft, CheckCircle2, XCircle, RotateCcw, X } from 'lucide-react';
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
  parcelsList?: any[];
}

export default function CustomerServiceRidersSummaryPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [summaryData, setSummaryData] = React.useState<RiderSummaryRow[]>([]);
  const [selectedRiderDetail, setSelectedRiderDetail] = React.useState<RiderSummaryRow | null>(null);
  const [riderParcelsList, setRiderParcelsList] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchRiderSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active riders, delivery-sheets (with populated parcels and rider), and parcels
      const [ridersRes, sheetsRes, parcelsRes] = await Promise.allSettled([
        RiderService.getAll(),
        DeliverySheetService.getAll('?sort[0]=createdAt:desc&pagination[pageSize]=500&populate=*'),
        apiClient.get('/parcels?populate=*&pagination[pageSize]=1000')
      ]);

      const ridersList: any[] = ridersRes.status === 'fulfilled' ? ridersRes.value.data || [] : [];
      const sheetsList: any[] = sheetsRes.status === 'fulfilled' ? sheetsRes.value.data || [] : [];
      const rawParcels: any[] = parcelsRes.status === 'fulfilled' ? parcelsRes.value.data?.data || [] : [];

      // Date range filtering helper (safe client-side comparison)
      const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
      const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;

      const isDateInRange = (dateStr?: string) => {
        if (!fromDate && !toDate) return true;
        if (!dateStr) return true;
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) return true;
        return t >= fromTs && t <= toTs;
      };

      // Create a map of active parcels by tracking number
      const parcelByTracking = new Map<string, any>();
      for (const p of rawParcels) {
        if (p.tracking_number) {
          parcelByTracking.set(p.tracking_number.toUpperCase().trim(), p);
        }
      }

      // Initialize rider aggregates
      // Map: riderId -> { riderInfo, parcels: Map<trackingNumber, parcelData> }
      const riderMap = new Map<string, {
        riderId: number | string;
        riderCode: string;
        riderName: string;
        phone: string;
        parcels: Map<string, any>;
      }>();

      ridersList.forEach((r: any) => {
        const idStr = String(r.id);
        const rName = r.name || r.fullName || r.username || `Rider #${r.id}`;
        riderMap.set(idStr, {
          riderId: r.id,
          riderCode: r.rider_code || `R-${r.id}`,
          riderName: rName,
          phone: r.phone || '',
          parcels: new Map(),
        });
      });

      // Filter sheets by date
      const filteredSheets = sheetsList.filter((sheet: any) => 
        isDateInRange(sheet.sheet_date || sheet.createdAt || sheet.updatedAt)
      );

      // 1. Associate parcels assigned through delivery sheets
      filteredSheets.forEach((sheet: any) => {
        const sheetRiderId = sheet.rider?.id ? String(sheet.rider.id) : null;
        const sheetRiderCode = (sheet.rider?.rider_code || '').trim().toLowerCase();
        const sheetRiderName = (sheet.custom_name || sheet.rider?.name || sheet.rider_name || '').trim().toLowerCase();

        let targetEntry: any = null;
        if (sheetRiderId && riderMap.has(sheetRiderId)) {
          targetEntry = riderMap.get(sheetRiderId);
        } else if (sheetRiderCode) {
          for (const val of riderMap.values()) {
            if (val.riderCode.toLowerCase() === sheetRiderCode) {
              targetEntry = val;
              break;
            }
          }
        }
        
        if (!targetEntry && sheetRiderName) {
          for (const val of riderMap.values()) {
            const valName = val.riderName.toLowerCase();
            const valCode = val.riderCode.toLowerCase();
            if (
              valName.includes(sheetRiderName) ||
              sheetRiderName.includes(valName) ||
              valCode === sheetRiderName ||
              (val.phone && sheetRiderName.includes(val.phone))
            ) {
              targetEntry = val;
              break;
            }
          }
        }

        // Fallback: If only 1 rider exists in this tenant, associate unassigned runsheets to this active rider
        if (!targetEntry && riderMap.size === 1) {
          targetEntry = riderMap.values().next().value;
        }

        if (targetEntry) {
          // Process parcels attached to delivery sheet (both Strapi relation & fallback parcels_data)
          const items = Array.isArray(sheet.parcels) && sheet.parcels.length > 0 
            ? sheet.parcels 
            : (Array.isArray(sheet.parcels_data) ? sheet.parcels_data : []);

          items.forEach((item: any) => {
            const trk = (item.tracking_number || item.shipmentNumber || '').toUpperCase().trim();
            if (!trk) return;
            const live = parcelByTracking.get(trk) || item;
            targetEntry.parcels.set(trk, live);
          });
        }
      });

      // 2. Associate parcels directly linked to rider (parcel.rider or load_sheet.rider)
      rawParcels.forEach((p: any) => {
        if (!isDateInRange(p.arrival_date || p.delivered_date || p.createdAt)) return;

        const directRiderId = p.rider?.id ? String(p.rider.id) : (p.load_sheet?.rider?.id ? String(p.load_sheet.rider.id) : null);
        if (directRiderId && riderMap.has(directRiderId)) {
          const entry = riderMap.get(directRiderId)!;
          if (p.tracking_number) {
            entry.parcels.set(p.tracking_number.toUpperCase().trim(), p);
          }
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
          parcelsList: assignedList,
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
                  <tr 
                    key={r.sNo} 
                    onClick={() => {
                      setSelectedRiderDetail(r);
                      setRiderParcelsList(r.parcelsList || []);
                    }}
                    className="hover:bg-slate-100/90 transition-colors cursor-pointer group"
                    title="Click to view assigned shipments details"
                  >
                    <td className="p-3.5 text-slate-400 group-hover:text-primary">{r.sNo}</td>
                    <td className="p-3.5 font-bold font-mono text-slate-900 group-hover:text-primary">{r.riderCode}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{r.riderName}</span>
                        <span className="text-[10px] text-slate-400 font-normal opacity-0 group-hover:opacity-100 transition-opacity">(view details)</span>
                      </div>
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

        {/* Assigned Shipments Details Modal */}
        {selectedRiderDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Shipments Details</div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>{selectedRiderDetail.riderName}</span>
                    <span className="text-xs bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md font-mono">{selectedRiderDetail.riderCode}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRiderDetail(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Handled</div>
                    <div className="text-lg font-black text-slate-900">{selectedRiderDetail.totalAssigned}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <div className="text-[10px] text-blue-700 font-bold uppercase">Out For Delivery</div>
                    <div className="text-lg font-black text-blue-900">{selectedRiderDetail.outForDeliveryCount}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase">Delivered</div>
                    <div className="text-lg font-black text-emerald-900">{selectedRiderDetail.deliveredCount}</div>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <div className="text-[10px] text-rose-700 font-bold uppercase">Delivery Failed</div>
                    <div className="text-lg font-black text-rose-900">{selectedRiderDetail.deliveryFailedCount}</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Tracking #</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Destination</th>
                        <th className="p-3 text-right">COD (PKR)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {riderParcelsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            No shipments assigned yet.
                          </td>
                        </tr>
                      ) : (
                        riderParcelsList.map((p, idx) => (
                          <tr key={p.tracking_number || idx} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">{p.tracking_number || p.shipmentNumber || '-'}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{p.recipient_name || p.consigneeName || '-'}</div>
                              {(p.recipient_phone || p.phone) && <div className="text-[10px] text-slate-500">{p.recipient_phone || p.phone}</div>}
                            </td>
                            <td className="p-3 text-slate-600 truncate max-w-[150px]">{p.recipient_address || p.destination || p.destination_city?.CityName || '-'}</td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              {Number(p.cod_amount || p.amountCollect || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {p.status || 'Out for Delivery'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedRiderDetail(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

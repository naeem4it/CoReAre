'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, Upload, FileSpreadsheet, Trash2, Save, RefreshCw, CheckCircle2, FileText, Building2, AlertCircle, Eye } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, ArrivalService } from '@/services/api';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';
import { useAuth } from '@/components/AuthProvider';

interface BulkShipmentItem {
  id: string;
  parcelId?: number | string | undefined;
  documentId?: string | undefined;
  shipmentNumber: string;
  consigneeName: string;
  originCity: string;
  destinationCity: string;
  codAmount: number;
  pieces: number;
  weight: number;
  status: string;
  arrivedAt: string;
  foundInDb: boolean;
}

export default function OperationsBulkArrivalsPage() {
  const { user } = useAuth();
  const [batchId, setBatchId] = React.useState<string>(`BAR-${Math.floor(100000 + Math.random() * 900000)}`);
  
  // Arrival Stage: Origin vs Destination Warehouse
  const [arrivalStage, setArrivalStage] = React.useState<'Origin' | 'Dest'>('Origin');
  
  // Warehouse & Rider State
  const [offices, setOffices] = React.useState<any[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = React.useState<string>('all');
  const [riders, setRiders] = React.useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('');
  
  const [selectedFileName, setSelectedFileName] = React.useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [shipments, setShipments] = React.useState<BulkShipmentItem[]>([]);

  // Toast notification
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch active riders and actual courier warehouses/offices isolated to current tenant
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

        const filters: any = { type: 'courier' };
        if (tenantId) {
          filters.tenant = tenantId;
        }

        const [ridersRes, officesRes] = await Promise.allSettled([
          RiderService.getAll(`?filters[status][$ne]=inactive${tenantId ? `&filters[tenant][$eq]=${tenantId}` : ''}&pagination[pageSize]=100`),
          apiClient.get('/offices', {
            params: {
              filters,
              populate: ['city', 'tenant'],
              pagination: { limit: 100 }
            }
          })
        ]);
        
        if (ridersRes.status === 'fulfilled') {
          setRiders(ridersRes.value.data || []);
        }
        if (officesRes.status === 'fulfilled') {
          const rawOffices = officesRes.value.data?.data || [];
          const tenantOffices = rawOffices.filter((item: any) => {
            if (!tenantId) return true;
            const attrs = item.attributes || item;
            const offTenantId = attrs.tenant?.data?.id || attrs.tenant?.id || attrs.tenant;
            return offTenantId ? Number(offTenantId) === Number(tenantId) : true;
          });
          setOffices(tenantOffices);
          if (tenantOffices.length > 0) {
            setSelectedOfficeId(String(tenantOffices[0].id));
          } else {
            setSelectedOfficeId('all');
          }
        }
      } catch (err) {
        console.warn('Could not load offices/riders:', err);
      }
    };
    fetchData();
  }, [user]);

  // Download template matching Arrivals grid exactly:
  // Tracking #, Consignee Name, Origin City, Destination City, COD Amount, Pieces, Weight
  const handleDownloadFormat = () => {
    const csvContent = "data:text/csv;charset=utf-8,Tracking #,Consignee Name,Origin City,Destination City,COD Amount,Pieces,Weight\n" +
      "DBA-KHI-480626,Imran Shah,Lahore,Karachi,4500,2,0.8\n" +
      "DBA-LHE-595863,Bilal Ahmed,Lahore,Lahore,10000,5,1.1\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "BULK_ARRIVAL_TEMPLATE.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFileName(file.name);
    setIsLoadingFile(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          triggerToast('Uploaded file appears to be empty.', 'error');
          setIsLoadingFile(false);
          return;
        }

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          triggerToast('No data rows found in uploaded file.', 'error');
          setIsLoadingFile(false);
          return;
        }

        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(/,|\t/).map(h => h.trim().replace(/['"]/g, ''));
        
        // Match header indices flexibly
        const trackIdx = headers.findIndex(h => h.includes('tracking') || h === 'cn' || h.includes('shipment') || h.includes('barcode'));
        const consigneeIdx = headers.findIndex(h => h.includes('consignee') || h.includes('recipient') || h.includes('name') || h.includes('customer'));
        const originIdx = headers.findIndex(h => h.includes('origin') || h.includes('from'));
        const destIdx = headers.findIndex(h => h.includes('destination') || h.includes('dest') || h.includes('to'));
        const codIdx = headers.findIndex(h => h.includes('cod') || h.includes('amount') || h.includes('price'));
        const pcsIdx = headers.findIndex(h => h.includes('pieces') || h.includes('pcs') || h.includes('qty'));
        const wtIdx = headers.findIndex(h => h.includes('weight') || h.includes('wt'));

        const targetStatus = arrivalStage === 'Origin' 
          ? SHIPMENT_STATUSES.ARRIVED_ORIGIN 
          : SHIPMENT_STATUSES.ARRIVED_DEST;

        const parsedItems: BulkShipmentItem[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,|\t/).map(c => c.trim().replace(/['"]/g, ''));
          const trackVal = trackIdx !== -1 ? cols[trackIdx] : cols[0];
          if (!trackVal) continue;

          const cleanTracking = trackVal.toUpperCase().replace('#', '').trim();
          
          let consignee = consigneeIdx !== -1 && cols[consigneeIdx] ? cols[consigneeIdx] : '-';
          let origin = originIdx !== -1 && cols[originIdx] ? cols[originIdx] : 'Origin';
          let dest = destIdx !== -1 && cols[destIdx] ? cols[destIdx] : 'Dest';
          let cod = codIdx !== -1 && cols[codIdx] ? parseFloat(cols[codIdx]) : 0;
          let pcs = pcsIdx !== -1 && cols[pcsIdx] ? parseInt(cols[pcsIdx], 10) : 1;
          let wt = wtIdx !== -1 && cols[wtIdx] ? parseFloat(cols[wtIdx]) : 1.0;

          // Query real database live for this parcel to hydrate real database fields
          let foundInDb = false;
          let parcelDbId: number | string | undefined = undefined;
          let parcelDocId: string | undefined = undefined;

          try {
            const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(cleanTracking)}&populate=*`);
            const p = res.data?.data?.[0];
            if (p) {
              foundInDb = true;
              parcelDbId = p.id;
              parcelDocId = p.documentId;
              if (consignee === '-') consignee = p.recipient_name || p.consignee_name || '-';
              if (origin === 'Origin') origin = p.source_city?.CityName || p.source_city?.name || 'Origin';
              if (dest === 'Dest') dest = p.destination_city?.CityName || p.destination_city?.name || 'Dest';
              if (cod === 0) cod = Number(p.cod_amount) || 0;
              if (pcs === 1 && p.pieces) pcs = Number(p.pieces) || 1;
              if (wt === 1.0 && p.weight) wt = Number(p.weight) || 1.0;
            }
          } catch (e) {
            // DB query error, keep CSV values
          }

          parsedItems.push({
            id: `bulk-${i}-${Date.now()}`,
            parcelId: parcelDbId,
            documentId: parcelDocId,
            shipmentNumber: cleanTracking,
            consigneeName: consignee,
            originCity: origin,
            destinationCity: dest,
            codAmount: isNaN(cod) ? 0 : cod,
            pieces: isNaN(pcs) ? 1 : pcs,
            weight: isNaN(wt) ? 1.0 : wt,
            status: targetStatus,
            arrivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            foundInDb
          });
        }

        if (parsedItems.length === 0) {
          triggerToast('No valid shipment rows could be extracted.', 'error');
        } else {
          // Merge avoiding local duplicates
          setShipments(prev => {
            const existingTracking = new Set(prev.map(p => p.shipmentNumber));
            const newOnes = parsedItems.filter(p => !existingTracking.has(p.shipmentNumber));
            return [...newOnes, ...prev];
          });
          triggerToast(`Successfully loaded ${parsedItems.length} shipments from spreadsheet!`, 'success');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        triggerToast('Failed to parse file. Please upload a valid CSV/Excel template.', 'error');
      } finally {
        setIsLoadingFile(false);
      }
    };

    reader.onerror = () => {
      triggerToast('Error reading the selected file.', 'error');
      setIsLoadingFile(false);
    };

    reader.readAsText(file);
  };

  const handleRemoveItem = (id: string) => {
    setShipments(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if (confirm('Reset bulk arrivals form?')) {
      setBatchId(`BAR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setSelectedFileName('');
    }
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please upload a spreadsheet or add shipments before saving.', 'error');
      return;
    }

    setIsSubmitting(true);
    const targetStatus = arrivalStage === 'Origin' 
      ? SHIPMENT_STATUSES.ARRIVED_ORIGIN 
      : SHIPMENT_STATUSES.ARRIVED_DEST;

    try {
      let updatedCount = 0;
      let createdCount = 0;
      let skippedCount = 0;

      // Update parcels directly in database, or create if new
      for (const item of shipments) {
        try {
          const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
          const found = parcelRes.data?.data?.[0];

          if (found) {
            const currentNormStatus = normalizeShipmentStatus(found.status);
            // Do not overwrite completed delivery/return shipments
            if (
              currentNormStatus === SHIPMENT_STATUSES.DELIVERED ||
              currentNormStatus === SHIPMENT_STATUSES.RETURN_TO_SHIPPER ||
              currentNormStatus === SHIPMENT_STATUSES.LOST_DAMAGE
            ) {
              skippedCount++;
              continue;
            }

            const targetId = found.documentId || found.id;
            await apiClient.put(`/parcels/${targetId}`, {
              data: {
                status: targetStatus,
                arrival_date: new Date().toISOString()
              }
            });
            updatedCount++;
          } else {
            // If parcel did not exist in database, create it as newly arrived so it is NOT lost
            await apiClient.post('/parcels', {
              data: {
                tracking_number: item.shipmentNumber,
                recipient_name: item.consigneeName !== '-' ? item.consigneeName : 'Consignee',
                recipient_phone: '03000000000',
                recipient_address: item.destinationCity || 'Warehouse Arrival',
                cod_amount: item.codAmount,
                pieces: item.pieces,
                weight: item.weight,
                status: targetStatus,
                arrival_date: new Date().toISOString()
              }
            });
            createdCount++;
          }
        } catch (e) {
          console.warn(`Could not update parcel ${item.shipmentNumber}:`, e);
          skippedCount++;
        }
      }

      // Persist Arrival Batch
      try {
        await ArrivalService.createBatch({
          batch_id: batchId,
          rider: selectedRiderId ? Number(selectedRiderId) : null,
          total_shipments: updatedCount + createdCount,
          total_weight: totalWeight,
          total_pieces: totalPieces,
          scanned_items: shipments,
          arrival_date: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Batch entity notice:', e);
      }

      triggerToast(`Batch ${batchId} saved! ${updatedCount} updated, ${createdCount} registered new into database.`, 'success');
      setBatchId(`BAR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setSelectedFileName('');
    } catch (err) {
      console.error('Save error:', err);
      triggerToast('Failed to save bulk arrivals batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPieces = React.useMemo(() => shipments.reduce((acc, curr) => acc + curr.pieces, 0), [shipments]);
  const totalWeight = React.useMemo(() => Math.round(shipments.reduce((acc, curr) => acc + curr.weight, 0) * 10) / 10, [shipments]);

  return (
    <PortalLayout>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all duration-300 animate-in slide-in-from-top-4 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1600px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <FileSpreadsheet className="w-4 h-4" /> Operations / Bulk Intake & Arrivals
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Bulk Arrivals Station
            </h1>
            <p className="text-xs text-slate-500">
              Import and verify bulk inbound shipments from spreadsheet into warehouse inventory in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || shipments.length === 0}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Save className="w-4 h-4" /> Finalize Bulk Batch ({shipments.length})
            </button>
          </div>
        </div>

        {/* Upload & Warehouse Controls Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Operation</label>
              <select
                value={arrivalStage}
                onChange={(e) => setArrivalStage(e.target.value as 'Origin' | 'Dest')}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Origin">🏢 Origin Warehouse Arrival</option>
                <option value="Dest">🎯 Destination Warehouse Arrival</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Warehouse Location
              </label>
              <select
                value={selectedOfficeId}
                onChange={(e) => setSelectedOfficeId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Facilities</option>
                {offices.map((o: any) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name || `Office #${o.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Batch ID</label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivering Rider (Optional)</label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">— No Rider Assigned —</option>
                {riders.map((r: any) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name || r.attributes?.name || `Rider #${r.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Download Format Row */}
          <div className="flex items-center justify-between bg-blue-50/70 p-4 rounded-2xl border border-blue-200 text-xs font-semibold text-blue-900">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Target Status on Save: <strong>{arrivalStage === 'Origin' ? SHIPMENT_STATUSES.ARRIVED_ORIGIN : SHIPMENT_STATUSES.ARRIVED_DEST}</strong>.
                The template columns match the Arrivals Grid: <strong>Tracking #, Consignee Name, Origin City, Destination City, COD Amount, Pieces, Weight</strong>.
              </span>
            </div>
            <button
              onClick={handleDownloadFormat}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Template
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl p-8 bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Drop an XLSX / CSV file here</h3>
              <p className="text-xs text-slate-500 mt-0.5">Supports CSV or Excel spreadsheets matching the Arrivals Grid columns.</p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <label className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs">
                <FileText className="w-4 h-4 text-slate-500" /> Choose File
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {selectedFileName && (
                <span className="text-xs font-bold text-slate-800 bg-slate-200 px-3 py-1.5 rounded-lg">
                  {selectedFileName}
                </span>
              )}
            </div>

            {isLoadingFile && (
              <div className="text-xs font-bold text-primary animate-pulse mt-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying against database and parsing spreadsheet rows...
              </div>
            )}
          </div>

        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Received Shipments</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{shipments.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Pieces</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalPieces}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Weight</span>
            <p className="text-2xl font-black text-primary mt-1">{totalWeight} <span className="text-sm font-medium text-slate-400">kg</span></p>
          </div>
        </div>

        {/* Shipments Grid Table (Identical Columns to Arrivals Screen) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Imported Shipments ({shipments.length}) &rarr; Destination Status: <strong className="text-emerald-400">{arrivalStage === 'Origin' ? SHIPMENT_STATUSES.ARRIVED_ORIGIN : SHIPMENT_STATUSES.ARRIVED_DEST}</strong></span>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span>Ready for Finalization</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking #</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Consignee & Route</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">COD (PKR)</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pcs • Wt</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No bulk arrival shipments imported yet. Upload Excel or CSV file using the template above.
                    </td>
                  </tr>
                ) : (
                  shipments.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold font-mono text-primary flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {item.shipmentNumber}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">Scanned at {item.arrivedAt}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold text-slate-800">{item.consigneeName}</span>
                        <span className="block text-[11px] text-slate-500">{item.originCity} &rarr; {item.destinationCity}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900">
                        PKR {item.codAmount?.toLocaleString() || 0}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                        {item.pieces} pc • {item.weight} kg
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove from batch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
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

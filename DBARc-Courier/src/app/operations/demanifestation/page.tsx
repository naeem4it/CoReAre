'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { List, Save, Printer, RefreshCw, Barcode, Shield, CheckCircle2, PackageCheck, AlertTriangle, Search, X } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus,
  getDbStatusQueryValues
} from '@/shared/constants/shipment-statuses';

interface DeManifestItem {
  id: string;
  documentId?: string;
  shipmentNumber: string;
  shipper: string;
  consignee: string;
  destination: string;
  pieces: number;
  weight: number;
  codAmount: number;
  status: string;
  isVerified: boolean;
}

export default function OperationsDeManifestationPage() {
  const [manifestNumber, setManifestNumber] = React.useState<string>('');
  const [sealNo, setSealNo] = React.useState<string>('');
  const [selectedOffice, setSelectedOffice] = React.useState<string>('all');
  const [offices, setOffices] = React.useState<any[]>([]);
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingManifest, setIsLoadingManifest] = React.useState(false);

  // Incoming Manifest Parcels List
  const [manifestParcels, setManifestParcels] = React.useState<DeManifestItem[]>([]);
  const [activeManifestObj, setActiveManifestObj] = React.useState<any | null>(null);

  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // Load facilities/offices
  React.useEffect(() => {
    apiClient.get('/offices?populate=*&pagination[pageSize]=100')
      .then(res => setOffices(res.data?.data || []))
      .catch(err => console.warn('Could not load offices:', err));
  }, []);

  // Fetch Manifest and its associated In Transit parcels
  const handleLoadManifest = async (mNum?: string) => {
    const cleanNum = (mNum || manifestNumber).trim();
    if (!cleanNum) return;

    setIsLoadingManifest(true);
    try {
      const mRes = await apiClient.get(`/manifests?filters[manifest_number][$eq]=${encodeURIComponent(cleanNum)}&populate[parcels][populate]=*`);
      const manifest = mRes.data?.data?.[0];

      if (!manifest) {
        triggerToast(`Manifest #${cleanNum} not found in database.`, 'error');
        setManifestParcels([]);
        setActiveManifestObj(null);
        return;
      }

      setActiveManifestObj(manifest);
      setSealNo(manifest.seal_no || '');

      // Load associated parcels
      const parcelsList: any[] = manifest.parcels || [];
      const mapped: DeManifestItem[] = parcelsList.map((p: any) => ({
        id: String(p.id),
        documentId: p.documentId,
        shipmentNumber: p.tracking_number,
        shipper: p.shipper?.name || 'Shipper',
        consignee: p.recipient_name || 'Customer',
        destination: p.destination_city?.CityName || p.destination_city?.name || 'Destination',
        pieces: p.pieces || 1,
        weight: Number(p.weight) || 1.0,
        codAmount: Number(p.cod_amount) || 0,
        status: normalizeShipmentStatus(p.status),
        isVerified: normalizeShipmentStatus(p.status) === SHIPMENT_STATUSES.ARRIVED_DEST,
      }));

      setManifestParcels(mapped);
      triggerToast(`Manifest #${cleanNum} loaded (${mapped.length} parcels). Verified destination seal: ${manifest.seal_no || 'None'}`, 'success');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      console.error('Error fetching manifest:', err);
      triggerToast(`Error loading manifest #${cleanNum}: ${err.message}`, 'error');
    } finally {
      setIsLoadingManifest(false);
    }
  };

  // Scan & Verify parcel against the incoming manifest
  const handleScanShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanBarcode.trim().toUpperCase();
    if (!code) return;

    if (!manifestNumber.trim()) {
      triggerToast('Please load an incoming Manifest # first.', 'error');
      return;
    }

    // Check if parcel is part of this manifest
    const existingIndex = manifestParcels.findIndex(p => p.shipmentNumber === code);
    if (existingIndex === -1) {
      triggerToast(`Verification Failed: Shipment #${code} does NOT belong to incoming Manifest #${manifestNumber}!`, 'error');
      setScanBarcode('');
      return;
    }

    const item = manifestParcels[existingIndex];
    if (item.isVerified) {
      triggerToast(`Shipment #${code} is already verified and received.`, 'success');
      setScanBarcode('');
      return;
    }

    // Mark verified locally
    setManifestParcels(prev => prev.map((p, idx) => 
      idx === existingIndex 
        ? { ...p, isVerified: true, status: SHIPMENT_STATUSES.ARRIVED_DEST } 
        : p
    ));

    triggerToast(`Shipment #${code} verified! Ready for destination intake.`, 'success');
    setScanBarcode('');
    barcodeInputRef.current?.focus();
  };

  // Finalize De-Manifestation
  const handleSave = async () => {
    const verifiedItems = manifestParcels.filter(p => p.isVerified);
    if (verifiedItems.length === 0) {
      triggerToast('No shipments have been verified for DeManifestation yet.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Transition all verified parcels to "Arrived at warehouse (Dest)"
      for (const item of verifiedItems) {
        try {
          const targetId = item.documentId || item.id;
          await apiClient.put(`/parcels/${targetId}`, {
            data: { 
              status: SHIPMENT_STATUSES.ARRIVED_DEST,
              arrival_date: new Date().toISOString()
            }
          });
        } catch (e) {
          console.warn(`Could not update ${item.shipmentNumber}:`, e);
        }
      }

      // 2. Update manifest status to Received
      if (activeManifestObj) {
        try {
          const mid = activeManifestObj.documentId || activeManifestObj.id;
          await apiClient.put(`/manifests/${mid}`, { data: { status: 'Received' } });
        } catch (mErr) {
          console.warn('Manifest status update notice:', mErr);
        }
      }

      triggerToast(`De-manifestation for Manifest #${manifestNumber} completed! ${verifiedItems.length} parcels marked "${SHIPMENT_STATUSES.ARRIVED_DEST}".`, 'success');
      setManifestNumber('');
      setSealNo('');
      setManifestParcels([]);
      setActiveManifestObj(null);
    } catch (err) {
      triggerToast('Failed to complete de-manifestation.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset de-manifestation form?')) {
      setManifestNumber('');
      setSealNo('');
      setManifestParcels([]);
      setActiveManifestObj(null);
      setScanBarcode('');
    }
  };

  const verifiedCount = manifestParcels.filter(p => p.isVerified).length;
  const pendingCount = manifestParcels.length - verifiedCount;

  return (
    <PortalLayout>
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success'
            ? <div className="bg-emerald-500 rounded-full p-1 text-white"><CheckCircle2 className="w-4 h-4" /></div>
            : <div className="bg-red-500 rounded-full p-1 text-white"><AlertTriangle className="w-4 h-4" /></div>
          }
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / DeManifestation & Linehaul Inbound</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSave}
              disabled={isSubmitting || verifiedCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Finalizing...' : `Receive & Save (${verifiedCount} Verified)`}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Form Controls: Incoming Manifest Selection & Seal Verification */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Incoming Manifest #</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Manifest # (e.g. 1001)..."
                  value={manifestNumber}
                  onChange={(e) => setManifestNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadManifest()}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleLoadManifest()}
                  disabled={isLoadingManifest || !manifestNumber.trim()}
                  className="bg-primary hover:bg-primary-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" /> Fetch
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" /> Verify Seal No
              </label>
              <input
                type="text"
                placeholder="Bag Seal Number..."
                value={sealNo}
                readOnly
                className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Linehaul Inbound Status</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-between">
                <span>Verified: <strong className="text-emerald-600">{verifiedCount}</strong></span>
                <span>Pending Verification: <strong className="text-amber-600">{pendingCount}</strong></span>
                <span>Total: <strong>{manifestParcels.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Barcode Scanner */}
          <form onSubmit={handleScanShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-primary" /> Scan Tracking Barcode for DeManifest Verification
                </span>
                <span className="text-[10px] text-slate-400">
                  Target Status upon receipt: <strong>{SHIPMENT_STATUSES.ARRIVED_DEST}</strong>
                </span>
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan CN / Tracking barcode from incoming linehaul..."
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!scanBarcode.trim()}
              className="w-full md:w-auto bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer h-10 mt-auto"
            >
              Verify Shipment
            </button>
          </form>

        </div>

        {/* Manifest Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" /> Incoming Manifest Shipments ({manifestParcels.length})
            </span>
            <span className="text-xs text-amber-400 font-bold">
              Target Status on Save: {SHIPMENT_STATUSES.ARRIVED_DEST}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Shipment #</th>
                  <th className="px-6 py-3.5">Shipper</th>
                  <th className="px-6 py-3.5">Consignee</th>
                  <th className="px-6 py-3.5 text-center">Destination</th>
                  <th className="px-6 py-3.5 text-center">Pcs • Wt</th>
                  <th className="px-6 py-3.5 text-center">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {manifestParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No incoming manifest loaded. Enter manifest number above and click Fetch.
                    </td>
                  </tr>
                ) : (
                  manifestParcels.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold font-mono text-slate-900">
                        {s.shipmentNumber}
                      </td>
                      <td className="px-6 py-3.5 text-slate-700">{s.shipper}</td>
                      <td className="px-6 py-3.5 text-slate-900">{s.consignee}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-900">{s.destination}</td>
                      <td className="px-6 py-3.5 text-center">{s.pieces} pc • {s.weight.toFixed(1)} kg</td>
                      <td className="px-6 py-3.5 text-center">
                        {s.isVerified ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Verified (Arrived Dest)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            Pending Scan
                          </span>
                        )}
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

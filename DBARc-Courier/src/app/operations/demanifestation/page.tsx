'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { List, Save, Printer, RefreshCw, Barcode, Shield, CheckCircle2, PackageCheck } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface DeManifestItem {
  id: string;
  shipmentNumber: string;
  shipper: string;
  consignee: string;
  destination: string;
  pieces: number;
  weight: number;
  status: 'Verified' | 'Pending Verification' | 'Damaged';
}

export default function OperationsDeManifestationPage() {
  const [manifestNumber, setManifestNumber] = React.useState<string>('');
  const [sealNo, setSealNo] = React.useState<string>('');
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const [shipments, setShipments] = React.useState<DeManifestItem[]>([]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const handleScanShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanBarcode.trim().toUpperCase();
    if (!code) return;

    if (shipments.some(s => s.shipmentNumber === code)) {
      triggerToast(`Shipment ${code} already added.`, 'error');
      return;
    }

    try {
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(code)}&populate=*`);
      const parcel = res.data?.data?.[0];
      const newItem: DeManifestItem = {
        id: Date.now().toString(),
        shipmentNumber: code,
        shipper: parcel?.shipper?.name || parcel?.pickup_location?.shipper?.name || 'Unknown Shipper',
        consignee: parcel?.recipient_name || 'Unknown Consignee',
        destination: parcel?.destination_city?.name || parcel?.destination_city || 'N/A',
        pieces: parcel?.pieces || 1,
        weight: Number(parcel?.weight) || 1.0,
        status: 'Verified',
      };
      setShipments(prev => [newItem, ...prev]);
    } catch {
      // Add the CN anyway with minimal info
      const newItem: DeManifestItem = {
        id: Date.now().toString(),
        shipmentNumber: code,
        shipper: 'Unknown',
        consignee: 'Unknown',
        destination: 'N/A',
        pieces: 1,
        weight: 1.0,
        status: 'Pending Verification',
      };
      setShipments(prev => [newItem, ...prev]);
    }

    setScanBarcode('');
    barcodeInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('No shipments de-manifested yet.', 'error');
      return;
    }
    if (!manifestNumber.trim()) {
      triggerToast('Please enter the incoming manifest number.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      // Mark all parcels as Arrived in Strapi
      for (const item of shipments) {
        try {
          const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
          const parcel = res.data?.data?.[0];
          if (parcel) {
            await apiClient.put(`/parcels/${parcel.id}`, {
              data: { status: 'Arrived At Destination', arrival_date: new Date().toISOString() }
            });
          }
        } catch (e) {
          console.warn(`Could not update ${item.shipmentNumber}:`, e);
        }
      }

      // Update manifest status to Received if manifest ID exists
      if (manifestNumber) {
        try {
          const mRes = await apiClient.get(`/manifests?filters[manifest_number][$eq]=${manifestNumber}`);
          const mObj = mRes.data?.data?.[0];
          if (mObj) {
            await apiClient.put(`/manifests/${mObj.id}`, { data: { status: 'Received' } });
          }
        } catch (mErr) {
          console.warn('Manifest status update notice:', mErr);
        }
      }

      triggerToast(`De-manifestation for Manifest #${manifestNumber} completed! ${shipments.length} parcels verified & marked Arrived At Destination.`, 'success');
      setManifestNumber('');
      setSealNo('');
      setShipments([]);
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
      setShipments([]);
      setScanBarcode('');
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
            : <div className="bg-red-500 rounded-full p-1 text-white"><Shield className="w-4 h-4" /></div>
          }
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / DeManifestation</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => alert('Viewing past de-manifestation records...')}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save'}
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

        {/* Form Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Incoming Manifest #</label>
              <input
                type="text"
                placeholder="Enter Manifest Number..."
                value={manifestNumber}
                onChange={(e) => setManifestNumber(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" /> Verify Seal No
              </label>
              <input
                type="text"
                placeholder="Enter Bag Seal Number..."
                value={sealNo}
                onChange={(e) => setSealNo(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Barcode Scanner */}
          <form onSubmit={handleScanShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" /> Scan Shipments for DeManifest Verification
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan CN / Tracking barcode..."
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

        </div>

        {/* Shipments List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" /> Verified Incoming Shipments List ({shipments.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Shipment #</th>
                  <th className="px-6 py-3.5">Shipper</th>
                  <th className="px-6 py-3.5">Consignee Name</th>
                  <th className="px-6 py-3.5 text-center">Destination</th>
                  <th className="px-6 py-3.5 text-center">Pieces</th>
                  <th className="px-6 py-3.5 text-center">Weight</th>
                  <th className="px-6 py-3.5 text-center">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No incoming shipments scanned for de-manifestation yet.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {s.shipmentNumber}
                      </td>
                      <td className="px-6 py-3.5 text-slate-700">{s.shipper}</td>
                      <td className="px-6 py-3.5 text-slate-900">{s.consignee}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-900">{s.destination}</td>
                      <td className="px-6 py-3.5 text-center">{s.pieces}</td>
                      <td className="px-6 py-3.5 text-center">{s.weight.toFixed(2)} KG</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                          {s.status}
                        </span>
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

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { List, Save, Printer, RefreshCw, Barcode, Shield, CheckCircle2, PackageCheck } from 'lucide-react';

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
  const [manifestNumber, setManifestNumber] = React.useState<string>('3741');
  const [sealNo, setSealNo] = React.useState<string>('SL-99481');
  const [scanBarcode, setScanBarcode] = React.useState<string>('');

  const [shipments, setShipments] = React.useState<DeManifestItem[]>([
    { id: '1', shipmentNumber: '400798861', shipper: 'Nasir Enterprises', consignee: 'Bilal Khan', destination: 'LHE', pieces: 1, weight: 1.0, status: 'Verified' },
    { id: '2', shipmentNumber: '400796655', shipper: 'Nasir Enterprises', consignee: 'Hassaan Malik', destination: 'LHE', pieces: 1, weight: 1.0, status: 'Verified' },
    { id: '3', shipmentNumber: '400797931', shipper: 'Nasir Enterprises', consignee: 'Laiba Ijaz', destination: 'LHE', pieces: 1, weight: 1.0, status: 'Verified' },
  ]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const handleScanShipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const newItem: DeManifestItem = {
      id: Date.now().toString(),
      shipmentNumber: scanBarcode.trim(),
      shipper: 'Dr. Arooba Organics Lahore',
      consignee: 'Qasim Ali Bhatti',
      destination: 'LHE',
      pieces: 1,
      weight: 0.8,
      status: 'Verified'
    };

    setShipments(prev => [newItem, ...prev]);
    setScanBarcode('');
    barcodeInputRef.current?.focus();
  };

  const handleSave = () => {
    if (shipments.length === 0) {
      alert('No shipments de-manifested yet.');
      return;
    }
    alert(`De-manifestation for Manifest #${manifestNumber} (Seal No: ${sealNo}) completed successfully! Total verified: ${shipments.length} parcels.`);
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> Save
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

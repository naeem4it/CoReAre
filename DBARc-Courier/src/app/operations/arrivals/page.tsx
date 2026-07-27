'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { Plus, Save, Printer, RefreshCw, List, Trash2, Barcode, Scale, Package, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface ArrivalItem {
  id: string;
  shipmentNumber: string;
  pieces: number;
  weight: number;
}

export default function OperationsArrivalsPage() {
  const { user } = useAuth();
  const [arrivalId, setArrivalId] = React.useState<string>(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [selectedRider, setSelectedRider] = React.useState<string>('Zulqadar');
  
  // Barcode input states
  const [scanBarcode, setScanBarcode] = React.useState('');
  const [scanPieces, setScanPieces] = React.useState<number>(1);
  const [scanWeight, setScanWeight] = React.useState<number>(0.8);

  const [shipments, setShipments] = React.useState<ArrivalItem[]>([
    { id: '1', shipmentNumber: '400799928', pieces: 1, weight: 0.8 },
    { id: '2', shipmentNumber: '400767519', pieces: 1, weight: 1.2 },
    { id: '3', shipmentNumber: '400763641', pieces: 1, weight: 1.2 }
  ]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus barcode scanner
  React.useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleAddShipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const newItem: ArrivalItem = {
      id: Date.now().toString(),
      shipmentNumber: scanBarcode.trim(),
      pieces: Number(scanPieces) || 1,
      weight: Number(scanWeight) || 0.5
    };

    setShipments(prev => [newItem, ...prev]);
    setScanBarcode('');
    setScanPieces(1);
    setScanWeight(0.8);
    barcodeInputRef.current?.focus();
  };

  const handleRemoveItem = (id: string) => {
    setShipments(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if (confirm('Reset current arrival batch form?')) {
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setScanBarcode('');
    }
  };

  const handleSave = () => {
    if (shipments.length === 0) {
      alert('Please scan at least one shipment arrival before saving.');
      return;
    }
    alert(`Arrival batch ${arrivalId} saved successfully with ${shipments.length} shipments!`);
  };

  const totalPieces = React.useMemo(() => shipments.reduce((acc, curr) => acc + curr.pieces, 0), [shipments]);
  const totalWeight = React.useMemo(() => shipments.reduce((acc, curr) => acc + curr.weight, 0), [shipments]);

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / Arrivals</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => alert('Viewing saved arrivals history list')}
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

        {/* Scanning & Rider Form Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Batch ID</label>
              <input
                type="text"
                value={arrivalId}
                onChange={(e) => setArrivalId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rider</label>
              <select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Zulqadar">Zulqadar (Rider #2022)</option>
                <option value="Hamza Baloch">Hamza Baloch (Rider #2851)</option>
                <option value="Rahat Yousuf">Rahat Yousuf (Rider #3253)</option>
                <option value="Saleem Usman">Saleem Usman (Rider #3254)</option>
                <option value="Muhammad Sheraz">Muhammad Sheraz (Rider #2095)</option>
              </select>
            </div>
          </div>

          {/* Barcode Scanner Bar */}
          <form onSubmit={handleAddShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-end gap-3">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" /> Scan Shipments (Barcode CN#)
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan or enter Tracking / CN Number..."
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="w-full md:w-32 flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-500" /> Pieces
              </label>
              <input
                type="number"
                min="1"
                value={scanPieces}
                onChange={(e) => setScanPieces(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 text-center outline-none"
              />
            </div>

            <div className="w-full md:w-36 flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-500" /> Weight (KG)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={scanWeight}
                onChange={(e) => setScanWeight(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 text-center outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto h-[42px] px-6 bg-primary hover:bg-primary-600 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>

        </div>

        {/* Shipments List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Shipments List ({shipments.length})</span>
            <div className="flex items-center gap-4 text-xs">
              <span>Total Pieces: <strong className="text-amber-400">{totalPieces}</strong></span>
              <span>Total Weight: <strong className="text-amber-400">{totalWeight.toFixed(2)} KG</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Shipment # (CN)</th>
                  <th className="px-6 py-3.5 text-center">Pieces</th>
                  <th className="px-6 py-3.5 text-center">Weight (KG)</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      No shipments scanned yet. Scan or input CN above.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {s.shipmentNumber}
                      </td>
                      <td className="px-6 py-3.5 text-center">{s.pieces}</td>
                      <td className="px-6 py-3.5 text-center">{s.weight.toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleRemoveItem(s.id)}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
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

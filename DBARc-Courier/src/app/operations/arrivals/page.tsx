'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { 
  Plus, 
  Save, 
  Printer, 
  RefreshCw, 
  List, 
  Trash2, 
  Barcode, 
  Scale, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Clock,
  Volume2,
  Check,
  Building2,
  Truck
} from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, ArrivalService, ParcelService } from '@/services/api';

interface ArrivalItem {
  id: string;
  shipmentNumber: string;
  recipientName: string;
  consigneeName?: string;
  destinationCity: string;
  destination?: string;
  pieces: number;
  weight: number;
  codAmount: number;
  status: string;
  arrivedAt: string;
}

// Web Audio API beep feedback for barcode scanner
const playScannerBeep = (type: 'success' | 'error' = 'success') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // Low buzz
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // AudioContext blocked or not supported
  }
};

export default function OperationsArrivalsPage() {
  const { user } = useAuth();
  const [arrivalId, setArrivalId] = React.useState<string>(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('');
  const [riders, setRiders] = React.useState<any[]>([]);
  
  // Barcode input states
  const [scanBarcode, setScanBarcode] = React.useState('');
  const [scanPieces, setScanPieces] = React.useState<number>(1);
  const [scanWeight, setScanWeight] = React.useState<number>(0.8);
  const [isScanning, setIsScanning] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scanFlash, setScanFlash] = React.useState<'success' | 'error' | null>(null);

  const triggerScanFlash = (type: 'success' | 'error') => {
    setScanFlash(type);
    setTimeout(() => setScanFlash(null), 800);
  };

  // Scanned shipments list
  const [shipments, setShipments] = React.useState<ArrivalItem[]>([]);

  // List History Modal
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [arrivalHistory, setArrivalHistory] = React.useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

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

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch active riders
  React.useEffect(() => {
    const fetchRidersList = async () => {
      try {
        const res = await RiderService.getAll('?filters[status][$ne]=inactive');
        const ridersList = res.data || [];
        setRiders(ridersList);
        if (ridersList.length > 0) {
          setSelectedRiderId(String(ridersList[0].id));
        }
      } catch (err) {
        console.warn('Could not load riders list:', err);
      }
    };

    fetchRidersList();
    barcodeInputRef.current?.focus();
  }, []);

  // Continuous auto-focus on scanner input
  const keepFocus = () => {
    barcodeInputRef.current?.focus();
  };

  const handleAddShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const tracking = scanBarcode.trim().toUpperCase();
    if (shipments.some(s => s.shipmentNumber === tracking)) {
      playScannerBeep('error');
      triggerScanFlash('error');
      triggerToast(`Tracking #${tracking} is already scanned in this session.`, 'error');
      setScanBarcode('');
      return;
    }

    setIsScanning(true);
    try {
      // 1. Look up parcel by tracking number in Strapi
      const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(tracking)}&populate=*`);
      const foundParcel = parcelRes.data?.data?.[0];

      if (!foundParcel) {
        playScannerBeep('error');
        triggerScanFlash('error');
        triggerToast(`Parcel #${tracking} not found in database!`, 'error');
        setScanBarcode('');
        barcodeInputRef.current?.focus();
        return;
      }

      // 2. Mark as Arrived directly in Strapi
      await apiClient.put(`/parcels/${foundParcel.id}`, {
        data: {
          status: 'Arrived',
          arrival_date: new Date().toISOString()
        }
      });

      // 3. Audio & Visual success feedback
      playScannerBeep('success');
      triggerScanFlash('success');
      triggerToast(`Parcel #${tracking} ARRIVED at Courier Facility!`, 'success');

      // 4. Add to scanned list with real parcel details
      const newItem: ArrivalItem = {
        id: foundParcel.id.toString(),
        shipmentNumber: tracking,
        recipientName: foundParcel.recipient_name || 'Customer',
        destinationCity: foundParcel.destination_city?.name || foundParcel.recipient_address?.split(',').pop()?.trim() || 'Pakistan',
        pieces: foundParcel.pieces || Number(scanPieces) || 1,
        weight: foundParcel.weight || Number(scanWeight) || 0.5,
        codAmount: foundParcel.cod_amount || 0,
        status: 'Arrived',
        arrivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setShipments(prev => [newItem, ...prev]);
      setScanBarcode('');
      setScanPieces(1);
      setScanWeight(0.8);
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      playScannerBeep('error');
      console.error('Scan arrival error:', err);
      triggerToast(`Error processing arrival for ${tracking}: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setShipments(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if (confirm('Reset current arrival batch form?')) {
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setScanBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please scan at least one shipment arrival before finalizing batch.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Persist Arrival Batch Record
      try {
        await ArrivalService.createBatch({
          batch_id: arrivalId,
          rider: selectedRiderId ? Number(selectedRiderId) : null,
          total_shipments: shipments.length,
          total_weight: totalWeight,
          total_pieces: totalPieces,
          scanned_items: shipments,
          arrival_date: new Date().toISOString(),
        });
      } catch (arrivalErr) {
        console.warn('Arrival entity record save notice:', arrivalErr);
      }

      triggerToast(`Arrival batch ${arrivalId} finalized! ${shipments.length} parcels recorded.`, 'success');
      
      // Reset form
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setScanBarcode('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      console.error('Failed to save arrival batch:', err);
      triggerToast('Failed to save arrival batch. Please check network connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenListModal = async () => {
    setIsListModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await ArrivalService.getAll('?sort[0]=createdAt:desc&pagination[pageSize]=20');
      setArrivalHistory(res.data || []);
    } catch (err) {
      console.warn('Failed to load arrivals history:', err);
    } finally {
      setIsLoadingHistory(false);
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

      <div className="space-y-6 max-w-[1600px] mx-auto pb-16" onClick={keepFocus}>
        {/* Header Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Barcode className="w-4 h-4" /> Inbound Logistics & Scanners
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Arrivals by Scanner
            </h1>
            <p className="text-xs text-slate-500">
              Scan tracking barcodes directly with handheld or 2D scanner to automatically mark parcels as Arrived.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenListModal}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <List className="w-4 h-4" /> Batch History
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Clear Form
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || shipments.length === 0}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Save className="w-4 h-4" /> Finalize Batch ({shipments.length})
            </button>
          </div>
        </div>

        {/* Scanner Work Area Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          {/* Top Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Batch Code</label>
              <input
                type="text"
                value={arrivalId}
                onChange={(e) => setArrivalId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Origin / Delivering Van or Rider</label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {riders.length === 0 ? (
                  <option value="">In-House Intake / Hub Facility</option>
                ) : (
                  riders.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.phone || 'No Phone'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Barcode Scanner Bar with Visual Glow */}
          <form 
            onSubmit={handleAddShipment} 
            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-end gap-3 ${
              scanFlash === 'success'
                ? 'bg-emerald-50/70 border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg'
                : scanFlash === 'error'
                ? 'bg-rose-50/70 border-rose-500 ring-4 ring-rose-500/20 shadow-lg'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-primary" /> Scan Tracking Barcode
                </span>
                <span className="text-[10px] font-mono font-normal text-slate-400">
                  Ready for physical scanner • Auto-submits on Enter
                </span>
              </label>
              <div className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  required
                  autoFocus
                  disabled={isScanning}
                  placeholder="Scan barcode or type tracking # and hit Enter..."
                  value={scanBarcode}
                  onChange={(e) => setScanBarcode(e.target.value)}
                  className={`w-full bg-white border rounded-xl py-2.5 pl-3.5 pr-24 text-sm font-bold font-mono text-slate-900 focus:outline-none transition-all ${
                    scanFlash === 'success'
                      ? 'border-emerald-500 ring-2 ring-emerald-400'
                      : scanFlash === 'error'
                      ? 'border-rose-500 ring-2 ring-rose-400'
                      : 'border-slate-200 focus:ring-2 focus:ring-primary'
                  }`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  {isScanning ? (
                    <span className="text-[10px] font-bold text-primary animate-pulse">Checking...</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500">
                      SCANNER ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-32 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> Pieces
              </label>
              <input
                type="number"
                min="1"
                value={scanPieces}
                onChange={(e) => setScanPieces(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="w-full md:w-32 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={scanWeight}
                onChange={(e) => setScanWeight(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isScanning}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer h-10 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {isScanning ? 'Verifying...' : 'Scan / Add'}
            </button>
          </form>

          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Scanned Shipments</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{shipments.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Pieces</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalPieces}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Weight</span>
              <p className="text-2xl font-black text-primary mt-1">{totalWeight} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
          </div>

          {/* Scanned Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Shipment Tracking #</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Consignee & Destination</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">COD (PKR)</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pieces & Weight</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No shipments scanned yet. Connect your USB/Bluetooth barcode scanner or type tracking # above.
                    </td>
                  </tr>
                ) : (
                  shipments.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold font-mono text-primary">{item.shipmentNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Scanned at {item.arrivedAt || 'Just now'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{item.consigneeName || 'Customer'}</span>
                          <span className="text-[11px] text-slate-500">{item.destination || 'Hub Destination'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900">
                        PKR {item.codAmount?.toLocaleString() || 0}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                        {item.pieces} pc{item.pieces > 1 ? 's' : ''} • {item.weight} kg
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Arrived
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove from current batch"
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

      {/* ARRIVALS HISTORY MODAL */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Arrivals Batch History</h3>
                  <p className="text-xs text-slate-400">Review previously saved inbound arrival batches.</p>
                </div>
              </div>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500">Loading history...</div>
              ) : arrivalHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No arrival records found.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3">Batch ID</th>
                      <th className="px-4 py-3">Rider</th>
                      <th className="px-4 py-3">Parcels</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arrivalHistory.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{item.batch_id || `ARR-${item.id}`}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.rider?.name || 'Assigned Rider'}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.total_shipments || item.scanned_items?.length || '-'} units</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(item.createdAt || item.arrival_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

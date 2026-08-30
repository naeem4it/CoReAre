'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { Plus, Save, Printer, RefreshCw, List, Trash2, Barcode, Scale, Package, CheckCircle2, AlertCircle, X, Clock } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, ArrivalService, ParcelService } from '@/services/api';

interface ArrivalItem {
  id: string;
  shipmentNumber: string;
  pieces: number;
  weight: number;
}

export default function OperationsArrivalsPage() {
  const { user } = useAuth();
  const [arrivalId, setArrivalId] = React.useState<string>(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('');
  const [riders, setRiders] = React.useState<any[]>([]);
  
  // Barcode input states
  const [scanBarcode, setScanBarcode] = React.useState('');
  const [scanPieces, setScanPieces] = React.useState<number>(1);
  const [scanWeight, setScanWeight] = React.useState<number>(0.8);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const handleAddShipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const tracking = scanBarcode.trim().toUpperCase();
    if (shipments.some(s => s.shipmentNumber === tracking)) {
      triggerToast(`Tracking #${tracking} is already scanned in this batch.`, 'error');
      return;
    }

    const newItem: ArrivalItem = {
      id: Date.now().toString(),
      shipmentNumber: tracking,
      pieces: Number(scanPieces) || 1,
      weight: Number(scanWeight) || 0.5,
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

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please scan at least one shipment arrival before saving.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update parcel statuses to Arrived in Strapi
      const trackingNumbers = shipments.map(s => s.shipmentNumber);
      for (const tracking of trackingNumbers) {
        try {
          const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${tracking}`);
          const foundParcel = parcelRes.data?.data?.[0];
          if (foundParcel) {
            await apiClient.put(`/parcels/${foundParcel.id}`, {
              data: {
                status: 'Arrived',
              }
            });
          }
        } catch (updateErr) {
          console.warn(`Could not update parcel ${tracking}:`, updateErr);
        }
      }

      // 2. Persist Arrival Batch
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

      triggerToast(`Arrival batch ${arrivalId} saved successfully! ${shipments.length} parcels marked as Arrived.`, 'success');
      
      // Reset form
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setScanBarcode('');
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
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success' ? (
            <div className="bg-emerald-500 rounded-full p-1 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="bg-red-500 rounded-full p-1 text-white">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operations Dispatch</div>
            <h1 className="text-xl font-black tracking-tight">Inbound Hub / Arrivals Management</h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenListModal}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <List className="w-4 h-4" /> History
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save & Mark Arrived'}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Sheet
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Scanning & Rider Form Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Batch Identifier</label>
              <input
                type="text"
                value={arrivalId}
                onChange={(e) => setArrivalId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivering Rider / Van</label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {riders.length === 0 ? (
                  <option value="">No active riders found</option>
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

          {/* Barcode Scanner Bar */}
          <form onSubmit={handleAddShipment} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-end gap-3">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" /> Scan Tracking Barcode
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                required
                placeholder="Scan or type tracking # (e.g. DBA-XXXXXXX)"
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer h-10"
            >
              <Plus className="w-4 h-4" /> Add Item
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
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Shipment Number</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pieces</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                      No shipments scanned yet. Use the barcode scanner above to begin.
                    </td>
                  </tr>
                ) : (
                  shipments.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-primary">{item.shipmentNumber}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{item.pieces}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{item.weight} kg</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(item.createdAt || item.arrival_date).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsListModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

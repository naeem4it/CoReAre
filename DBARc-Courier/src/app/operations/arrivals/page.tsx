'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { 
  Plus, 
  Save, 
  RefreshCw, 
  List, 
  Trash2, 
  Barcode, 
  Scale, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2,
  Truck,
  ArrowDownRight,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, ArrivalService } from '@/services/api';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus, 
  getDbStatusQueryValues 
} from '@/shared/constants/shipment-statuses';

interface ArrivalItem {
  id: string;
  documentId?: string;
  shipmentNumber: string;
  recipientName: string;
  consigneeName?: string;
  destinationCity: string;
  originCity?: string;
  shipperName?: string;
  riderName?: string;
  destination?: string;
  pieces: number;
  weight: number;
  codAmount: number;
  status: string;
  arrivedAt: string;
}

// Web Audio API feedback for barcode scanner
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
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
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
  
  // Arrival Type / Stage: Origin Warehouse or Destination Warehouse
  const [arrivalStage, setArrivalStage] = React.useState<'Origin' | 'Dest'>('Origin');
  
  // Selected Warehouse/Office
  const [selectedOfficeId, setSelectedOfficeId] = React.useState<string>('all');
  const [offices, setOffices] = React.useState<any[]>([]);
  const [riders, setRiders] = React.useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('all');

  // Active Tab: Expected vs. Physically Received
  const [activeTab, setActiveTab] = React.useState<'received' | 'expected'>('received');

  // Expected Shipments Queue (fetched from DB)
  const [expectedShipments, setExpectedShipments] = React.useState<any[]>([]);
  const [isLoadingExpected, setIsLoadingExpected] = React.useState(false);

  // Scanned / Confirmed Received shipments in current batch
  const [receivedShipments, setReceivedShipments] = React.useState<ArrivalItem[]>([]);

  // Barcode input states
  const [scanBarcode, setScanBarcode] = React.useState('');
  const [scanPieces, setScanPieces] = React.useState<number>(1);
  const [scanWeight, setScanWeight] = React.useState<number>(0.8);
  const [isScanning, setIsScanning] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scanFlash, setScanFlash] = React.useState<'success' | 'error' | null>(null);

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

  const triggerScanFlash = (type: 'success' | 'error') => {
    setScanFlash(type);
    setTimeout(() => setScanFlash(null), 800);
  };

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch offices and active riders strictly isolated to the current tenant
  React.useEffect(() => {
    const fetchMetadata = async () => {
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

    fetchMetadata();
    barcodeInputRef.current?.focus();
  }, [user]);

  // Fetch Expected Shipments based on warehouse and arrival operation
  const fetchExpectedQueue = React.useCallback(async () => {
    setIsLoadingExpected(true);
    try {
      // For Origin warehouse: expected shipments are 'Booked', 'Picked up by rider', or 'Not Arrived'
      // For Destination warehouse: expected shipments are 'In Transit' / 'Manifested'
      let queryStatuses: string[] = [];
      if (arrivalStage === 'Origin') {
        queryStatuses = [
          'Booked',
          'booked',
          'Total Booking',
          'Pending',
          'Order Created',
          'Picked up by rider',
          'picked up by rider',
          'Not Arrived',
          'not arrived',
          ...getDbStatusQueryValues(SHIPMENT_STATUSES.BOOKED),
          ...getDbStatusQueryValues(SHIPMENT_STATUSES.PICKED_UP_BY_RIDER),
          ...getDbStatusQueryValues(SHIPMENT_STATUSES.NOT_ARRIVED),
        ];
      } else {
        queryStatuses = [
          'In Transit',
          'in transit',
          'Manifested',
          'manifested',
          ...getDbStatusQueryValues(SHIPMENT_STATUSES.IN_TRANSIT)
        ];
      }

      // Deduplicate statuses
      queryStatuses = Array.from(new Set(queryStatuses));

      const statusParams = queryStatuses.map((s, i) => `filters[status][$in][${i}]=${encodeURIComponent(s)}`).join('&');
      
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

      const url = `/parcels?populate=*&${statusParams}&pagination[pageSize]=200&sort[0]=createdAt:desc`;

      const res = await apiClient.get(url);
      const allParcels: any[] = res.data?.data || [];

      // Filter by selected warehouse/office city and tenant isolation
      const selectedOffice = offices.find(o => String(o.id) === String(selectedOfficeId));
      const officeCity = selectedOffice?.city?.CityName || selectedOffice?.city?.name || (typeof selectedOffice?.city === 'string' ? selectedOffice.city : '');

      const filtered = allParcels.filter(p => {
        // Tenant isolation check
        if (tenantId) {
          const offTenantId = p.origin_office?.tenant?.id || p.origin_office?.tenant;
          const shipTenantId = p.shipper?.tenant?.id || p.shipper?.tenant;
          if (offTenantId && Number(offTenantId) !== Number(tenantId)) return false;
          if (shipTenantId && Number(shipTenantId) !== Number(tenantId)) return false;
        }

        // Rider filter if rider selected
        if (selectedRiderId !== 'all') {
          const rId = p.rider?.id || p.rider || p.load_sheet?.rider?.id || p.load_sheet?.rider;
          if (rId && String(rId) !== String(selectedRiderId)) return false;
        }

        // Show all if all facilities is selected or no specific office matched
        if (!selectedOffice || selectedOfficeId === 'all') return true;
        
        if (arrivalStage === 'Origin') {
          // Check origin office or source city
          if (p.origin_office?.id && String(p.origin_office.id) === String(selectedOfficeId)) return true;
          const src = p.source_city?.CityName || p.source_city?.name || (typeof p.source_city === 'string' ? p.source_city : '');
          if (officeCity && src && src.toLowerCase() === officeCity.toLowerCase()) return true;
          // Include unassigned origin
          if (!p.origin_office) return true;
          return false;
        } else {
          // Destination warehouse: check destination city
          const dest = p.destination_city?.CityName || p.destination_city?.name || (typeof p.destination_city === 'string' ? p.destination_city : '');
          if (officeCity && dest && dest.toLowerCase() === officeCity.toLowerCase()) return true;
          return true;
        }
      });

      setExpectedShipments(filtered);
    } catch (err) {
      console.warn('Failed to load expected arrival queue:', err);
    } finally {
      setIsLoadingExpected(false);
    }
  }, [arrivalStage, selectedOfficeId, selectedRiderId, offices, user]);

  React.useEffect(() => {
    fetchExpectedQueue();
  }, [fetchExpectedQueue]);

  // Auto-populate pieces and weight when order tracking is entered/scanned
  const handleLookupAndPopulate = React.useCallback(async (targetTracking?: string) => {
    const tracking = (targetTracking || scanBarcode).trim().toUpperCase();
    if (!tracking) return null;

    // 1. Check if already in the expected shipments queue in memory
    const fromExpected = expectedShipments.find(p => (p.tracking_number || '').trim().toUpperCase() === tracking);
    if (fromExpected) {
      if (fromExpected.pieces !== undefined && fromExpected.pieces !== null) {
        setScanPieces(Number(fromExpected.pieces) || 1);
      }
      if (fromExpected.weight !== undefined && fromExpected.weight !== null) {
        setScanWeight(Number(fromExpected.weight) || 0.5);
      }
      playScannerBeep('success');
      triggerToast(`Order #${tracking} loaded: ${fromExpected.pieces || 1} pcs • ${fromExpected.weight || 0.5} kg`, 'success');
      return fromExpected;
    }

    // 2. Otherwise fetch from backend database
    try {
      const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(tracking)}&populate=*`);
      const foundParcel = parcelRes.data?.data?.[0];
      if (foundParcel) {
        if (foundParcel.pieces !== undefined && foundParcel.pieces !== null) {
          setScanPieces(Number(foundParcel.pieces) || 1);
        }
        if (foundParcel.weight !== undefined && foundParcel.weight !== null) {
          setScanWeight(Number(foundParcel.weight) || 0.5);
        }
        playScannerBeep('success');
        triggerToast(`Order #${tracking} loaded: ${foundParcel.pieces || 1} pcs • ${foundParcel.weight || 0.5} kg`, 'success');
        return foundParcel;
      } else {
        playScannerBeep('error');
        triggerToast(`Parcel #${tracking} not found in database!`, 'error');
      }
    } catch (err: any) {
      console.warn('Could not lookup parcel details:', err);
    }
    return null;
  }, [expectedShipments, scanBarcode]);

  // Handle Scanning or Confirming Arrival
  const handleProcessArrival = async (targetTracking?: string) => {
    const tracking = (targetTracking || scanBarcode).trim().toUpperCase();
    if (!tracking) return;

    if (receivedShipments.some(s => s.shipmentNumber === tracking)) {
      playScannerBeep('error');
      triggerScanFlash('error');
      triggerToast(`Tracking #${tracking} is already scanned in this session.`, 'error');
      if (!targetTracking) setScanBarcode('');
      return;
    }

    setIsScanning(true);
    try {
      const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(tracking)}&populate=*`);
      const foundParcel = parcelRes.data?.data?.[0];

      if (!foundParcel) {
        playScannerBeep('error');
        triggerScanFlash('error');
        triggerToast(`Parcel #${tracking} not found in database!`, 'error');
        if (!targetTracking) setScanBarcode('');
        barcodeInputRef.current?.focus();
        return;
      }

      // Business Rule Validation: Do not show/process unrelated completed delivery/return shipments
      const currentNormStatus = normalizeShipmentStatus(foundParcel.status);
      if (
        currentNormStatus === SHIPMENT_STATUSES.DELIVERED ||
        currentNormStatus === SHIPMENT_STATUSES.RETURN_TO_SHIPPER ||
        currentNormStatus === SHIPMENT_STATUSES.LOST_DAMAGE
      ) {
        playScannerBeep('error');
        triggerScanFlash('error');
        triggerToast(`Shipment #${tracking} is ${currentNormStatus} and cannot be received as active arrival work.`, 'error');
        if (!targetTracking) setScanBarcode('');
        return;
      }

      // Determine target arrival status based on operational stage
      const targetStatus = arrivalStage === 'Origin' 
        ? SHIPMENT_STATUSES.ARRIVED_ORIGIN 
        : SHIPMENT_STATUSES.ARRIVED_DEST;

      const targetIdentifier = foundParcel.documentId || foundParcel.id;
      await apiClient.put(`/parcels/${targetIdentifier}`, {
        data: {
          status: targetStatus,
          arrival_date: new Date().toISOString()
        }
      });

      playScannerBeep('success');
      triggerScanFlash('success');
      triggerToast(`Parcel #${tracking} marked ${targetStatus}!`, 'success');

      // Resolve delivering rider:
      // If a rider is selected from the dropdown above, assign it to the grid entry!
      // Otherwise fall back to parcel's rider or 'Unassigned'
      const selectedRiderObj = riders.find(r => String(r.id) === String(selectedRiderId));
      const riderDisplayName = selectedRiderId !== 'all' && selectedRiderObj
        ? (selectedRiderObj.name || selectedRiderObj.username || `Rider #${selectedRiderObj.id}`)
        : (foundParcel.rider?.name || foundParcel.rider?.username || '-');

      // Add to physically received list
      const newItem: ArrivalItem = {
        id: foundParcel.id.toString(),
        documentId: targetIdentifier,
        shipmentNumber: tracking,
        recipientName: foundParcel.recipient_name || 'Customer',
        consigneeName: foundParcel.recipient_name || 'Customer',
        originCity: foundParcel.source_city?.CityName || foundParcel.source_city?.name || 'Origin',
        destinationCity: foundParcel.destination_city?.CityName || foundParcel.destination_city?.name || 'Destination',
        shipperName: foundParcel.shipper?.name || 'Shipper',
        riderName: riderDisplayName,
        pieces: Number(scanPieces) || foundParcel.pieces || 1,
        weight: Number(scanWeight) || foundParcel.weight || 0.8,
        codAmount: foundParcel.cod_amount || 0,
        status: targetStatus,
        arrivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setReceivedShipments(prev => [newItem, ...prev]);

      // Remove from Expected queue immediately (Active Queue Isolation)
      setExpectedShipments(prev => prev.filter(p => p.tracking_number.toUpperCase() !== tracking));

      if (!targetTracking) {
        setScanBarcode('');
        setScanPieces(1);
        setScanWeight(0.8);
        barcodeInputRef.current?.focus();
      }
    } catch (err: any) {
      playScannerBeep('error');
      console.error('Scan arrival error:', err);
      triggerToast(`Error processing arrival for ${tracking}: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Mark an Expected parcel as "Not Arrived"
  const handleMarkNotArrived = async (parcel: any) => {
    try {
      const targetId = parcel.documentId || parcel.id;
      await apiClient.put(`/parcels/${targetId}`, {
        data: { status: SHIPMENT_STATUSES.NOT_ARRIVED }
      });
      triggerToast(`Shipment #${parcel.tracking_number} marked as NOT ARRIVED.`, 'success');
      fetchExpectedQueue();
    } catch (err: any) {
      triggerToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleRemoveItem = (id: string) => {
    setReceivedShipments(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if (confirm('Reset current arrival batch?')) {
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setReceivedShipments([]);
      setScanBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleSave = async () => {
    if (receivedShipments.length === 0) {
      triggerToast('Please scan or confirm at least one shipment arrival before finalizing batch.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await ArrivalService.createBatch({
        batch_id: arrivalId,
        total_shipments: receivedShipments.length,
        total_weight: totalWeight,
        total_pieces: totalPieces,
        scanned_items: receivedShipments,
        arrival_date: new Date().toISOString(),
      });

      triggerToast(`Arrival batch ${arrivalId} finalized! ${receivedShipments.length} parcels recorded.`, 'success');
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setReceivedShipments([]);
      setScanBarcode('');
      fetchExpectedQueue();
    } catch (err: any) {
      console.error('Failed to save arrival batch:', err);
      triggerToast('Failed to save arrival batch. Please check connection.', 'error');
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

  const totalPieces = React.useMemo(() => receivedShipments.reduce((acc, curr) => acc + curr.pieces, 0), [receivedShipments]);
  const totalWeight = React.useMemo(() => Math.round(receivedShipments.reduce((acc, curr) => acc + curr.weight, 0) * 10) / 10, [receivedShipments]);

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

      <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
        
        {/* Header Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Barcode className="w-4 h-4" /> Operations / Warehouse Intake & Arrivals
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Arrivals Receiving Station
            </h1>
            <p className="text-xs text-slate-500">
              Receive inbound shipments for selected warehouse. Distinguishes Expected vs. Physically Received shipments.
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
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || receivedShipments.length === 0}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Save className="w-4 h-4" /> Finalize Batch ({receivedShipments.length})
            </button>
          </div>
        </div>

        {/* Warehouse, Stage & Mode Controls Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
            {/* Arrival Operation Stage */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Operation</label>
              <select
                value={arrivalStage}
                onChange={(e) => setArrivalStage(e.target.value as 'Origin' | 'Dest')}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Origin">🏢 Origin Warehouse Arrival (Intake)</option>
                <option value="Dest">🎯 Destination Warehouse Arrival (Linehaul)</option>
              </select>
            </div>

            {/* Warehouse / Office Location */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Warehouse / Office
              </label>
              <select
                value={selectedOfficeId}
                onChange={(e) => setSelectedOfficeId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Facilities</option>
                {offices.map((o: any) => {
                  const cityName = o.city?.CityName || o.city?.name || '';
                  return (
                    <option key={o.id} value={String(o.id)}>
                      {o.name || `Office #${o.id}`} {cityName ? `(${cityName})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter by Delivering Rider */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Delivering Rider (Optional)
              </label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Riders</option>
                {riders.map((r: any) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name || r.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrival Batch ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Batch ID</label>
              <input
                type="text"
                value={arrivalId}
                onChange={(e) => setArrivalId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Barcode Scanner Bar */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleProcessArrival(); }} 
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
                  <Barcode className="w-4 h-4 text-primary" /> Scan Tracking Barcode ({arrivalStage === 'Origin' ? 'Origin Arrival' : 'Dest Arrival'})
                </span>
                <span className="text-[10px] font-mono font-normal text-slate-400">
                  Target Status: <strong>{arrivalStage === 'Origin' ? SHIPMENT_STATUSES.ARRIVED_ORIGIN : SHIPMENT_STATUSES.ARRIVED_DEST}</strong>
                </span>
              </label>
              <div className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  required
                  disabled={isScanning}
                  placeholder="Scan barcode or enter tracking # and press Tab..."
                  value={scanBarcode}
                  onChange={(e) => setScanBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && scanBarcode.trim()) {
                      handleLookupAndPopulate(scanBarcode);
                    }
                  }}
                  onBlur={() => {
                    if (scanBarcode.trim()) {
                      handleLookupAndPopulate(scanBarcode);
                    }
                  }}
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
                    <span className="text-[10px] font-bold text-primary animate-pulse">Receiving...</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500">
                      SCANNER READY
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
              disabled={isScanning || !scanBarcode.trim()}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer h-10 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {isScanning ? 'Receiving...' : 'Confirm Arrival'}
            </button>
          </form>

          {/* Section Navigation Tabs: Physically Received vs. Expected (Pending Physical Arrival) */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('received')}
              className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'received'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Physically Received ({receivedShipments.length})
            </button>
            <button
              onClick={() => setActiveTab('expected')}
              className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'expected'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" /> Expected / Inbound Work Queue ({expectedShipments.length})
            </button>
          </div>

          {/* Tab 1: Physically Received Shipments */}
          {activeTab === 'received' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase">Received Shipments</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{receivedShipments.length}</p>
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

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking #</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Consignee & Route</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Rider</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">COD (PKR)</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pcs • Wt</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivedShipments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No shipments received yet in this batch. Scan tracking barcode or receive from Expected queue below.
                        </td>
                      </tr>
                    ) : (
                      receivedShipments.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-bold font-mono text-primary">{item.shipmentNumber}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">Scanned at {item.arrivedAt}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-bold text-slate-800">{item.consigneeName}</span>
                            <span className="block text-[11px] text-slate-500">{item.originCity} &rarr; {item.destinationCity}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            {item.riderName && item.riderName !== '-' && item.riderName !== 'Rider' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                                  <Truck className="w-3 h-3 text-indigo-600" />
                                </span>
                                <span className="text-xs font-bold text-slate-800">{item.riderName}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Unassigned</span>
                            )}
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
          )}

          {/* Tab 2: Expected Shipments (Pending Physical Arrival) */}
          {activeTab === 'expected' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Expected shipments for <strong>{arrivalStage === 'Origin' ? 'Origin Intake' : 'Destination Linehaul'}</strong>. 
                    These parcels have been booked/dispatched but not yet physically verified into warehouse inventory.
                  </span>
                </div>
                <button
                  onClick={fetchExpectedQueue}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExpected ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking #</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Shipper / Consignee</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Route</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Rider</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pcs • Wt</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Receiving Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingExpected ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          Loading expected shipments...
                        </td>
                      </tr>
                    ) : expectedShipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No pending expected shipments for this warehouse. All dispatched cargo has been physically arrived!
                        </td>
                      </tr>
                    ) : (
                      expectedShipments.map((p) => {
                        const isNotArrived = normalizeShipmentStatus(p.status) === SHIPMENT_STATUSES.NOT_ARRIVED;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-bold font-mono text-slate-900">{p.tracking_number}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-slate-800">{p.shipper?.name || 'Shipper'}</span>
                              <span className="block text-[11px] text-slate-500">&rarr; {p.recipient_name || 'Customer'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                              {(p.source_city?.CityName || p.source_city?.name || 'Origin')} &rarr; {(p.destination_city?.CityName || p.destination_city?.name || 'Dest')}
                            </td>
                            <td className="px-5 py-3.5">
                              {p.rider?.name ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                                    <Truck className="w-3 h-3 text-indigo-600" />
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">{p.rider.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isNotArrived
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isNotArrived ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {p.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                              {p.pieces || 1} pc • {p.weight || 0.5} kg
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleProcessArrival(p.tracking_number)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Received
                                </button>
                                {!isNotArrived && arrivalStage === 'Origin' && (
                                  <button
                                    onClick={() => handleMarkNotArrived(p)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-rose-200"
                                    title="Mark parcel as missing / Not Arrived at origin warehouse"
                                  >
                                    Not Arrived
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                      <th className="px-4 py-3">Parcels</th>
                      <th className="px-4 py-3">Weight</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arrivalHistory.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{item.batch_id || `ARR-${item.id}`}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.total_shipments || item.scanned_items?.length || '-'} units</td>
                        <td className="px-4 py-3 text-slate-600">{item.total_weight || '-'} kg</td>
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

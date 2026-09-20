'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { 
  List, 
  Save, 
  Printer, 
  RefreshCw, 
  Barcode, 
  Shield, 
  MapPin, 
  X, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  Building2,
  CheckSquare,
  Square,
  Package,
  Boxes,
  Truck,
  Plus
} from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus 
} from '@/shared/constants/shipment-statuses';

interface ManifestItem {
  id: string;
  manifestNumber: number;
  date: string;
  manifestType: string;
  thirdParty: string;
  station: string;
  sealNo: string;
  cityCode: string;
}

interface ManifestShipment {
  id: string;
  parcelId?: number | string;
  shipmentNumber: string;
  bookingDate: string;
  trackPolyCn: string;
  shipperName: string;
  consigneeName: string;
  consigneeContact: string;
  consigneeAddress: string;
  destinationCity: string;
  pieces?: number;
  weight?: number;
  cashCollect: number;
  status: string;
}

export default function OperationsManifestationPage() {
  const { user } = useAuth();
  const [manifestNumber, setManifestNumber] = React.useState<number>(() => Math.floor(1000 + Math.random() * 9000));
  const [manifestType, setManifestType] = React.useState<string>('Station');
  const [selectedStation, setSelectedStation] = React.useState<string>('Lahore Hub');
  const [sealNo, setSealNo] = React.useState<string>(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  // Database Offices / Hubs for Destination Station
  const [offices, setOffices] = React.useState<any[]>([]);

  // View Arrivals Modal States
  const [isArrivalsModalOpen, setIsArrivalsModalOpen] = React.useState(false);
  const [isLoadingArrivals, setIsLoadingArrivals] = React.useState(false);
  const [arrivalParcels, setArrivalParcels] = React.useState<any[]>([]);
  const [modalSelectedHubId, setModalSelectedHubId] = React.useState<string>('all');
  const [arrivalsSearchQuery, setArrivalsSearchQuery] = React.useState<string>('');
  const [selectedArrivalIds, setSelectedArrivalIds] = React.useState<string[]>([]);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch tenant offices/hubs strictly from DB for Destination Station dropdown and arrival filtering
  React.useEffect(() => {
    const fetchOffices = async () => {
      try {
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

        const filters: any = { type: 'courier' };
        if (tenantId) {
          filters.tenant = tenantId;
        }

        const res = await apiClient.get('/offices', {
          params: {
            filters,
            populate: ['city', 'tenant'],
            pagination: { limit: 100 }
          }
        });

        const rawOffices = res.data?.data || [];
        const tenantOffices = rawOffices.filter((item: any) => {
          if (!tenantId) return true;
          const attrs = item.attributes || item;
          const offTenantId = attrs.tenant?.data?.id || attrs.tenant?.id || attrs.tenant;
          return offTenantId ? Number(offTenantId) === Number(tenantId) : true;
        });

        setOffices(tenantOffices);
        if (tenantOffices.length > 0) {
          const firstOffice = tenantOffices[0];
          const cityName = firstOffice.city?.CityName || firstOffice.city?.name || (typeof firstOffice.city === 'string' ? firstOffice.city : '');
          setSelectedStation(`${firstOffice.name || `Office #${firstOffice.id}`}${cityName ? ` (${cityName})` : ''}`);
        }
      } catch (err) {
        console.warn('Failed to fetch destination offices:', err);
      }
    };

    fetchOffices();
  }, [user]);

  // Past manifests from backend
  const [pastManifests, setPastManifests] = React.useState<ManifestItem[]>([]);

  const fetchPastManifests = async () => {
    try {
      const res = await apiClient.get('/manifests?sort[0]=createdAt:desc&pagination[limit]=20');
      const items = (res.data?.data || []).map((m: any) => ({
        id: String(m.id),
        manifestNumber: m.manifest_number || m.id,
        date: m.date ? new Date(m.date).toLocaleString() : new Date(m.createdAt).toLocaleString(),
        manifestType: m.manifest_type || 'Station',
        thirdParty: m.third_party || '-',
        station: m.station || '',
        sealNo: m.seal_no || '',
        cityCode: m.city_code || '',
      }));
      setPastManifests(items);
    } catch (e) {
      console.warn('Could not load manifests:', e);
    }
  };

  // Fetch Inbound Arrived Parcels for "View Arrivals" Modal
  const fetchArrivalsQueue = React.useCallback(async () => {
    setIsLoadingArrivals(true);
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

      const queryStatuses = [
        'Arrived at warehouse (Origin)',
        'Arrived at the warehouse',
        'Arrived at warehouse',
        'Arrived',
        'Booked',
        'booked',
        'Total Booking',
        'Picked up by rider',
        'picked up by rider',
        'Order Created'
      ];
      const statusParams = queryStatuses.map((s, i) => `filters[status][$in][${i}]=${encodeURIComponent(s)}`).join('&');
      const url = `/parcels?populate=*&${statusParams}&pagination[pageSize]=200&sort[0]=createdAt:desc`;
      
      const res = await apiClient.get(url);
      let allParcels: any[] = res.data?.data || [];

      // Filter by tenant isolation
      if (tenantId && allParcels.length > 0) {
        allParcels = allParcels.filter(p => {
          const offTenantId = p.origin_office?.tenant?.id || p.origin_office?.tenant;
          const shipTenantId = p.shipper?.tenant?.id || p.shipper?.tenant;
          if (offTenantId && Number(offTenantId) !== Number(tenantId)) return false;
          if (shipTenantId && Number(shipTenantId) !== Number(tenantId)) return false;
          return true;
        });
      }

      setArrivalParcels(allParcels);
    } catch (err) {
      console.warn('Failed to load arrivals queue for manifest:', err);
      setArrivalParcels([]);
    } finally {
      setIsLoadingArrivals(false);
    }
  }, [user]);

  const handleOpenArrivalsModal = () => {
    setIsArrivalsModalOpen(true);
    setModalSelectedHubId('all');
    setArrivalsSearchQuery('');
    setSelectedArrivalIds([]);
    fetchArrivalsQueue();
  };

  // Modal State
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState('');

  const [shipments, setShipments] = React.useState<ManifestShipment[]>([]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanBarcode.trim().toUpperCase();
    if (!code) return;

    if (shipments.some(s => s.shipmentNumber === code)) {
      triggerToast(`Shipment ${code} is already in current manifest.`, 'error');
      setScanBarcode('');
      return;
    }

    try {
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(code)}&populate=*`);
      const parcel = res.data?.data?.[0];

      if (!parcel) {
        triggerToast(`Shipment #${code} not found in system!`, 'error');
        setScanBarcode('');
        return;
      }

      // BUSINESS RULE: Manifestation eligibility validation
      const normStatus = normalizeShipmentStatus(parcel.status);
      const isEligible = 
        normStatus === SHIPMENT_STATUSES.BOOKED ||
        normStatus === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER ||
        normStatus === SHIPMENT_STATUSES.ARRIVED_ORIGIN;

      if (!isEligible) {
        triggerToast(`Cannot manifest #${code}: Current status is "${normStatus}". Only Booked, Picked Up, or Origin-Arrived parcels can be manifested.`, 'error');
        setScanBarcode('');
        return;
      }

      const targetId = parcel.documentId || parcel.id;
      // Update status immediately to In Transit
      try {
        await apiClient.put(`/parcels/${targetId}`, {
          data: { status: SHIPMENT_STATUSES.IN_TRANSIT }
        });
      } catch (putErr) {
        console.warn('Could not update status to In Transit immediately:', putErr);
      }

      const newItem: ManifestShipment = {
        id: Date.now().toString(),
        parcelId: targetId,
        shipmentNumber: code,
        bookingDate: parcel.createdAt ? parcel.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        trackPolyCn: parcel.poly_tracking || `TRX-${code}`,
        shipperName: parcel.shipper?.name || parcel.pickup_location?.shipper?.name || 'Unknown Shipper',
        consigneeName: parcel.recipient_name || 'Unknown Consignee',
        consigneeContact: parcel.recipient_phone || '',
        consigneeAddress: parcel.recipient_address || '',
        destinationCity: parcel.destination_city?.CityName || parcel.destination_city?.name || 'Destination',
        pieces: parcel.pieces || 1,
        weight: parcel.weight || 0.8,
        cashCollect: Number(parcel.cod_amount) || 0,
        status: SHIPMENT_STATUSES.IN_TRANSIT,
      };

      setShipments(prev => [newItem, ...prev]);
      triggerToast(`Added #${code} to manifest. Status updated to "${SHIPMENT_STATUSES.IN_TRANSIT}".`, 'success');
      setScanBarcode('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      triggerToast(`Error looking up #${code}: ${err.message}`, 'error');
      setScanBarcode('');
    }
  };

  // Filtered Arrivals in Modal by Destination Hub and Search
  const filteredArrivalParcels = React.useMemo(() => {
    let list = arrivalParcels;

    // Filter out parcels already added to the manifest shipments list
    list = list.filter(p => !shipments.some(s => s.shipmentNumber === (p.tracking_number || '').toUpperCase()));

    // Filter by destination office hub selection
    if (modalSelectedHubId && modalSelectedHubId !== 'all') {
      const selectedOffice = offices.find(o => String(o.id) === String(modalSelectedHubId));
      const officeCity = selectedOffice?.city?.CityName || selectedOffice?.city?.name || (typeof selectedOffice?.city === 'string' ? selectedOffice.city : '') || '';
      const officeName = (selectedOffice?.name || '').toLowerCase();

      list = list.filter(p => {
        // 1. Direct destination office relationship
        if (p.destination_office?.id && String(p.destination_office.id) === String(modalSelectedHubId)) return true;
        
        // 2. Match destination city
        const destCity = p.destination_city?.CityName || p.destination_city?.name || (typeof p.destination_city === 'string' ? p.destination_city : '') || '';
        if (officeCity && destCity && destCity.toLowerCase() === officeCity.toLowerCase()) return true;

        // 3. Match recipient address mentioning city or office name
        const addr = (p.recipient_address || '').toLowerCase();
        if (officeCity && addr.includes(officeCity.toLowerCase())) return true;
        if (officeName && addr.includes(officeName)) return true;

        return false;
      });
    }

    // Filter by search text query
    if (arrivalsSearchQuery.trim()) {
      const q = arrivalsSearchQuery.trim().toLowerCase();
      list = list.filter(p => {
        const trk = (p.tracking_number || '').toLowerCase();
        const ship = (p.shipper?.name || '').toLowerCase();
        const rec = (p.recipient_name || '').toLowerCase();
        const dest = (p.destination_city?.CityName || p.destination_city?.name || '').toLowerCase();
        return trk.includes(q) || ship.includes(q) || rec.includes(q) || dest.includes(q);
      });
    }

    return list;
  }, [arrivalParcels, shipments, modalSelectedHubId, offices, arrivalsSearchQuery]);

  // Checkbox toggle helpers
  const toggleSelectArrival = (id: string) => {
    setSelectedArrivalIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllArrivals = () => {
    const allFilteredIds = filteredArrivalParcels.map(p => String(p.id));
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedArrivalIds.includes(id));

    if (allSelected) {
      setSelectedArrivalIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedArrivalIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Add selected arrival orders into main manifest grid
  const handleAddSelectedArrivalsToManifest = async () => {
    if (selectedArrivalIds.length === 0) return;

    const parcelsToAdd = arrivalParcels.filter(p => selectedArrivalIds.includes(String(p.id)));
    const newItems: ManifestShipment[] = [];

    for (const parcel of parcelsToAdd) {
      const targetId = parcel.documentId || parcel.id;
      const code = (parcel.tracking_number || '').trim().toUpperCase();

      if (shipments.some(s => s.shipmentNumber === code)) continue;

      // Update parcel status to In Transit in backend immediately
      try {
        await apiClient.put(`/parcels/${targetId}`, {
          data: { status: SHIPMENT_STATUSES.IN_TRANSIT }
        });
      } catch (putErr) {
        console.warn('Could not update status for parcel:', putErr);
      }

      newItems.push({
        id: (Date.now() + Math.random()).toString(),
        parcelId: targetId,
        shipmentNumber: code,
        bookingDate: parcel.createdAt ? parcel.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        trackPolyCn: parcel.poly_tracking || `TRX-${code}`,
        shipperName: parcel.shipper?.name || parcel.pickup_location?.shipper?.name || 'Unknown Shipper',
        consigneeName: parcel.recipient_name || 'Unknown Consignee',
        consigneeContact: parcel.recipient_phone || '',
        consigneeAddress: parcel.recipient_address || '',
        destinationCity: parcel.destination_city?.CityName || parcel.destination_city?.name || 'Destination',
        pieces: parcel.pieces || 1,
        weight: parcel.weight || 0.8,
        cashCollect: Number(parcel.cod_amount) || 0,
        status: SHIPMENT_STATUSES.IN_TRANSIT,
      });
    }

    if (newItems.length > 0) {
      setShipments(prev => [...newItems, ...prev]);
      triggerToast(`Added ${newItems.length} arrival orders to manifest!`, 'success');
    }

    // Automatically set destination office on main screen
    if (modalSelectedHubId && modalSelectedHubId !== 'all') {
      const selectedOffice = offices.find(o => String(o.id) === String(modalSelectedHubId));
      if (selectedOffice) {
        const cityName = selectedOffice.city?.CityName || selectedOffice.city?.name || (typeof selectedOffice.city === 'string' ? selectedOffice.city : '') || '';
        const label = `${selectedOffice.name || `Office #${selectedOffice.id}`}${cityName ? ` (${cityName})` : ''}`;
        setSelectedStation(label);
      }
    } else if (parcelsToAdd.length > 0) {
      // If 'all' was selected, check if all added parcels share a destination office or destination city
      const firstParcel = parcelsToAdd[0];
      const destOffId = firstParcel.destination_office?.id;
      const destCity = firstParcel.destination_city?.CityName || firstParcel.destination_city?.name || (typeof firstParcel.destination_city === 'string' ? firstParcel.destination_city : '');
      
      let matchedOffice = destOffId ? offices.find(o => String(o.id) === String(destOffId)) : null;
      if (!matchedOffice && destCity) {
        matchedOffice = offices.find(o => {
          const oCity = o.city?.CityName || o.city?.name || (typeof o.city === 'string' ? o.city : '');
          return oCity && oCity.toLowerCase() === destCity.toLowerCase();
        });
      }
      if (matchedOffice) {
        const cityName = matchedOffice.city?.CityName || matchedOffice.city?.name || (typeof matchedOffice.city === 'string' ? matchedOffice.city : '') || '';
        const label = `${matchedOffice.name || `Office #${matchedOffice.id}`}${cityName ? ` (${cityName})` : ''}`;
        setSelectedStation(label);
      }
    }

    setIsArrivalsModalOpen(false);
    setSelectedArrivalIds([]);
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please scan or select at least one shipment before creating manifest.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Persist Manifest record in Strapi backend
      let savedManifestId: number | null = null;
      try {
        const manifestRes = await apiClient.post('/manifests', {
          data: {
            manifest_number: manifestNumber,
            seal_no: sealNo,
            manifest_type: manifestType === '3PL' ? 'TPL' : manifestType,
            station: selectedStation,
            total_parcels: shipments.length,
            total_cash: shipments.reduce((a, s) => a + s.cashCollect, 0),
            status: 'Dispatched',
            date: new Date().toISOString(),
          }
        });
        savedManifestId = manifestRes.data?.data?.id || null;
      } catch (e: any) {
        console.warn('Manifest persistence note:', e?.message || e);
      }

      // 2. Mark each parcel as In Transit and link to manifest
      for (const item of shipments) {
        try {
          let docId = item.parcelId;
          if (!docId || /^\d+$/.test(String(docId))) {
            const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
            docId = parcelRes.data?.data?.[0]?.documentId;
          }
          if (docId) {
            await apiClient.put(`/parcels/${docId}`, { 
              data: { 
                status: SHIPMENT_STATUSES.IN_TRANSIT,
                ...(savedManifestId ? { manifest: savedManifestId } : {})
              } 
            });
          }
        } catch (e) {
          console.warn(`Could not update ${item.shipmentNumber}:`, e);
        }
      }

      triggerToast(`Manifest #${manifestNumber} (Seal: ${sealNo}) dispatched! ${shipments.length} parcels marked "${SHIPMENT_STATUSES.IN_TRANSIT}".`, 'success');
      setManifestNumber(prev => prev + 1);
      setSealNo(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
      setShipments([]);
    } catch (err) {
      triggerToast('Failed to save manifest.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset manifestation form?')) {
      setManifestNumber(prev => prev + 1);
      setSealNo(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
      setShipments([]);
      setScanBarcode('');
    }
  };

  const filteredPastManifests = pastManifests.filter(m =>
    m.manifestNumber.toString().includes(modalSearch) ||
    m.station.toLowerCase().includes(modalSearch.toLowerCase()) ||
    m.sealNo.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <PortalLayout>
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success'
            ? <div className="bg-emerald-500 rounded-full p-1 text-white"><CheckCircle2 className="w-4 h-4" /></div>
            : <div className="bg-red-500 rounded-full p-1 text-white"><AlertCircle className="w-4 h-4" /></div>
          }
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / Manifestation & Linehaul Dispatch</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Arrivals Button */}
            <button
              onClick={handleOpenArrivalsModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="View arrived orders filtered by destination hub and add to manifest"
            >
              <PackageCheck className="w-4 h-4" /> View Arrivals
            </button>

            <button
              onClick={() => { setIsListModalOpen(true); fetchPastManifests(); }}
              className="bg-primary hover:bg-primary-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <List className="w-4 h-4" /> Past Manifests
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || shipments.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Dispatching...' : `Dispatch Manifest (${shipments.length})`}
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manifest #</label>
              <input
                type="number"
                value={manifestNumber}
                onChange={(e) => setManifestNumber(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manifest Type</label>
              <select
                value={manifestType}
                onChange={(e) => setManifestType(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Station">Station (Internal Courier Hub)</option>
                <option value="3PL Partner">3PL Partner Courier</option>
                <option value="Airport">Airport Express Cargo</option>
              </select>
            </div>

            {/* Destination Station / Hub populated dynamically from database */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Destination Station / Hub
              </label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {offices.length > 0 ? (
                  offices.map((o: any) => {
                    const cityName = o.city?.CityName || o.city?.name || (typeof o.city === 'string' ? o.city : '') || '';
                    const label = `${o.name || `Office #${o.id}`}${cityName ? ` (${cityName})` : ''}`;
                    return (
                      <option key={o.id} value={label}>
                        {label}
                      </option>
                    );
                  })
                ) : (
                  <option value="Lahore Hub (LHE)">Lahore Hub (LHE)</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" /> Seal No
              </label>
              <input
                type="text"
                value={sealNo}
                onChange={(e) => setSealNo(e.target.value)}
                placeholder="Bag Seal Serial #"
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
          </div>

          {/* Barcode Scan Input */}
          <form onSubmit={handleAddShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-primary" /> Scan Eligible Shipments (Booked / Picked Up / Origin Arrived)
                </span>
                <span className="text-[10px] text-slate-400">
                  Target Status on Dispatch: <strong>{SHIPMENT_STATUSES.IN_TRANSIT}</strong>
                </span>
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan tracking barcode or type CN and hit Enter..."
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
              Add to Manifest
            </button>
          </form>

        </div>

        {/* Manifest Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <span>Manifest Shipments List ({shipments.length})</span>
            </div>
            <span className="text-xs text-amber-400 font-bold">Total Cash Collect: PKR {shipments.reduce((acc, curr) => acc + curr.cashCollect, 0).toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Shipment #</th>
                  <th className="px-4 py-3.5">Booking Date</th>
                  <th className="px-4 py-3.5">Shipper</th>
                  <th className="px-4 py-3.5">Consignee & Dest</th>
                  <th className="px-4 py-3.5 text-right">Cash Collect</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No shipments added to manifest yet. Click <strong>"View Arrivals"</strong> above or scan barcode.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-primary">{s.shipmentNumber}</td>
                      <td className="px-4 py-3.5 text-slate-600">{s.bookingDate}</td>
                      <td className="px-4 py-3.5 text-slate-900">{s.shipperName}</td>
                      <td className="px-4 py-3.5 text-slate-900">
                        <div>{s.consigneeName}</div>
                        <div className="text-[10px] text-slate-500">{s.destinationCity}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">PKR {s.cashCollect.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setShipments(prev => prev.filter(item => item.id !== s.id))}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VIEW ARRIVALS POPUP MODAL */}
        {isArrivalsModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 my-auto">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                    <PackageCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Arrivals Inbound Queue</h2>
                    <p className="text-xs text-slate-500">
                      Filter arrived shipments by destination office hub and select parcels to add into this linehaul manifest.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsArrivalsModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Controls Bar: Office Hub Dropdown & Search */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* Destination Office / Hub Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-primary" /> Destination Hub:
                  </span>
                  <select
                    value={modalSelectedHubId}
                    onChange={(e) => setModalSelectedHubId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer w-full sm:w-64"
                  >
                    <option value="all">🏢 All Destination Hubs ({offices.length} Facilities)</option>
                    {offices.map((o: any) => {
                      const cityName = o.city?.CityName || o.city?.name || (typeof o.city === 'string' ? o.city : '') || '';
                      return (
                        <option key={o.id} value={String(o.id)}>
                          {o.name || `Office #${o.id}`} {cityName ? `(${cityName})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Search in Arrivals */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tracking #, consignee, shipper..."
                    value={arrivalsSearchQuery}
                    onChange={(e) => setArrivalsSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
                  />
                  {arrivalsSearchQuery && (
                    <button 
                      onClick={() => setArrivalsSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500 shrink-0">
                  {filteredArrivalParcels.length} eligible {filteredArrivalParcels.length === 1 ? 'order' : 'orders'}
                </div>
              </div>

              {/* Arrivals Orders Grid with Checkboxes */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {isLoadingArrivals ? (
                  <div className="py-16 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-bold text-slate-600">Loading arrived shipments...</p>
                  </div>
                ) : filteredArrivalParcels.length === 0 ? (
                  <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-200 p-8">
                    <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-slate-800">
                      {arrivalsSearchQuery || modalSelectedHubId !== 'all' ? 'No orders match the selected destination hub or search filter' : 'No pending arrived orders available'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {arrivalsSearchQuery || modalSelectedHubId !== 'all'
                        ? 'Try changing the destination hub filter to "All Destination Hubs" or clearing your search.'
                        : 'All active parcels have either been manifested or are not yet physically checked in at the warehouse.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <button
                              type="button"
                              onClick={toggleSelectAllArrivals}
                              className="text-slate-500 hover:text-primary transition-colors cursor-pointer"
                              title="Select/Deselect All Visible"
                            >
                              {filteredArrivalParcels.length > 0 && filteredArrivalParcels.every(p => selectedArrivalIds.includes(String(p.id))) ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="p-3">Tracking #</th>
                          <th className="p-3">Booking Date</th>
                          <th className="p-3">Shipper</th>
                          <th className="p-3">Consignee & Destination</th>
                          <th className="p-3">Pcs • Wt</th>
                          <th className="p-3 text-right">COD (PKR)</th>
                          <th className="p-3 text-center">Current Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {filteredArrivalParcels.map((p) => {
                          const pIdStr = String(p.id);
                          const isChecked = selectedArrivalIds.includes(pIdStr);
                          const destCity = p.destination_city?.CityName || p.destination_city?.name || 'Destination';

                          return (
                            <tr 
                              key={p.id} 
                              onClick={() => toggleSelectArrival(pIdStr)}
                              className={`cursor-pointer transition-colors ${
                                isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => toggleSelectArrival(pIdStr)}
                                  className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className="p-3 font-bold font-mono text-primary">
                                {p.tracking_number}
                              </td>
                              <td className="p-3 text-slate-500 font-normal">
                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td className="p-3 text-slate-900">
                                {p.shipper?.name || p.pickup_location?.shipper?.name || 'Shipper'}
                              </td>
                              <td className="p-3 text-slate-900">
                                <div>{p.recipient_name || 'Customer'}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{destCity}</span>
                                </div>
                              </td>
                              <td className="p-3 text-slate-600 font-normal">
                                {p.pieces || 1} pc • {p.weight || 0.8} kg
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                PKR {Number(p.cod_amount || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> {p.status || 'Arrived'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer: Action Buttons */}
              <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedArrivalIds.length} {selectedArrivalIds.length === 1 ? 'order' : 'orders'} selected
                  </span>
                  {selectedArrivalIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedArrivalIds([])}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Deselect All
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setIsArrivalsModalOpen(false)} 
                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelectedArrivalsToManifest}
                    disabled={selectedArrivalIds.length === 0}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add to Manifest ({selectedArrivalIds.length})
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PAST MANIFEST LIST MODAL */}
        {isListModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
              
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <h2 className="text-base font-bold">Past Dispatched Manifests</h2>
                <button onClick={() => setIsListModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search manifest #, station, or seal..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">Showing {filteredPastManifests.length} manifests</span>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Manifest #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Destination Station</th>
                      <th className="p-3">Seal No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {filteredPastManifests.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-primary">{m.manifestNumber}</td>
                        <td className="p-3 text-slate-600">{m.date}</td>
                        <td className="p-3">{m.manifestType}</td>
                        <td className="p-3 font-bold text-slate-900">{m.station}</td>
                        <td className="p-3 text-slate-600 font-mono">{m.sealNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={() => setIsListModalOpen(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer">
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

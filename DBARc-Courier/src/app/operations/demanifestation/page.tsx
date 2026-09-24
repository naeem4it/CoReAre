'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { 
  List, 
  Save, 
  Printer, 
  RefreshCw, 
  Barcode, 
  Shield, 
  CheckCircle2, 
  PackageCheck, 
  AlertTriangle, 
  Search, 
  X, 
  Check, 
  Eye,
  Truck,
  ArrowRight,
  Send
} from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus 
} from '@/shared/constants/shipment-statuses';

import { useAuth } from '@/components/AuthProvider';

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
  isSentForDelivery: boolean;
}

export default function OperationsDeManifestationPage() {
  const { user } = useAuth();
  const [selectedOfficeId, setSelectedOfficeId] = React.useState<string>('all');
  const [offices, setOffices] = React.useState<any[]>([]);
  const [manifestNumber, setManifestNumber] = React.useState('');
  const [sealNo, setSealNo] = React.useState('');
  const [activeManifestObj, setActiveManifestObj] = React.useState<any>(null);
  
  // Parcels on the manifest
  const [manifestParcels, setManifestParcels] = React.useState<DeManifestItem[]>([]);
  const [isLoadingManifest, setIsLoadingManifest] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Barcode scanning states
  const [scanBarcode, setScanBarcode] = React.useState('');

  // Modal for Browse Dispatched Manifests
  const [isBrowseModalOpen, setIsBrowseModalOpen] = React.useState(false);
  const [pastManifestsList, setPastManifestsList] = React.useState<any[]>([]);
  const [modalSearch, setModalSearch] = React.useState('');
  const [isLoadingPastManifests, setIsLoadingPastManifests] = React.useState(false);

  // Toast
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

  // Load facilities/offices isolated to current tenant
  React.useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

    const filters: any = { type: 'courier' };
    if (tenantId) {
      filters.tenant = tenantId;
    }

    apiClient.get('/offices', {
      params: {
        filters,
        populate: ['city', 'tenant'],
        pagination: { limit: 100 }
      }
    })
      .then(res => {
        const rawOffices = res.data?.data || [];
        const tenantOffices = rawOffices.filter((item: any) => {
          if (!tenantId) return true;
          const attrs = item.attributes || item;
          const offTenantId = attrs.tenant?.data?.id || attrs.tenant?.id || attrs.tenant;
          return offTenantId ? Number(offTenantId) === Number(tenantId) : true;
        });
        setOffices(tenantOffices);
        if (tenantOffices.length > 0) {
          setSelectedOfficeId(String(tenantOffices[0].id));
        }
      })
      .catch(err => console.warn('Could not load offices:', err));
  }, [user]);

  // Helper to extract clean destination location
  const getDestinationLocation = React.useCallback((parcel: any): string => {
    if (!parcel) return 'Destination';

    const destCity = parcel.destination_city?.CityName || parcel.destination_city?.name || parcel.destination_city?.city_name;
    if (destCity && typeof destCity === 'string' && destCity.trim() && destCity.trim().toLowerCase() !== 'destination' && destCity.trim().toLowerCase() !== 'dest') {
      return destCity.trim();
    }

    if (parcel.destination && typeof parcel.destination === 'string' && parcel.destination.trim() && parcel.destination.trim().toLowerCase() !== 'destination' && parcel.destination.trim().toLowerCase() !== 'dest') {
      return parcel.destination.trim();
    }

    const courierCity = parcel.courier_city?.CityName || parcel.courier_city?.name;
    if (courierCity && typeof courierCity === 'string' && courierCity.trim()) {
      return courierCity.trim();
    }

    const addr = parcel.recipient_address || parcel.consigneeAddress || parcel.delivery_address || '';
    if (addr && typeof addr === 'string') {
      const parts = addr.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.toLowerCase() !== 'pakistan') {
          return lastPart;
        } else if (parts.length > 1) {
          return parts[parts.length - 2];
        }
      }
    }

    return 'Destination';
  }, []);

  // Helper to determine if a manifest is 3PL (TPL / 3rd Party Partner)
  const is3PLManifest = React.useCallback((m: any): boolean => {
    if (!m) return false;
    const attrs = m.attributes || m;
    const mType = String(attrs.manifest_type || m.manifest_type || '').trim().toLowerCase();
    const isTPLType = mType === 'tpl' || mType === '3pl partner' || mType.includes('3pl') || mType.includes('third party');
    const thirdParty = attrs.third_party || m.third_party;
    const hasThirdParty = Boolean(thirdParty && String(thirdParty).trim() !== '' && String(thirdParty).trim() !== '-' && String(thirdParty).trim().toLowerCase() !== 'none');
    
    // Check if associated parcels are 3PL
    const rawParcels = attrs.parcels?.data || attrs.parcels || m.parcels || [];
    const all3PLParcels = rawParcels.length > 0 && rawParcels.every((p: any) => {
      const pData = p.attributes || p;
      return pData.is_3pl === true;
    });

    return isTPLType || hasThirdParty || all3PLParcels;
  }, []);

  // Fetch Manifest and its associated In Transit parcels
  const handleLoadManifest = async (mNum?: string) => {
    let cleanNum = (mNum || manifestNumber).trim();
    if (!cleanNum) return;

    // Strip leading hash symbol and extra spaces if user entered e.g. "#6897" or "# 6897"
    cleanNum = cleanNum.replace(/^#\s*/, '').trim();

    setIsLoadingManifest(true);
    try {
      let manifest: any = null;

      // 1. Try direct filter by manifest_number
      try {
        const mRes = await apiClient.get(`/manifests?filters[manifest_number][$eq]=${encodeURIComponent(cleanNum)}&populate=*`);
        if (mRes.data?.data?.length > 0) {
          manifest = mRes.data.data[0];
        }
      } catch (e) {
        console.warn('Filter query by manifest_number notice:', e);
      }

      // 2. Fallback: Search all recent manifests (matching manifest_number, seal_no, documentId, id)
      if (!manifest) {
        try {
          const listRes = await apiClient.get('/manifests?populate=*&sort[0]=createdAt:desc&pagination[limit]=100');
          const allManifests: any[] = listRes.data?.data || [];
          manifest = allManifests.find((m: any) => {
            const mNo = String(m.manifest_number ?? m.id ?? '').trim();
            const sNo = String(m.seal_no || '').trim().toLowerCase();
            const docId = String(m.documentId || '').trim();
            const id = String(m.id || '').trim();
            const searchLower = cleanNum.toLowerCase();

            return (
              mNo === cleanNum ||
              sNo === searchLower ||
              docId === cleanNum ||
              id === cleanNum
            );
          });
        } catch (e) {
          console.warn('Fallback search notice:', e);
        }
      }

      if (!manifest) {
        triggerToast(`Manifest #${cleanNum} not found in database.`, 'error');
        setManifestParcels([]);
        setActiveManifestObj(null);
        return;
      }

      // 3PL manifests cannot be demanifested in courier hub because 3rd party handles them after dispatch
      if (is3PLManifest(manifest)) {
        triggerToast(`Manifest #${manifest.manifest_number || cleanNum} is a 3PL partner handover manifest (${manifest.third_party || '3PL Partner'}). 3PL shipments are handled directly by the 3rd party partner and cannot be de-manifested in the courier hub.`, 'error');
        setManifestParcels([]);
        setActiveManifestObj(null);
        setManifestNumber('');
        setSealNo('');
        return;
      }

      setActiveManifestObj(manifest);
      setManifestNumber(String(manifest.manifest_number || manifest.id || cleanNum));
      setSealNo(manifest.seal_no || '');

      // Load associated parcels
      let parcelsList: any[] = manifest.parcels || [];

      // If parcels array on manifest is empty, fallback to querying parcels table by manifest id or manifest_number
      if (parcelsList.length === 0) {
        try {
          const pRes = await apiClient.get(`/parcels?filters[manifest][id][$eq]=${manifest.id}&populate=*`);
          if (pRes.data?.data?.length > 0) {
            parcelsList = pRes.data.data;
          } else if (manifest.manifest_number) {
            const pRes2 = await apiClient.get(`/parcels?filters[manifest][manifest_number][$eq]=${manifest.manifest_number}&populate=*`);
            if (pRes2.data?.data?.length > 0) {
              parcelsList = pRes2.data.data;
            }
          }
        } catch (e) {
          console.warn('Fallback querying parcels by manifest id notice:', e);
        }
      }

      // Filter out any 3PL parcels - courier de-manifestation strictly handles 2PL in-house shipments
      parcelsList = parcelsList.filter((p: any) => {
        const pData = p.attributes || p;
        return pData.is_3pl !== true;
      });

      if (parcelsList.length === 0) {
        triggerToast(`Manifest #${manifest.manifest_number || cleanNum} has no 2PL shipments to de-manifest.`, 'error');
        setManifestParcels([]);
        return;
      }

      const mapped: DeManifestItem[] = parcelsList.map((p: any) => {
        const normStatus = normalizeShipmentStatus(p.status);
        const isArrivedDest = normStatus === SHIPMENT_STATUSES.ARRIVED_DEST;
        return {
          id: String(p.id),
          documentId: p.documentId,
          shipmentNumber: p.tracking_number,
          shipper: p.shipper?.name || 'Shipper',
          consignee: p.recipient_name || 'Customer',
          destination: getDestinationLocation(p),
          pieces: p.pieces || 1,
          weight: Number(p.weight) || 1.0,
          codAmount: Number(p.cod_amount) || 0,
          status: isArrivedDest ? SHIPMENT_STATUSES.ARRIVED_DEST : normStatus,
          isSentForDelivery: isArrivedDest,
        };
      });

      setManifestParcels(mapped);
      triggerToast(`Manifest #${manifest.manifest_number || cleanNum} loaded (${mapped.length} parcels). Ready to send for delivery.`, 'success');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      console.error('Error fetching manifest:', err);
      triggerToast(`Error loading manifest #${cleanNum}: ${err.message}`, 'error');
    } finally {
      setIsLoadingManifest(false);
    }
  };

  // Scan & Send for Delivery (Status transitions to "Arrived at warehouse (Dest)")
  const handleScanShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanBarcode.trim().toUpperCase();
    if (!code) return;

    try {
      // 1. Check if parcel already in current list in memory
      const existingIndex = manifestParcels.findIndex(p => p.shipmentNumber === code);
      if (existingIndex !== -1) {
        const item = manifestParcels[existingIndex];
        const targetId = item.documentId || item.id;
        
        // Update status to "Arrived at warehouse (Dest)" and register linehaul arrival timestamp
        await apiClient.put(`/parcels/${targetId}`, {
          data: {
            status: SHIPMENT_STATUSES.ARRIVED_DEST,
            arrival_date: new Date().toISOString()
          }
        });

        setManifestParcels(prev => prev.map((p, idx) => 
          idx === existingIndex 
            ? { ...p, isSentForDelivery: true, status: SHIPMENT_STATUSES.ARRIVED_DEST } 
            : p
        ));

        triggerToast(`Shipment #${code} sent for delivery! Status updated to "${SHIPMENT_STATUSES.ARRIVED_DEST}".`, 'success');
        setScanBarcode('');
        barcodeInputRef.current?.focus();
        return;
      }

      // 2. Direct lookup from database
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(code)}&populate=*`);
      const parcel = res.data?.data?.[0];

      if (!parcel) {
        triggerToast(`Shipment #${code} not found in database!`, 'error');
        setScanBarcode('');
        return;
      }

      const targetId = parcel.documentId || parcel.id;
      const pData = parcel.attributes || parcel;

      // 3PL shipments are handled externally by 3rd party partners
      if (pData.is_3pl === true) {
        triggerToast(`Shipment #${code} is a 3PL partner shipment. 3PL shipments are handled directly by the 3rd party partner and cannot be de-manifested in the courier hub.`, 'error');
        setScanBarcode('');
        return;
      }

      // Update status to "Arrived at warehouse (Dest)"
      await apiClient.put(`/parcels/${targetId}`, {
        data: {
          status: SHIPMENT_STATUSES.ARRIVED_DEST,
          arrival_date: new Date().toISOString()
        }
      });

      const newItem: DeManifestItem = {
        id: String(parcel.id),
        documentId: parcel.documentId,
        shipmentNumber: parcel.tracking_number,
        shipper: parcel.shipper?.name || 'Shipper',
        consignee: parcel.recipient_name || 'Customer',
        destination: getDestinationLocation(parcel),
        pieces: parcel.pieces || 1,
        weight: Number(parcel.weight) || 1.0,
        codAmount: Number(parcel.cod_amount) || 0,
        status: SHIPMENT_STATUSES.ARRIVED_DEST,
        isSentForDelivery: true,
      };

      setManifestParcels(prev => [newItem, ...prev]);
      triggerToast(`Shipment #${code} sent for delivery! Ready in Delivery Sheet.`, 'success');
      setScanBarcode('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      console.error('Scan demanifest error:', err);
      triggerToast(`Error processing #${code}: ${err.message}`, 'error');
      setScanBarcode('');
    }
  };

  // Single Item: Send for Delivery
  const handleSendItemForDelivery = async (code: string) => {
    const existingIndex = manifestParcels.findIndex(p => p.shipmentNumber === code);
    if (existingIndex === -1) return;

    const item = manifestParcels[existingIndex];
    const targetId = item.documentId || item.id;

    try {
      await apiClient.put(`/parcels/${targetId}`, {
        data: {
          status: SHIPMENT_STATUSES.ARRIVED_DEST,
          arrival_date: new Date().toISOString()
        }
      });

      setManifestParcels(prev => prev.map((p, idx) => 
        idx === existingIndex 
          ? { ...p, isSentForDelivery: true, status: SHIPMENT_STATUSES.ARRIVED_DEST } 
          : p
      ));

      triggerToast(`Shipment #${code} sent for delivery! Status: "${SHIPMENT_STATUSES.ARRIVED_DEST}".`, 'success');
    } catch (err: any) {
      triggerToast(`Failed to send #${code} for delivery: ${err.message}`, 'error');
    }
  };

  // Send All shipments on active manifest for Delivery
  const handleSendAllForDelivery = async () => {
    const unqueued = manifestParcels.filter(p => !p.isSentForDelivery);
    if (unqueued.length === 0) {
      triggerToast('All shipments on this manifest are already sent for delivery.', 'success');
      return;
    }

    try {
      for (const item of unqueued) {
        const targetId = item.documentId || item.id;
        await apiClient.put(`/parcels/${targetId}`, {
          data: {
            status: SHIPMENT_STATUSES.ARRIVED_DEST,
            arrival_date: new Date().toISOString()
          }
        });
      }

      setManifestParcels(prev => prev.map(p => ({
        ...p,
        isSentForDelivery: true,
        status: SHIPMENT_STATUSES.ARRIVED_DEST
      })));

      triggerToast(`All ${unqueued.length} shipments queued for delivery! (Status: "${SHIPMENT_STATUSES.ARRIVED_DEST}")`, 'success');
    } catch (err: any) {
      triggerToast(`Error queuing shipments: ${err.message}`, 'error');
    }
  };

  // Browse Past Dispatched Manifests Modal (strictly 2PL in-house station manifests)
  const handleOpenBrowseModal = async () => {
    setIsBrowseModalOpen(true);
    setIsLoadingPastManifests(true);
    try {
      const res = await apiClient.get('/manifests?sort[0]=createdAt:desc&pagination[limit]=100&populate=*');
      const allManifests = res.data?.data || [];
      const only2PLManifests = allManifests.filter((m: any) => !is3PLManifest(m));
      setPastManifestsList(only2PLManifests);
    } catch (e) {
      console.warn('Could not load manifests list:', e);
    } finally {
      setIsLoadingPastManifests(false);
    }
  };

  const handleSelectManifestFromModal = (m: any) => {
    setIsBrowseModalOpen(false);
    const mNum = String(m.manifest_number || m.id);
    setManifestNumber(mNum);
    handleLoadManifest(mNum);
  };

  // Finalize De-Manifestation and forward to Delivery Sheet queue
  const handleSave = async () => {
    const readyItems = manifestParcels.filter(p => p.isSentForDelivery);
    if (readyItems.length === 0) {
      triggerToast('No shipments have been sent for delivery yet. Click "Send for Delivery" or scan parcels.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update all ready parcels to "Arrived at warehouse (Dest)"
      for (const item of readyItems) {
        try {
          let targetId = item.documentId;
          if (!targetId || /^\d+$/.test(String(targetId))) {
            const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
            targetId = parcelRes.data?.data?.[0]?.documentId;
          }
          if (targetId) {
            await apiClient.put(`/parcels/${targetId}`, {
              data: { 
                status: SHIPMENT_STATUSES.ARRIVED_DEST,
                arrival_date: new Date().toISOString()
              }
            });
          }
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

      triggerToast(`De-manifestation for Manifest #${manifestNumber} completed! ${readyItems.length} parcels marked "${SHIPMENT_STATUSES.ARRIVED_DEST}" and ready in Delivery Sheet.`, 'success');
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

  const sentCount = manifestParcels.filter(p => p.isSentForDelivery).length;
  const pendingCount = manifestParcels.length - sentCount;

  const filteredPastManifests = React.useMemo(() => {
    const baseList = pastManifestsList.filter((m: any) => !is3PLManifest(m));
    if (!modalSearch.trim()) return baseList;
    const q = modalSearch.toLowerCase();
    return baseList.filter((m: any) => {
      const num = String(m.manifest_number || m.id || '').toLowerCase();
      const st = String(m.station || '').toLowerCase();
      const sl = String(m.seal_no || '').toLowerCase();
      return num.includes(q) || st.includes(q) || sl.includes(q);
    });
  }, [pastManifestsList, modalSearch, is3PLManifest]);

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
            <h1 className="text-xl font-bold tracking-tight">Operation / DeManifestation & Send for Delivery</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenBrowseModal}
              className="bg-primary hover:bg-primary-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <List className="w-4 h-4" /> Browse Dispatched Manifests
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || sentCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" /> {isSubmitting ? 'Processing...' : `Send to Delivery Sheet (${sentCount} Ready)`}
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
                  placeholder="Enter Manifest # (e.g. 6897)..."
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
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Queue Intake Status</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-between">
                <span>Sent for Delivery: <strong className="text-emerald-600">{sentCount}</strong></span>
                <span>Pending Intake: <strong className="text-amber-600">{pendingCount}</strong></span>
                <span>Total: <strong>{manifestParcels.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Barcode Scanner */}
          <form onSubmit={handleScanShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-primary" /> Scan Tracking Barcode to Send for Delivery
                </span>
                <span className="text-[10px] text-slate-500">
                  Target Status: <strong className="text-emerald-700">{SHIPMENT_STATUSES.ARRIVED_DEST}</strong> • Assigned in Delivery Sheet ➔ <strong>{SHIPMENT_STATUSES.OUT_FOR_DELIVERY}</strong>
                </span>
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan CN / Tracking barcode to queue for delivery sheet..."
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!scanBarcode.trim()}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer h-10 mt-auto flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Truck className="w-4 h-4" /> Send for Delivery
            </button>
          </form>

        </div>

        {/* Manifest Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" /> Incoming Manifest Shipments ({manifestParcels.length})
            </span>
            <div className="flex items-center gap-3">
              {manifestParcels.length > 0 && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleSendAllForDelivery}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Send All for Delivery ({pendingCount})
                </button>
              )}
              <span className="text-xs text-amber-400 font-bold hidden sm:inline">
                Target Status: {SHIPMENT_STATUSES.ARRIVED_DEST} (Becomes Out for Delivery on Rider Runsheet)
              </span>
            </div>
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
                  <th className="px-6 py-3.5 text-center">Delivery Queue Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {manifestParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No incoming manifest loaded. Enter manifest number (e.g. 6897) above or click &quot;Browse Dispatched Manifests&quot;.
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
                        {s.isSentForDelivery ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sent for Delivery (Arrived at Dest)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendItemForDelivery(s.shipmentNumber)}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" /> Send for Delivery
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BROWSE PAST DISPATCHED MANIFESTS MODAL */}
        {isBrowseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
              
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold">Dispatched Manifests (2PL Courier In-House Only)</h2>
                </div>
                <button onClick={() => setIsBrowseModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
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
                <span className="text-xs font-bold text-slate-500">Showing {filteredPastManifests.length} manifests (3PL excluded)</span>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {isLoadingPastManifests ? (
                  <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading in-house manifests...</div>
                ) : filteredPastManifests.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-semibold text-xs">No dispatched 2PL in-house manifests found.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Manifest #</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Destination Station</th>
                        <th className="p-3">Seal No</th>
                        <th className="p-3 text-center">Parcels</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {filteredPastManifests.map((m: any) => {
                        const mNumber = m.manifest_number || m.id;
                        const dateStr = m.date ? new Date(m.date).toLocaleString() : (m.createdAt ? new Date(m.createdAt).toLocaleString() : '-');
                        const pCount = m.parcels?.length || m.total_parcels || 0;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-primary font-mono text-sm">{mNumber}</td>
                            <td className="p-3">
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                2PL Station
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">{dateStr}</td>
                            <td className="p-3 font-bold text-slate-900">{m.station || '-'}</td>
                            <td className="p-3 text-slate-600 font-mono">{m.seal_no || '-'}</td>
                            <td className="p-3 text-center font-bold text-slate-700">{pCount}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleSelectManifestFromModal(m)}
                                className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Load Manifest
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={() => setIsBrowseModalOpen(false)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
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

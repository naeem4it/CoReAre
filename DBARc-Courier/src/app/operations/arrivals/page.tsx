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
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  Boxes
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
  is3PL?: boolean;
  tplServiceName?: string | undefined;
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
  const { user, activeOfficeId } = useAuth();
  const [arrivalId, setArrivalId] = React.useState<string>(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
  
  // Arrival Type / Stage: Origin Warehouse or Destination Warehouse
  const [arrivalStage, setArrivalStage] = React.useState<'Origin' | 'Dest'>('Origin');
  
  // Selected Warehouse/Office
  const [selectedOfficeId, setSelectedOfficeId] = React.useState<string>('all');
  const [offices, setOffices] = React.useState<any[]>([]);
  const [riders, setRiders] = React.useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('all');
  const [tplPartners, setTplPartners] = React.useState<any[]>([]);

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

  // List History Modal (Last 3 Days Grouped by Date)
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [arrivalHistory, setArrivalHistory] = React.useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [historySearchQuery, setHistorySearchQuery] = React.useState('');
  const [expandedBatchIds, setExpandedBatchIds] = React.useState<Record<string, boolean>>({});
  const [copiedBatchId, setCopiedBatchId] = React.useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = React.useState<string | null>(null);

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

  // Helper to determine the Hub location where the system is currently operated
  const getCurrentHubLocation = React.useCallback((parcel?: any): string => {
    // 1. If user specifically selected a Warehouse/Office in the dropdown on this page
    if (selectedOfficeId && selectedOfficeId !== 'all') {
      const selected = offices.find(o => String(o.id) === String(selectedOfficeId));
      if (selected) {
        const cityName = selected.city?.CityName || selected.city?.name;
        if (cityName) return cityName;
        if (selected.name) {
          const cleaned = selected.name.replace(/(Head Office|Office|Hub|Warehouse)/gi, '').trim();
          if (cleaned) return cleaned;
          return selected.name;
        }
      }
    }

    // 2. Active office from Auth Context or activeOfficeId in localStorage
    const currentActiveOfficeId = activeOfficeId || (typeof window !== 'undefined' ? Number(localStorage.getItem('activeOfficeId')) : null);
    if (currentActiveOfficeId) {
      const activeOffice = offices.find(o => Number(o.id) === Number(currentActiveOfficeId)) ||
        (Array.isArray(user?.offices) ? user.offices.find((o: any) => Number(o.id) === Number(currentActiveOfficeId)) : null);
      if (activeOffice) {
        const cityName = activeOffice.city?.CityName || activeOffice.city?.name;
        if (cityName) return cityName;
        if (activeOffice.name) {
          const cleaned = activeOffice.name.replace(/(Head Office|Office|Hub|Warehouse)/gi, '').trim();
          if (cleaned) return cleaned;
          return activeOffice.name;
        }
      }
    }

    // 3. First user assigned office
    if (Array.isArray(user?.offices) && user.offices.length > 0) {
      const uOffice = user.offices[0];
      const cityName = uOffice.city?.CityName || uOffice.city?.name;
      if (cityName) return cityName;
      if (uOffice.name) {
        const cleaned = uOffice.name.replace(/(Head Office|Office|Hub|Warehouse)/gi, '').trim();
        if (cleaned) return cleaned;
        return uOffice.name;
      }
    }

    // 4. Parcel's own origin office or source city if present
    if (parcel) {
      const pSource = parcel.source_city?.CityName || parcel.source_city?.name;
      if (pSource && pSource !== 'Origin') return pSource;
      const pOriginOff = parcel.origin_office?.city?.CityName || parcel.origin_office?.city?.name;
      if (pOriginOff) return pOriginOff;
      if (parcel.origin_office?.name) {
        const cleaned = parcel.origin_office.name.replace(/(Head Office|Office|Hub|Warehouse)/gi, '').trim();
        if (cleaned) return cleaned;
        return parcel.origin_office.name;
      }
    }

    // 5. First office loaded in the system for this courier tenant
    if (offices && offices.length > 0) {
      const primaryOffice = offices[0];
      const cityName = primaryOffice.city?.CityName || primaryOffice.city?.name;
      if (cityName) return cityName;
      if (primaryOffice.name) {
        const cleaned = primaryOffice.name.replace(/(Head Office|Office|Hub|Warehouse)/gi, '').trim();
        if (cleaned) return cleaned;
        return primaryOffice.name;
      }
    }

    return 'Origin Hub';
  }, [selectedOfficeId, offices, activeOfficeId, user]);

  // Helper to resolve destination city/location from parcel or order data
  const getDestinationLocation = React.useCallback((parcel: any): string => {
    if (!parcel) return 'Dest';

    // 1. Relational destination city
    const destCity = parcel.destination_city?.CityName || parcel.destination_city?.name || parcel.destination_city?.city_name;
    if (destCity && typeof destCity === 'string' && destCity.trim() && destCity.trim().toLowerCase() !== 'dest') {
      return destCity.trim();
    }

    // 2. Direct destination field
    if (parcel.destination && typeof parcel.destination === 'string' && parcel.destination.trim() && parcel.destination.trim().toLowerCase() !== 'dest') {
      return parcel.destination.trim();
    }

    // 3. Courier city
    const courierCity = parcel.courier_city?.CityName || parcel.courier_city?.name;
    if (courierCity && typeof courierCity === 'string' && courierCity.trim()) {
      return courierCity.trim();
    }

    // 4. Extract from recipient_address (e.g., "House 123 Street 4 Block B20, Sailkot" => "Sailkot")
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

    return 'Dest';
  }, []);

  // Helper to resolve whether a shipment is 2PL or 3PL dynamically based on database records
  const getShipmentType = React.useCallback((p: any): '2PL' | '3PL' => {
    if (!p) return '2PL';

    // 1. Check parcel's explicit data attributes in database
    if (
      p.is_3pl === true || 
      p.is_3pl === 'true' || 
      p.is_3pl === 1 || 
      p.fulfillment_type === '3PL' ||
      p.service_provider === '3PL' ||
      (p.courier && p.courier?.name && p.courier.name !== 'IN-HOUSE' && p.courier.name !== '2PL')
    ) {
      return '3PL';
    }

    if (
      p.is_3pl === false || 
      p.is_3pl === 'false' || 
      p.is_3pl === 0 || 
      p.fulfillment_type === '2PL' ||
      p.service_provider === 'IN-HOUSE' ||
      p.service_provider === '2PL'
    ) {
      return '2PL';
    }

    // 2. Resolve destination location from parcel data
    const dest = getDestinationLocation(p);
    if (!dest || dest === 'Dest') {
      return '2PL';
    }

    const normDest = dest.trim().toLowerCase();

    // 3. Dynamic check against courier's active office/hub coverage in the database
    if (offices && offices.length > 0) {
      const hasCourierOffice = offices.some((o: any) => {
        // City relation or city string from database
        const oCity = (o.city?.CityName || o.city?.name || (typeof o.city === 'string' ? o.city : '') || '').trim().toLowerCase();
        if (oCity && (normDest === oCity || normDest.includes(oCity) || oCity.includes(normDest))) {
          return true;
        }

        // Office branch name (e.g. "Lahore Hub", "Karachi Central Hub", "Lahore Raiwind Office")
        const oName = (o.name || '').replace(/(Head Office|Office|Hub|Warehouse|Central)/gi, '').trim().toLowerCase();
        if (oName && (normDest === oName || normDest.includes(oName) || oName.includes(normDest))) {
          return true;
        }

        return false;
      });

      return hasCourierOffice ? '2PL' : '3PL';
    }

    return '2PL';
  }, [getDestinationLocation, offices]);

  // Helper to resolve 3PL service/partner name (e.g. "TRAX Logistics", "Leopards Courier", "TCS")
  const get3PLServiceName = React.useCallback((p: any): string => {
    if (!p) return 'Partner';

    // 1. Direct courier relation or name
    const courierObj = p.courier?.data?.attributes || p.courier?.data || p.courier;
    const cName = courierObj?.name || (typeof p.courier === 'string' ? p.courier : '');
    if (cName && cName !== 'IN-HOUSE' && cName !== '2PL') {
      return cName.replace(/\(Sandbox\)/gi, '').trim();
    }

    // 2. Explicit provider field
    if (p.service_provider && p.service_provider !== '3PL' && p.service_provider !== '2PL') {
      return p.service_provider.replace(/\(Sandbox\)/gi, '').trim();
    }
    if (p.tpl_provider) {
      return p.tpl_provider.replace(/\(Sandbox\)/gi, '').trim();
    }
    const partnerObj = p.tpl_partner?.data?.attributes || p.tpl_partner?.data || p.tpl_partner;
    if (partnerObj?.name) {
      return partnerObj.name.replace(/\(Sandbox\)/gi, '').trim();
    }

    // 3. Extract from comments if e.g. "Dispatched to 3PL: TRAX Logistics (Sandbox)..."
    if (p.comments && typeof p.comments === 'string' && p.comments.includes('3PL:')) {
      const match = p.comments.match(/3PL:\s*([^(]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // 4. Preferred or first TPL partner configured in database
    if (tplPartners && tplPartners.length > 0) {
      const preferred = tplPartners.find((tp: any) => tp.is_preferred) || tplPartners[0];
      const partnerName = preferred?.name || preferred?.attributes?.name;
      if (partnerName) {
        return partnerName.replace(/\(Sandbox\)/gi, '').trim();
      }
    }

    return 'TRAX Logistics';
  }, [tplPartners]);

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

        const [ridersRes, officesRes, tplRes] = await Promise.allSettled([
          RiderService.getAll(`?filters[status][$ne]=inactive${tenantId ? `&filters[tenant][$eq]=${tenantId}` : ''}&pagination[pageSize]=100`),
          apiClient.get('/offices', {
            params: {
              filters,
              populate: ['city', 'tenant'],
              pagination: { limit: 100 }
            }
          }),
          apiClient.get('/tpl-partners')
        ]);
        
        if (ridersRes.status === 'fulfilled') {
          setRiders(ridersRes.value.data || []);
        }
        if (tplRes.status === 'fulfilled') {
          setTplPartners(tplRes.value.data?.data || []);
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
          const storedOfficeId = typeof window !== 'undefined' ? localStorage.getItem('activeOfficeId') : null;
          const targetOfficeId = activeOfficeId ? String(activeOfficeId) : (storedOfficeId ? String(storedOfficeId) : null);
          if (targetOfficeId && tenantOffices.some((o: any) => String(o.id) === targetOfficeId)) {
            setSelectedOfficeId(targetOfficeId);
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
          const dest = getDestinationLocation(p);
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
      const rawPcs = fromExpected.pieces ?? fromExpected.attributes?.pieces;
      const rawWt = fromExpected.weight ?? fromExpected.attributes?.weight;
      const pcs = (rawPcs !== undefined && rawPcs !== null && Number(rawPcs) > 0) ? Number(rawPcs) : 1;
      const wt = (rawWt !== undefined && rawWt !== null && Number(rawWt) > 0) ? Number(rawWt) : 0.5;

      setScanPieces(pcs);
      setScanWeight(wt);
      playScannerBeep('success');
      triggerToast(`Order #${tracking} loaded: ${pcs} pcs • ${wt} kg`, 'success');
      return fromExpected;
    }

    // 2. Otherwise fetch from backend database
    try {
      const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(tracking)}&populate=*`);
      const foundParcel = parcelRes.data?.data?.[0];
      if (foundParcel) {
        const rawPcs = foundParcel.pieces ?? foundParcel.attributes?.pieces;
        const rawWt = foundParcel.weight ?? foundParcel.attributes?.weight;
        const pcs = (rawPcs !== undefined && rawPcs !== null && Number(rawPcs) > 0) ? Number(rawPcs) : 1;
        const wt = (rawWt !== undefined && rawWt !== null && Number(rawWt) > 0) ? Number(rawWt) : 0.5;

        setScanPieces(pcs);
        setScanWeight(wt);
        playScannerBeep('success');
        triggerToast(`Order #${tracking} loaded: ${pcs} pcs • ${wt} kg`, 'success');
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

      // Extract accurate pieces and weight directly from the order database record
      const rawPcs = foundParcel.pieces ?? foundParcel.attributes?.pieces;
      const rawWt = foundParcel.weight ?? foundParcel.attributes?.weight;
      const orderPieces = (rawPcs !== undefined && rawPcs !== null && Number(rawPcs) > 0)
        ? Number(rawPcs)
        : (Number(scanPieces) || 1);
      const orderWeight = (rawWt !== undefined && rawWt !== null && Number(rawWt) > 0)
        ? Number(rawWt)
        : (Number(scanWeight) || 0.5);

      setScanPieces(orderPieces);
      setScanWeight(orderWeight);

      playScannerBeep('success');
      triggerScanFlash('success');
      triggerToast(`Parcel #${tracking} (${orderPieces} pcs • ${orderWeight} kg) marked ${targetStatus}!`, 'success');

      // Resolve delivering rider:
      // If a rider is selected from the dropdown above, assign it to the grid entry!
      // Otherwise fall back to parcel's rider or 'Unassigned'
      const selectedRiderObj = riders.find(r => String(r.id) === String(selectedRiderId));
      const riderDisplayName = selectedRiderId !== 'all' && selectedRiderObj
        ? (selectedRiderObj.name || selectedRiderObj.username || `Rider #${selectedRiderObj.id}`)
        : (foundParcel.rider?.name || foundParcel.rider?.username || '-');

      // Add to physically received list with the order's exact pieces & weight
      const hubLocation = getCurrentHubLocation(foundParcel);
      const destLocation = getDestinationLocation(foundParcel);
      const is3PL = getShipmentType(foundParcel) === '3PL';
      const tplServiceName = is3PL ? get3PLServiceName(foundParcel) : undefined;

      const newItem: ArrivalItem = {
        id: foundParcel.id.toString(),
        documentId: targetIdentifier,
        shipmentNumber: tracking,
        recipientName: foundParcel.recipient_name || 'Customer',
        consigneeName: foundParcel.recipient_name || 'Customer',
        originCity: hubLocation,
        destinationCity: destLocation,
        shipperName: foundParcel.shipper?.name || 'Shipper',
        riderName: riderDisplayName,
        pieces: orderPieces,
        weight: orderWeight,
        codAmount: foundParcel.cod_amount || 0,
        status: targetStatus,
        is3PL,
        tplServiceName,
        arrivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setReceivedShipments(prev => [newItem, ...prev]);

      // Remove from Expected queue immediately (Active Queue Isolation)
      setExpectedShipments(prev => prev.filter(p => p.tracking_number.toUpperCase() !== tracking));

      if (!targetTracking) {
        setScanBarcode('');
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
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

      // Extract valid numerical parcel IDs
      const parcelIds = receivedShipments
        .map(s => Number(s.id))
        .filter(n => !isNaN(n) && n > 0);

      const batchPayload: any = {
        batch_id: arrivalId,
        arrival_date: new Date().toISOString(),
        total_pieces: totalPieces,
        total_weight: totalWeight,
        total_shipments: receivedShipments.length,
        scanned_items: receivedShipments,
      };

      if (parcelIds.length > 0) {
        batchPayload.parcels = parcelIds;
      }
      if (selectedRiderId && selectedRiderId !== 'all' && !isNaN(Number(selectedRiderId)) && Number(selectedRiderId) > 0) {
        batchPayload.rider = Number(selectedRiderId);
      }
      if (selectedOfficeId && selectedOfficeId !== 'all' && !isNaN(Number(selectedOfficeId)) && Number(selectedOfficeId) > 0) {
        batchPayload.office = Number(selectedOfficeId);
      }
      if (tenantId && !isNaN(Number(tenantId)) && Number(tenantId) > 0) {
        batchPayload.tenant = Number(tenantId);
      }

      // Try saving with relations; if Strapi relation check returns 400, retry with clean payload
      try {
        await ArrivalService.createBatch(batchPayload);
      } catch (postErr: any) {
        console.warn('Initial createBatch failed, retrying with core arrival fields:', postErr?.response?.data || postErr);
        const fallbackPayload: any = {
          batch_id: arrivalId,
          arrival_date: new Date().toISOString(),
          total_pieces: totalPieces,
          total_weight: totalWeight,
          total_shipments: receivedShipments.length,
          scanned_items: receivedShipments,
        };
        if (tenantId && !isNaN(Number(tenantId)) && Number(tenantId) > 0) {
          fallbackPayload.tenant = Number(tenantId);
        }
        await ArrivalService.createBatch(fallbackPayload);
      }

      // Explicitly update all finalized parcels to "Arrived at warehouse (Origin)"
      for (const item of receivedShipments) {
        try {
          let targetId = item.documentId || item.id;
          if (!targetId || /^\d+$/.test(String(targetId))) {
            const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
            targetId = parcelRes.data?.data?.[0]?.documentId || targetId;
          }
          if (targetId) {
            await apiClient.put(`/parcels/${targetId}`, {
              data: {
                status: SHIPMENT_STATUSES.ARRIVED_ORIGIN,
                arrival_date: new Date().toISOString()
              }
            });
          }
        } catch (pErr) {
          console.warn(`Notice updating parcel status for ${item.shipmentNumber}:`, pErr);
        }
      }

      triggerToast(`Arrival batch ${arrivalId} finalized! ${receivedShipments.length} parcels marked "${SHIPMENT_STATUSES.ARRIVED_ORIGIN}" and ready for Manifestation.`, 'success');
      setArrivalId(`ARR-${Math.floor(100000 + Math.random() * 900000)}`);
      setReceivedShipments([]);
      setScanBarcode('');
      fetchExpectedQueue();
    } catch (err: any) {
      console.error('Failed to save arrival batch:', err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Failed to save arrival batch. Please check connection.';
      triggerToast(`Error finalizing batch: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'batch' | 'tracking') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (type === 'batch') {
      setCopiedBatchId(text);
      setTimeout(() => setCopiedBatchId(null), 2000);
    } else {
      setCopiedTracking(text);
      setTimeout(() => setCopiedTracking(null), 2000);
    }
    triggerToast(`Copied ${text} to clipboard!`, 'success');
  };

  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatchIds(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  };

  const getDateGroupLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const dateFormatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (itemDate.getTime() === today.getTime()) {
      return { title: 'Today', subtitle: dateFormatted, tag: 'Today', isToday: true };
    } else if (itemDate.getTime() === yesterday.getTime()) {
      return { title: 'Yesterday', subtitle: dateFormatted, tag: 'Yesterday', isYesterday: true };
    } else {
      return { title: d.toLocaleDateString('en-US', { weekday: 'long' }), subtitle: dateFormatted, tag: dateFormatted, isPast: true };
    }
  };

  const handleOpenListModal = async () => {
    setIsListModalOpen(true);
    setIsLoadingHistory(true);
    setHistorySearchQuery('');
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

      // Calculate 3 full calendar days ago from start of day
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);

      const res = await ArrivalService.getAll('?populate=*&sort[0]=arrival_date:desc&sort[1]=createdAt:desc&pagination[pageSize]=100');
      let rawData = res.data || [];

      // Unpack Strapi attributes if nested
      rawData = rawData.map((item: any) => {
        const attrs = item.attributes || item;
        const scanned = attrs.scanned_items || [];
        const parcels = attrs.parcels?.data || attrs.parcels || [];
        const totalShipments = attrs.total_shipments || (Array.isArray(scanned) && scanned.length) || parcels.length || 0;
        
        return {
          id: item.id,
          batch_id: attrs.batch_id || `ARR-${item.id}`,
          arrival_date: attrs.arrival_date || attrs.createdAt,
          createdAt: attrs.createdAt || attrs.arrival_date,
          total_pieces: attrs.total_pieces || (Array.isArray(scanned) && scanned.length > 0 ? scanned.reduce((a: number, c: any) => a + (Number(c.pieces) || 1), 0) : totalShipments),
          total_weight: attrs.total_weight || (Array.isArray(scanned) && scanned.length > 0 ? Math.round(scanned.reduce((a: number, c: any) => a + (Number(c.weight) || 0.8), 0) * 10) / 10 : Math.round(totalShipments * 0.8 * 10) / 10),
          total_shipments: totalShipments,
          scanned_items: Array.isArray(scanned) && scanned.length > 0 ? scanned : parcels.map((p: any) => {
            const pAttrs = p.attributes || p;
            return {
              id: p.id,
              shipmentNumber: pAttrs.tracking_number || String(p.id),
              consigneeName: pAttrs.recipient_name || 'Customer',
              originCity: pAttrs.source_city?.name || pAttrs.source_city?.CityName || 'Origin',
              destinationCity: pAttrs.destination_city?.name || pAttrs.destination_city?.CityName || 'Destination',
              pieces: pAttrs.pieces || 1,
              weight: pAttrs.weight || 0.8,
              codAmount: pAttrs.cod_amount || 0,
              status: pAttrs.status || SHIPMENT_STATUSES.ARRIVED_ORIGIN,
              arrivedAt: attrs.arrival_date ? new Date(attrs.arrival_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
            };
          }),
          rider: attrs.rider?.data?.attributes || attrs.rider?.data || attrs.rider,
          office: attrs.office?.data?.attributes || attrs.office?.data || attrs.office,
          tenant: attrs.tenant?.data?.id || attrs.tenant?.id || attrs.tenant,
        };
      });

      // Filter by tenant if present
      if (tenantId) {
        rawData = rawData.filter((b: any) => {
          if (!b.tenant) return true;
          return Number(b.tenant) === Number(tenantId);
        });
      }

      // Filter to last 3 days
      rawData = rawData.filter((b: any) => {
        const d = new Date(b.arrival_date || b.createdAt);
        return !isNaN(d.getTime()) && d >= threeDaysAgo;
      });

      setArrivalHistory(rawData);
      if (rawData.length > 0 && rawData.length <= 2) {
        setExpandedBatchIds({ [rawData[0].batch_id || rawData[0].id]: true });
      }
    } catch (err) {
      console.warn('Failed to load arrivals history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const groupedArrivalHistory = React.useMemo(() => {
    let list = arrivalHistory;
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.trim().toLowerCase();
      list = list.filter((b: any) => {
        const batchMatch = (b.batch_id || '').toLowerCase().includes(q);
        const riderMatch = (b.rider?.name || b.rider?.username || '').toLowerCase().includes(q);
        const officeMatch = (b.office?.name || '').toLowerCase().includes(q);
        const parcelMatch = Array.isArray(b.scanned_items) && b.scanned_items.some((item: any) => {
          const t = item.shipmentNumber || item.tracking_number || item.attributes?.tracking_number || '';
          const c = item.consigneeName || item.recipientName || item.recipient_name || '';
          return t.toLowerCase().includes(q) || c.toLowerCase().includes(q);
        });
        return batchMatch || riderMatch || officeMatch || parcelMatch;
      });
    }

    const groups: { [key: string]: { dateKey: string; label: any; items: any[]; totalShipments: number; totalWeight: number; totalPieces: number } } = {};

    list.forEach((item: any) => {
      const d = new Date(item.arrival_date || item.createdAt);
      const dateKey = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'Unknown Date';
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          label: getDateGroupLabel(item.arrival_date || item.createdAt),
          items: [],
          totalShipments: 0,
          totalWeight: 0,
          totalPieces: 0,
        };
      }
      groups[dateKey].items.push(item);
      groups[dateKey].totalShipments += Number(item.total_shipments || item.scanned_items?.length || 0);
      groups[dateKey].totalWeight += Number(item.total_weight || 0);
      groups[dateKey].totalPieces += Number(item.total_pieces || 0);
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [arrivalHistory, historySearchQuery]);

  const threeDaySummary = React.useMemo(() => {
    const totalBatches = arrivalHistory.length;
    const totalParcels = arrivalHistory.reduce((acc, b) => acc + (Number(b.total_shipments) || (b.scanned_items?.length) || 0), 0);
    const totalWeight = Math.round(arrivalHistory.reduce((acc, b) => acc + (Number(b.total_weight) || 0), 0) * 10) / 10;
    return { totalBatches, totalParcels, totalWeight };
  }, [arrivalHistory]);

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
                  onChange={(e) => {
                    const val = e.target.value;
                    setScanBarcode(val);
                    const clean = val.trim().toUpperCase();
                    if (clean.length >= 3) {
                      const fromExp = expectedShipments.find(p => (p.tracking_number || '').trim().toUpperCase() === clean);
                      if (fromExp) {
                        const rawPcs = fromExp.pieces ?? fromExp.attributes?.pieces;
                        const rawWt = fromExp.weight ?? fromExp.attributes?.weight;
                        if (rawPcs !== undefined && rawPcs !== null && Number(rawPcs) > 0) setScanPieces(Number(rawPcs));
                        if (rawWt !== undefined && rawWt !== null && Number(rawWt) > 0) setScanWeight(Number(rawWt));
                      }
                    }
                  }}
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
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Shipper / Consignee</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Route</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
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
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No shipments received yet in this batch. Scan tracking barcode or receive from Expected queue below.
                        </td>
                      </tr>
                    ) : (
                      receivedShipments.map((item, idx) => {
                        const originHub = item.originCity || getCurrentHubLocation();
                        const destCity = item.destinationCity || 'Dest';
                        const is3PL = Boolean(item.is3PL);
                        const serviceName = item.tplServiceName || (is3PL ? get3PLServiceName(item) : '');

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5 text-xs font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-bold font-mono text-primary">{item.shipmentNumber}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">Scanned at {item.arrivedAt}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-slate-800">{item.shipperName || 'Shipper'}</span>
                              <span className="block text-[11px] text-slate-500">&rarr; {item.consigneeName || item.recipientName || 'Customer'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                              <span className="font-semibold text-slate-800">{originHub}</span> &rarr; <span className="font-semibold text-slate-800">{destCity}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                is3PL
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {is3PL ? `3PL (${serviceName})` : '2PL'}
                              </span>
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
                        );
                      })
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
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Rider</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pcs • Wt</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Receiving Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingExpected ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                          Loading expected shipments...
                        </td>
                      </tr>
                    ) : expectedShipments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No pending expected shipments for this warehouse. All dispatched cargo has been physically arrived!
                        </td>
                      </tr>
                    ) : (
                      expectedShipments.map((p) => {
                        const isNotArrived = normalizeShipmentStatus(p.status) === SHIPMENT_STATUSES.NOT_ARRIVED;
                        const originHub = getCurrentHubLocation(p);
                        const destCity = getDestinationLocation(p);
                        const is3PL = getShipmentType(p) === '3PL';
                        const serviceName = is3PL ? get3PLServiceName(p) : '';

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
                              <span className="font-semibold text-slate-800">{originHub}</span> &rarr; <span className="font-semibold text-slate-800">{destCity}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                is3PL
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {is3PL ? `3PL (${serviceName})` : '2PL'}
                              </span>
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

      {/* ARRIVALS HISTORY MODAL - LAST 3 DAYS GROUPED BY DATE */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold shrink-0">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xl text-slate-900">Arrivals Batch History</h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Last 3 Days
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review finalized inbound arrival batches grouped by date with complete parcel breakdowns.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsListModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3-Day Summary Cards & Search Bar */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3-Day Total Batches</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{threeDaySummary.totalBatches} Batches</p>
                  </div>
                  <Boxes className="w-5 h-5 text-slate-400" />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3-Day Total Parcels</span>
                    <p className="text-lg font-black text-primary mt-0.5">{threeDaySummary.totalParcels} Units</p>
                  </div>
                  <Package className="w-5 h-5 text-primary/60" />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cumulative Weight</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{threeDaySummary.totalWeight} kg</p>
                  </div>
                  <Scale className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by Batch ID, Tracking #, Delivering Rider, or Hub..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                />
                {historySearchQuery && (
                  <button 
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Grouped List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {isLoadingHistory ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-600">Loading 3-day batch history...</p>
                </div>
              ) : groupedArrivalHistory.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                  <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-800">
                    {historySearchQuery ? 'No batches match your search filter' : 'No arrival batches found in the last 3 days'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {historySearchQuery 
                      ? 'Try clearing the search query or searching for a different tracking number or batch ID.' 
                      : 'When you scan parcels and click "Finalize Batch" on the Arrival Station, saved batches for the last 3 days will appear here grouped by date.'}
                  </p>
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              ) : (
                groupedArrivalHistory.map((group) => (
                  <div key={group.dateKey} className="space-y-3">
                    {/* Date Group Header */}
                    <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-10">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-black text-slate-900">
                          {group.label.title}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          • {group.label.subtitle}
                        </span>
                        {group.label.isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Today
                          </span>
                        )}
                        {group.label.isYesterday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Yesterday
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                          {group.items.length} {group.items.length === 1 ? 'Batch' : 'Batches'}
                        </span>
                        <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                          {group.totalShipments} Parcels
                        </span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                          {Math.round(group.totalWeight * 10) / 10} kg
                        </span>
                      </div>
                    </div>

                    {/* Batches in Date Group */}
                    <div className="space-y-3">
                      {group.items.map((batch: any) => {
                        const batchKey = batch.batch_id || String(batch.id);
                        const isExpanded = !!expandedBatchIds[batchKey];
                        const batchTime = batch.arrival_date || batch.createdAt
                          ? new Date(batch.arrival_date || batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-';
                        const officeName = batch.office?.name || batch.office?.CityName || 'All Facilities';
                        const riderName = batch.rider?.name || batch.rider?.username || 'Direct Hub Intake';

                        return (
                          <div 
                            key={batch.id} 
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-primary/40 transition-all overflow-hidden"
                          >
                            {/* Batch Summary Row */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                              <div className="flex flex-wrap items-center gap-3">
                                {/* Batch Number with Copy Button */}
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                                  <span className="font-mono font-bold text-xs text-primary">{batch.batch_id || `ARR-${batch.id}`}</span>
                                  <button
                                    onClick={() => copyToClipboard(batch.batch_id || `ARR-${batch.id}`, 'batch')}
                                    className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
                                    title="Copy Batch ID"
                                  >
                                    {copiedBatchId === (batch.batch_id || `ARR-${batch.id}`) ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {/* Arrival Time */}
                                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{batchTime}</span>
                                </div>

                                {/* Hub / Warehouse */}
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-bold border border-violet-100">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>{officeName}</span>
                                </div>

                                {/* Delivering Rider */}
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>{riderName}</span>
                                </div>
                              </div>

                              {/* Batch Right Metrics & Expand Action */}
                              <div className="flex items-center gap-3 self-end sm:self-center">
                                <div className="text-right">
                                  <span className="text-xs font-black text-slate-900 block">
                                    {batch.total_shipments || batch.scanned_items?.length || 0} Units
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-400 block">
                                    {batch.total_pieces || 1} pcs • {batch.total_weight || 0.8} kg
                                  </span>
                                </div>

                                <button
                                  onClick={() => toggleBatchExpand(batchKey)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isExpanded
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{isExpanded ? 'Hide' : 'View Parcels'}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Scanned Parcels Table */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/70 p-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between mb-2.5">
                                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-primary" /> Received Parcels in Batch ({batch.scanned_items?.length || 0})
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Recorded on {new Date(batch.arrival_date || batch.createdAt).toLocaleDateString()} at {batchTime}
                                  </span>
                                </div>

                                {Array.isArray(batch.scanned_items) && batch.scanned_items.length > 0 ? (
                                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                        <tr>
                                          <th className="px-3 py-2.5">#</th>
                                          <th className="px-3 py-2.5">Tracking #</th>
                                          <th className="px-3 py-2.5">Consignee & Route</th>
                                          <th className="px-3 py-2.5">Type</th>
                                          <th className="px-3 py-2.5">Pcs • Wt</th>
                                          <th className="px-3 py-2.5">COD (PKR)</th>
                                          <th className="px-3 py-2.5">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                        {batch.scanned_items.map((item: any, pIdx: number) => {
                                          const trackingNum = item.shipmentNumber || item.tracking_number || item.attributes?.tracking_number || String(item.id || pIdx + 1);
                                          const consignee = item.consigneeName || item.recipientName || item.recipient_name || 'Customer';
                                          const orig = item.originCity || getCurrentHubLocation(item);
                                          const dest = item.destinationCity || getDestinationLocation(item);
                                          const is3PL = item.is3PL !== undefined ? Boolean(item.is3PL) : (getShipmentType(item) === '3PL');
                                          const serviceName = item.tplServiceName || (is3PL ? get3PLServiceName(item) : '');
                                          const pcs = item.pieces || 1;
                                          const wt = item.weight || 0.8;
                                          const cod = item.codAmount || item.cod_amount || 0;
                                          const status = item.status || SHIPMENT_STATUSES.ARRIVED_ORIGIN;

                                          return (
                                            <tr key={item.id || pIdx} className="hover:bg-slate-50 transition-colors">
                                              <td className="px-3 py-2 text-slate-400 font-bold">{pIdx + 1}</td>
                                              <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-mono font-bold text-primary">{trackingNum}</span>
                                                  <button
                                                    onClick={() => copyToClipboard(trackingNum, 'tracking')}
                                                    className="text-slate-300 hover:text-primary transition-colors cursor-pointer"
                                                    title="Copy Tracking #"
                                                  >
                                                    {copiedTracking === trackingNum ? (
                                                      <Check className="w-3 h-3 text-emerald-600" />
                                                    ) : (
                                                      <Copy className="w-3 h-3" />
                                                    )}
                                                  </button>
                                                </div>
                                              </td>
                                              <td className="px-3 py-2">
                                                <span className="font-bold text-slate-900 block">{consignee}</span>
                                                <span className="text-[10px] text-slate-400 block">{orig} &rarr; {dest}</span>
                                              </td>
                                              <td className="px-3 py-2">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                  is3PL
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                  {is3PL ? `3PL (${serviceName})` : '2PL'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-slate-600">
                                                {pcs} pc • {wt} kg
                                              </td>
                                              <td className="px-3 py-2 font-bold text-slate-900">
                                                PKR {Number(cod).toLocaleString()}
                                              </td>
                                              <td className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  <CheckCircle2 className="w-3 h-3" /> {status}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">No individual parcel breakdown available for this batch.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Showing batches recorded in the last 72 hours.
              </span>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}
    </PortalLayout>
  );
}

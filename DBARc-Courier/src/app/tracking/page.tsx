'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { useAuth } from '@/components/AuthProvider';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  Phone, 
  AlertCircle, 
  Navigation, 
  User, 
  ArrowRight, 
  Check, 
  Filter, 
  Calendar, 
  Eye, 
  X, 
  RefreshCw, 
  MapPin, 
  FileText, 
  Building2, 
  RotateCcw, 
  AlertTriangle, 
  Layers,
  Printer,
  Copy,
  Barcode,
  Boxes,
  Compass
} from 'lucide-react';

import { useSearchParams } from 'next/navigation';

interface TrackingEvent {
  title: string;
  description: string;
  time: string;
  status: string;
  isCompleted: boolean;
  isFailed?: boolean;
  isWarning?: boolean;
}

// Helper to extract known Pakistani city name from address or relations
function resolveCity(cityObj: any, address: string, fallback: string): string {
  if (cityObj?.CityName) return cityObj.CityName;
  if (cityObj?.name) return cityObj.name;
  if (!address) return fallback;

  const knownCities = [
    'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad', 'Multan',
    'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Gujrat', 'Jhelum',
    'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sahiwal', 'Sheikhupura', 'Sukkur',
    'Larkana', 'Mardan', 'Kasur', 'Rahim Yar Khan', 'Dera Ghazi Khan', 'Abbottabad',
    'Sarai Alamgeer', 'Chiniot', 'Murree', 'Wah Cantt', 'Taxila'
  ];
  for (const c of knownCities) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(address)) {
      return c;
    }
  }
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return fallback;
}

// Calculates real delivery freight based on weight, distance (within-city vs inter-city) and service type
function computeDeliveryCharges(item: any, isInterCity: boolean): number {
  if (item.delivery_charges && Number(item.delivery_charges) > 0) {
    return Number(item.delivery_charges);
  }
  const weight = Number(item.weight) || 0.5;
  const isSecondDay = item.service_type === 'Second Day';
  let baseRate = isInterCity ? 250 : 150;
  let oneKgRate = isInterCity ? 300 : 200;
  let addPerKg = isInterCity ? 200 : 150;

  if (isSecondDay) {
    baseRate = Math.round(baseRate * 0.85);
    oneKgRate = Math.round(oneKgRate * 0.85);
  }

  if (weight <= 0.5) return baseRate;
  if (weight <= 1.0) return oneKgRate;
  const extraWeight = Math.ceil(weight - 1.0);
  return oneKgRate + (extraWeight * addPerKg);
}

function TrackingPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';

  const { user, isShipper, activeBusinessId } = useAuth();

  const [parcels, setParcels] = React.useState<any[]>([]);
  const [shippers, setShippers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Quick Direct Search Bar State
  const [directSearch, setDirectSearch] = React.useState(initialSearch);

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState(initialSearch);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [shipperFilter, setShipperFilter] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  // Selected Order Detail Modal State
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [editStatus, setEditStatus] = React.useState<string>('');
  const [statusComment, setStatusComment] = React.useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Toast State
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const fetchShippers = React.useCallback(async () => {
    if (isShipper) return;
    try {
      const response = await apiClient.get('/shippers?pagination[limit]=100&fields[0]=name&fields[1]=company_name');
      setShippers(response.data?.data || []);
    } catch (error) {
      console.warn('Could not fetch shippers:', error);
    }
  }, [isShipper]);

  const fetchParcels = React.useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = '/parcels?populate=*&sort[0]=createdAt:desc&pagination[limit]=100';
      
      // If Shipper user: scope strictly to their own business
      if (isShipper && activeBusinessId) {
        endpoint += `&filters[shipper][id][$eq]=${activeBusinessId}`;
      }

      const response = await apiClient.get(endpoint);
      const data = response.data?.data || [];
      if (data.length > 0) {
        const mapped = data.map((item: any) => {
          const originCity = resolveCity(
            item.source_city,
            item.origin_office?.address || item.pickup_location?.address || '',
            item.origin_office?.name || 'Lahore Hub'
          );
          const destCity = resolveCity(
            item.destination_city,
            item.recipient_address || '',
            'Destination City'
          );
          const isInterCity = originCity.toLowerCase().trim() !== destCity.toLowerCase().trim();
          const shipperName = item.shipper?.company_name || item.shipper?.name || (item.shipper ? `Shipper #${item.shipper.id}` : 'Direct Booking');

          let handlerDisplay = 'Awaiting Pickup';
          if (item.rider?.name || item.rider?.user?.fullName || item.rider?.user?.username) {
            handlerDisplay = item.rider?.name || item.rider?.user?.fullName || item.rider?.user?.username;
          } else if (item.load_sheet?.sheet_id) {
            handlerDisplay = `Load Sheet #${item.load_sheet.sheet_id}`;
          } else if (item.status === 'Total Booking') {
            handlerDisplay = 'Pending Rider Pickup';
          } else if (item.status === 'Arrived at the warehouse') {
            handlerDisplay = 'Origin Warehouse Hub';
          } else if (item.status === 'In Transit') {
            handlerDisplay = 'Linehaul Courier';
          } else if (item.status === 'Arrived at warehouse') {
            handlerDisplay = 'Destination Warehouse Hub';
          } else if (item.status === 'Out for Delivery') {
            handlerDisplay = 'Delivery Courier';
          } else if (item.status === 'Delivered') {
            handlerDisplay = 'Delivered to Consignee';
          }

          const itemDescription = item.comments 
            || `${item.pieces || 1} Pc(s) ${item.shipment_type || 'Parcel'} (${item.service_type || 'Overnight'})`;

          const docId = item.documentId || String(item.id);
          const computedDeliveryCharges = computeDeliveryCharges(item, isInterCity);

          return {
            id: item.id,
            documentId: docId,
            tracking_number: item.tracking_number,
            recipient_name: item.recipient_name || 'Customer Consignee',
            recipient_phone: item.recipient_phone || item.consignee_alt_phone || 'No phone recorded',
            recipient_address: item.recipient_address || 'Delivery address not specified',
            status: item.status || 'Total Booking',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            arrival_date: item.arrival_date,
            delivered_date: item.delivered_date,
            description: itemDescription,
            origin: originCity,
            destination: destCity,
            rider_name: handlerDisplay,
            cod_amount: Number(item.cod_amount) || 0,
            delivery_charges: computedDeliveryCharges,
            weight: Number(item.weight) || 0.5,
            pieces: Number(item.pieces) || 1,
            service_type: item.service_type || 'Overnight',
            shipment_type: item.shipment_type || 'Parcel',
            payment_type: item.payment_type || 'COD',
            allow_to_open: item.allow_to_open || 'No',
            comments: item.comments || '',
            shipper_id: item.shipper?.id || null,
            shipper_name: shipperName,
            load_sheet_no: item.load_sheet?.sheet_id || null,
            load_sheet_date: item.load_sheet?.date_created || null,
            manifest_no: item.manifest?.manifest_number || null,
            manifest_seal: item.manifest?.seal_no || null,
            is_self_booking: !item.shipper,
            is_inter_city: isInterCity,
            failure_reason: item.failure_reason || item.comments || '',
            delivery_attempts: item.delivery_attempts || 0,
          };
        });
        setParcels(mapped);

        // If URL had a search param, preselect matching order if found
        if (initialSearch) {
          const match = mapped.find((p: any) => p.tracking_number.toLowerCase().includes(initialSearch.toLowerCase().trim()));
          if (match) {
            setSelectedOrder(match);
          }
        }
      } else {
        setParcels([]);
      }
    } catch (error) {
      console.warn('Could not fetch parcels:', error);
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [isShipper, activeBusinessId, initialSearch]);

  React.useEffect(() => {
    fetchParcels();
    fetchShippers();
  }, [fetchParcels, fetchShippers]);

  React.useEffect(() => {
    if (selectedOrder) {
      setEditStatus(selectedOrder.status);
      setStatusComment(selectedOrder.failure_reason || '');
    }
  }, [selectedOrder]);

  // Direct Tracking Action
  const handleDirectTrack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = directSearch.trim().toLowerCase();
    if (!q) return;
    const match = parcels.find(p => p.tracking_number.toLowerCase() === q || p.tracking_number.toLowerCase().includes(q));
    if (match) {
      setSelectedOrder(match);
      triggerToast(`Showing live tracking timeline for ${match.tracking_number}`);
    } else {
      setSearchQuery(directSearch);
      triggerToast(`Filtered list by "${directSearch}"`);
    }
  };

  // Real database status update
  const handleUpdateStatus = async () => {
    if (!selectedOrder || !editStatus) return;
    try {
      setIsUpdatingStatus(true);
      const payload: any = {
        status: editStatus,
      };
      if (statusComment) {
        payload.comments = statusComment;
      }
      if (editStatus === 'Delivered') {
        payload.delivered_date = new Date().toISOString();
      }
      if (editStatus === 'Arrived at the warehouse' || editStatus === 'Arrived at warehouse') {
        payload.arrival_date = new Date().toISOString();
      }

      const targetId = selectedOrder.documentId || selectedOrder.id;
      await apiClient.put(`/parcels/${targetId}`, {
        data: payload
      });

      triggerToast(`Order ${selectedOrder.tracking_number} updated to "${editStatus}"`);

      // Update local state
      const nowIso = new Date().toISOString();
      const updatedOrder = { 
        ...selectedOrder, 
        status: editStatus, 
        failure_reason: statusComment || selectedOrder.failure_reason,
        comments: statusComment || selectedOrder.comments,
        updatedAt: nowIso,
        delivered_date: editStatus === 'Delivered' ? nowIso : selectedOrder.delivered_date,
        arrival_date: (editStatus === 'Arrived at the warehouse' || editStatus === 'Arrived at warehouse') ? nowIso : selectedOrder.arrival_date,
      };
      setSelectedOrder(updatedOrder);
      setParcels(prev => prev.map(p => (p.id === selectedOrder.id || p.documentId === targetId) ? updatedOrder : p));
    } catch (err: any) {
      console.error('Failed to update status', err?.response?.data || err?.message || err);
      const errMsg = err?.response?.data?.error?.message || 'Failed to update status. Please try again.';
      alert(`Failed to update status: ${errMsg}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Dynamic 12-Status Real Journey Stepper
  const getTimelineEvents = (parcel: any, currentStatus: string): TrackingEvent[] => {
    const bookedTime = new Date(parcel.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bookedDate = new Date(parcel.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const updatedTime = new Date(parcel.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedDate = new Date(parcel.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

    const isInterCity = parcel.is_inter_city;
    const events: TrackingEvent[] = [];

    // 1. Total Booking
    events.push({
      title: 'Total Booking Registered',
      description: `Shipment registered at ${parcel.origin} by ${parcel.shipper_name}. Consignee: ${parcel.recipient_name}.`,
      time: `${bookedDate}, ${bookedTime}`,
      status: 'Total Booking',
      isCompleted: true,
    });

    // 2. Picked up by rider
    const isPickedUp = [
      'Picked up by rider', 'Arrived at the warehouse', 'Arrived', 'Not Arrived', 
      'In Transit', 'Arrived at warehouse', 'Arrived At Destination', 
      'Out for Delivery', 'Out For delivery', 'Delivered', 'Delivery Failed', 
      'Failed Attempt', 'Ready for Return', 'Ready To Return', 'Return to Shipper', 'Lost/Damage'
    ].includes(currentStatus);

    events.push({
      title: 'Picked up by Rider',
      description: parcel.load_sheet_no 
        ? `Picked up and dispatched on Load Sheet #${parcel.load_sheet_no}.`
        : `Parcel handed over from shipper to rider for origin hub transport.`,
      time: isPickedUp 
        ? (parcel.load_sheet_date ? new Date(parcel.load_sheet_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `${bookedDate}, Handover`)
        : 'Awaiting rider pickup',
      status: 'Picked up by rider',
      isCompleted: isPickedUp,
    });

    // 4. Not Arrived exception
    if (currentStatus === 'Not Arrived') {
      events.push({
        title: 'Not Arrived at Warehouse',
        description: 'Load sheet dispatched by rider but parcel was not scanned into origin hub.',
        time: `${updatedDate}, Exception Alert`,
        status: 'Not Arrived',
        isCompleted: true,
        isFailed: true,
      });
      return events;
    }

    // 3. Arrived at the warehouse
    const isWarehouseArrived = [
      'Arrived at the warehouse', 'Arrived', 'In Transit', 'Arrived at warehouse', 
      'Arrived At Destination', 'Out for Delivery', 'Out For delivery', 
      'Delivered', 'Delivery Failed', 'Failed Attempt', 'Ready for Return', 
      'Ready To Return', 'Return to Shipper', 'Lost/Damage'
    ].includes(currentStatus);

    events.push({
      title: 'Arrived at Origin Warehouse',
      description: `Scanned & received at origin facility (${parcel.origin}). Ready for sorting.`,
      time: isWarehouseArrived 
        ? (parcel.arrival_date ? new Date(parcel.arrival_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `${updatedDate}, Hub Processed`)
        : 'Pending arrival',
      status: 'Arrived at the warehouse',
      isCompleted: isWarehouseArrived,
    });

    // 12. Lost / Damage exception
    if (currentStatus === 'Lost/Damage') {
      events.push({
        title: 'Lost / Damage Reported',
        description: 'Parcel reported lost or damaged during warehouse sorting or handling.',
        time: `${updatedDate}, Incident Logged`,
        status: 'Lost/Damage',
        isCompleted: true,
        isFailed: true,
      });
      return events;
    }

    // 5 & 6. In Transit & Destination Arrival (Inter-city)
    if (isInterCity) {
      const isInTransit = [
        'In Transit', 'Arrived at warehouse', 'Arrived At Destination', 
        'Out for Delivery', 'Out For delivery', 'Delivered', 'Delivery Failed', 
        'Failed Attempt', 'Ready for Return', 'Ready To Return', 'Return to Shipper'
      ].includes(currentStatus);

      events.push({
        title: 'In Transit (Linehaul Dispatch)',
        description: parcel.manifest_no 
          ? `Dispatched on linehaul manifest #${parcel.manifest_no}${parcel.manifest_seal ? ` (Seal: ${parcel.manifest_seal})` : ''} from ${parcel.origin} towards ${parcel.destination}.`
          : `Dispatched on linehaul manifest from ${parcel.origin} towards ${parcel.destination}.`,
        time: isInTransit ? `${updatedDate}, In Linehaul Transit` : 'Pending linehaul dispatch',
        status: 'In Transit',
        isCompleted: isInTransit,
      });

      const isDestArrived = [
        'Arrived at warehouse', 'Arrived At Destination', 'Out for Delivery', 
        'Out For delivery', 'Delivered', 'Delivery Failed', 'Failed Attempt', 
        'Ready for Return', 'Ready To Return', 'Return to Shipper'
      ].includes(currentStatus);

      events.push({
        title: 'Arrived at Destination Warehouse',
        description: `Demanifested and received at destination hub (${parcel.destination}).`,
        time: isDestArrived ? `${updatedDate}, Destination Hub` : 'En route to destination hub',
        status: 'Arrived at warehouse',
        isCompleted: isDestArrived,
      });
    }

    // 7. Out for Delivery
    const isOutForDelivery = [
      'Out for Delivery', 'Out For delivery', 'Delivered', 'Delivery Failed', 
      'Failed Attempt', 'Ready for Return', 'Ready To Return', 'Return to Shipper'
    ].includes(currentStatus);

    events.push({
      title: 'Out for Delivery',
      description: `Assigned to local delivery runsheet with courier for final delivery attempt.`,
      time: isOutForDelivery ? `${updatedDate}, Out for Delivery` : 'Pending runsheet assignment',
      status: 'Out for Delivery',
      isCompleted: isOutForDelivery,
    });

    // 8, 9, 10, 11: Final Delivery or Return Flow
    if (['Delivery Failed', 'Failed Attempt', 'Ready for Return', 'Ready To Return', 'Return to Shipper'].includes(currentStatus)) {
      events.push({
        title: 'Delivery Attempt Failed',
        description: parcel.failure_reason 
          ? `Delivery attempt unsuccessful: "${parcel.failure_reason}". Logged in Shipper Advise.`
          : 'Receiver unavailable / contact unsuccessful. Logged in Shipper Advise.',
        time: `${updatedDate}, Failed Attempt`,
        status: 'Delivery Failed',
        isCompleted: true,
        isWarning: true,
      });

      const isReadyReturn = ['Ready for Return', 'Ready To Return', 'Return to Shipper'].includes(currentStatus);
      events.push({
        title: 'Ready for Return',
        description: 'Return process authorized via Shipper Advise or SLA expiration.',
        time: isReadyReturn ? `${updatedDate}, Return Manifested` : 'Awaiting Shipper Advice',
        status: 'Ready for Return',
        isCompleted: isReadyReturn,
        isWarning: true,
      });

      const isReturned = currentStatus === 'Return to Shipper';
      events.push({
        title: 'Return to Shipper Handover',
        description: isReturned ? `Parcel safely returned to shipper (${parcel.shipper_name}).` : 'Pending physical return handover.',
        time: isReturned ? `${updatedDate}, Returned to Shipper` : 'Pending return delivery',
        status: 'Return to Shipper',
        isCompleted: isReturned,
      });
    } else {
      const isDelivered = currentStatus === 'Delivered';
      events.push({
        title: 'Delivered to Consignee',
        description: isDelivered 
          ? `Delivered to ${parcel.recipient_name}. COD collected: PKR ${parcel.cod_amount?.toLocaleString() || 0}.`
          : 'Pending final delivery confirmation.',
        time: isDelivered 
          ? (parcel.delivered_date ? new Date(parcel.delivered_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : `${updatedDate}, ${updatedTime}`)
          : 'Pending delivery',
        status: 'Delivered',
        isCompleted: isDelivered,
      });
    }

    return events;
  };

  const currentTimeline = selectedOrder ? getTimelineEvents(selectedOrder, editStatus) : [];

  const getStatusBadgeColors = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Out for Delivery':
      case 'Out For delivery':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'In Transit':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Arrived at warehouse':
      case 'Arrived At Destination':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Arrived at the warehouse':
      case 'Arrived':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Picked up by rider':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Not Arrived':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Delivery Failed':
      case 'Failed Attempt':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Ready for Return':
      case 'Ready To Return':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Return to Shipper':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Lost/Damage':
        return 'bg-red-200 text-red-900 border-red-400';
      case 'Total Booking':
      case 'booked':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Real live KPI stats calculation
  const stats = React.useMemo(() => {
    const total = parcels.length;
    const inHubTransit = parcels.filter(p => [
      'Picked up by rider', 'Arrived at the warehouse', 'Arrived', 
      'In Transit', 'Arrived at warehouse', 'Arrived At Destination'
    ].includes(p.status)).length;
    const outForDelivery = parcels.filter(p => ['Out for Delivery', 'Out For delivery'].includes(p.status)).length;
    const delivered = parcels.filter(p => p.status === 'Delivered').length;
    const exceptions = parcels.filter(p => [
      'Delivery Failed', 'Failed Attempt', 'Ready for Return', 
      'Ready To Return', 'Return to Shipper', 'Not Arrived', 'Lost/Damage'
    ].includes(p.status)).length;

    return { total, inHubTransit, outForDelivery, delivered, exceptions };
  }, [parcels]);

  // Filter Logic
  const filteredParcels = parcels.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      item.tracking_number.toLowerCase().includes(q) ||
      item.recipient_name.toLowerCase().includes(q) ||
      item.recipient_address.toLowerCase().includes(q) ||
      item.recipient_phone.includes(q) ||
      (item.shipper_name && item.shipper_name.toLowerCase().includes(q))
    );

    // Normalize status match for 12 statuses
    let matchesStatus = true;
    if (statusFilter) {
      if (statusFilter === 'Total Booking') {
        matchesStatus = item.status === 'Total Booking' || item.status === 'booked';
      } else if (statusFilter === 'Arrived at the warehouse') {
        matchesStatus = item.status === 'Arrived at the warehouse' || item.status === 'Arrived';
      } else if (statusFilter === 'Arrived at warehouse') {
        matchesStatus = item.status === 'Arrived at warehouse' || item.status === 'Arrived At Destination';
      } else if (statusFilter === 'Out for Delivery') {
        matchesStatus = item.status === 'Out for Delivery' || item.status === 'Out For delivery';
      } else if (statusFilter === 'Delivery Failed') {
        matchesStatus = item.status === 'Delivery Failed' || item.status === 'Failed Attempt';
      } else if (statusFilter === 'Ready for Return') {
        matchesStatus = item.status === 'Ready for Return' || item.status === 'Ready To Return';
      } else {
        matchesStatus = item.status === statusFilter;
      }
    }

    // Shipper Filter (for courier admin / staff)
    let matchesShipper = true;
    if (!isShipper && shipperFilter !== 'all') {
      if (shipperFilter === 'self_booking') {
        matchesShipper = item.is_self_booking;
      } else {
        matchesShipper = String(item.shipper_id) === String(shipperFilter);
      }
    }

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(item.createdAt) >= new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(item.createdAt) <= toDate;
    }

    return matchesSearch && matchesStatus && matchesShipper && matchesDate;
  });

  return (
    <PortalLayout>
      <div className="flex flex-col gap-6 max-w-[1920px] w-full mx-auto pb-16">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-primary" /> Logistics Operations & Visibility
            </div>
            <h1 className="font-display text-2xl font-bold text-on-surface mt-0.5">
              Live Consignment Tracking & Order Lifecycle
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Real-time multi-stage tracking across 12 operational statuses. Click any consignment to view the complete transit history and package specifications.
            </p>
          </div>
          <button 
            onClick={fetchParcels} 
            className="flex items-center gap-2 h-10 px-4 bg-white border border-outline-variant text-secondary rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-sm w-fit"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Database
          </button>
        </div>

        {/* Quick Tracking Hero Search Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary text-white p-6 sm:p-7 rounded-2xl shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary-200 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-primary-300 shrink-0" /> Instant Consignment Tracking
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight whitespace-nowrap">
              Track Any Air Waybill (CN#) or Shipment
            </h3>
            <p className="text-xs text-slate-300 whitespace-nowrap">
              Enter any booking tracking number to immediately open the complete verification timeline.
            </p>
          </div>

          <form onSubmit={handleDirectTrack} className="w-full md:w-auto md:min-w-[360px] md:max-w-md flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="e.g. DBA-TP0QPRP, DBA-778899-PK..."
                value={directSearch}
                onChange={(e) => setDirectSearch(e.target.value)}
                className="w-full bg-white/15 border border-white/30 hover:border-white/50 focus:border-white text-white placeholder-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-white/40 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Navigation className="w-3.5 h-3.5 text-primary" /> Track
            </button>
          </form>
        </div>

        {/* Live Operational Status KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div 
            onClick={() => setStatusFilter('')} 
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === '' ? 'bg-primary/5 border-primary ring-2 ring-primary/20' : 'bg-white border-slate-200 hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Bookings</span>
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 mt-2">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">All registered consignments</div>
          </div>

          <div 
            onClick={() => setStatusFilter('Arrived at the warehouse')} 
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'Arrived at the warehouse' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Hub / In Transit</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black font-mono text-indigo-950 mt-2">{stats.inHubTransit}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Warehouse & linehaul cargo</div>
          </div>

          <div 
            onClick={() => setStatusFilter('Out for Delivery')} 
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'Out for Delivery' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Out for Delivery</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-950 mt-2">{stats.outForDelivery}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Dispatched with delivery rider</div>
          </div>

          <div 
            onClick={() => setStatusFilter('Delivered')} 
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'Delivered' ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-950 mt-2">{stats.delivered}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Completed & COD verified</div>
          </div>

          <div 
            onClick={() => setStatusFilter('Delivery Failed')} 
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'Delivery Failed' ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Failed / Returns</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-950 mt-2">{stats.exceptions}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Shipper Advise & RTO queue</div>
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white py-3 px-5 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500 rounded-full p-1 text-white">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-sm font-semibold pr-2">{toastMessage}</div>
            <button onClick={() => setShowToast(false)} className="text-white/60 hover:text-white text-xs font-bold cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Filters Bar */}
        <div className={`bg-white border border-outline-variant rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 ${!isShipper ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
          {/* Search Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Search Order</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                type="text"
                placeholder="Tracking ID, Recipient, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>
          </div>

          {/* Shipper Filter for Courier Admin/Staff */}
          {!isShipper && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Shipper / Booking</label>
              <select
                value={shipperFilter}
                onChange={(e) => setShipperFilter(e.target.value)}
                className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
              >
                <option value="all">All Shippers & Direct Bookings</option>
                <option value="self_booking">Courier Direct (Self Bookings)</option>
                {shippers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name || s.name || `Shipper #${s.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Operational Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
            >
              <option value="">All 12 Statuses</option>
              <option value="Total Booking">1. Total Booking</option>
              <option value="Picked up by rider">2. Picked up by rider</option>
              <option value="Arrived at warehouse (Origin)">3. Arrived at warehouse (Origin)</option>
              <option value="Not Arrived">4. Not Arrived</option>
              <option value="In Transit">5. In Transit</option>
              <option value="Arrived at warehouse (Dest)">6. Arrived at warehouse (Dest)</option>
              <option value="Out for Delivery">7. Out for Delivery</option>
              <option value="Delivered">8. Delivered</option>
              <option value="Delivery Failed">9. Delivery Failed</option>
              <option value="Ready for Return">10. Ready for Return</option>
              <option value="Return to Shipper">11. Return to Shipper</option>
              <option value="Lost / Damage">12. Lost / Damage</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Main Orders Delivery List Table */}
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Active Consignment Register
            </h2>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredParcels.length} of {parcels.length} consignments
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <span className="material-symbols-outlined animate-spin text-[32px] mb-2">sync</span>
                <p className="text-xs font-semibold">Loading real consignment data...</p>
              </div>
            ) : filteredParcels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <Package className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">No matching consignments found</p>
                <p className="text-xs mt-1">Try clearing filters or search query.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="px-4 py-3">Tracking ID</th>
                    {!isShipper && <th className="px-4 py-3">Shipper</th>}
                    <th className="px-4 py-3">Consignee</th>
                    <th className="px-4 py-3">Route (Origin → Dest)</th>
                    <th className="px-4 py-3">Package / Items</th>
                    <th className="px-4 py-3">Handler / Stage</th>
                    <th className="px-4 py-3">COD Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-xs font-medium">
                  {filteredParcels.map((parcel) => (
                    <tr 
                      key={parcel.id}
                      onClick={() => setSelectedOrder(parcel)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-4 font-mono font-bold text-primary">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          <span>{parcel.tracking_number}</span>
                        </div>
                      </td>
                      {!isShipper && (
                        <td className="px-4 py-4 text-slate-700 font-semibold">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-800">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="max-w-[130px] truncate">{parcel.shipper_name}</span>
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{parcel.recipient_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{parcel.recipient_phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-800">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className="text-slate-700">{parcel.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-slate-900">{parcel.destination}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {parcel.recipient_address}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <div className="text-slate-900 font-semibold truncate max-w-[160px]">{parcel.description}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {parcel.weight} kg • {parcel.pieces} pc • {parcel.service_type}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-semibold">
                        <span className="text-slate-800 text-xs">{parcel.rider_name}</span>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        PKR {parcel.cod_amount?.toLocaleString() || 0}
                        <span className="block text-[10px] font-normal text-slate-500 font-mono">{parcel.payment_type}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColors(parcel.status)}`}>
                          {parcel.status === 'booked' ? 'Total Booking' : parcel.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(parcel);
                          }}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg font-semibold transition-colors flex items-center gap-1 ml-auto text-[11px] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* SINGLE ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 text-primary-200 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Consignment Dossier</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColors(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                    {selectedOrder.tracking_number}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.origin + `/tracking?search=${selectedOrder.tracking_number}`);
                    triggerToast('Direct tracking link copied to clipboard!');
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                  title="Copy Tracking Link"
                >
                  <Copy className="w-4 h-4" /> Link
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                  title="Print Waybill"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
              
              {/* Left Column: Real Transit Timeline Stepper */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" /> Live 12-Stage Journey History
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Booked {new Date(selectedOrder.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-5 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {currentTimeline.map((event, idx) => (
                      <div key={idx} className="relative flex flex-col gap-1">
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center -translate-x-1/2 z-10 ${
                          event.isFailed
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                            : event.isWarning
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : event.isCompleted 
                            ? 'bg-primary border-primary text-white shadow-sm' 
                            : 'bg-white border-slate-300 text-slate-300'
                        }`}>
                          {event.isFailed ? (
                            <X className="w-3 h-3 stroke-[3]" />
                          ) : event.isWarning ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : event.isCompleted ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : null}
                        </div>
                        <div className="flex justify-between items-baseline text-xs">
                          <span className={`font-bold ${event.isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                            {event.title}
                          </span>
                          <span className={`text-[11px] font-mono font-bold ${event.isCompleted ? 'text-primary' : 'text-slate-400'}`}>
                            {event.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Parties Card */}
                <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm grid grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-primary" /> Shipper & Origin
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{selectedOrder.shipper_name}</span>
                    <span className="text-slate-600 font-medium">Origin Hub: {selectedOrder.origin}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" /> Consignee & Destination
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{selectedOrder.recipient_name}</span>
                    <span className="text-slate-700 font-mono">{selectedOrder.recipient_phone}</span>
                    <span className="text-slate-600 mt-0.5">{selectedOrder.recipient_address}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Consignment Specs & Real Staff Status Controls */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                
                {/* Package Specifications */}
                <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4 text-xs">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <FileText className="w-4 h-4 text-primary" /> Package Specifications & Financials
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400 block">COD Amount</span>
                      <span className="font-bold font-mono text-base text-slate-900">PKR {selectedOrder.cod_amount?.toLocaleString() || 0}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Mode: {selectedOrder.payment_type}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400 block">Delivery Charges</span>
                      <span className="font-bold font-mono text-base text-slate-900">PKR {selectedOrder.delivery_charges?.toLocaleString() || 0}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Base Freight</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Weight & Volume</span>
                      <span className="font-bold text-slate-800">{selectedOrder.weight} kg • {selectedOrder.pieces} Pcs</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Service Class</span>
                      <span className="font-bold text-slate-800">{selectedOrder.service_type} ({selectedOrder.shipment_type})</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Allow Inspection</span>
                      <span className="font-bold text-slate-800">{selectedOrder.allow_to_open === 'Yes' ? 'Allowed to Open' : 'Do Not Open'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Operational Handler</span>
                      <span className="font-bold text-slate-800">{selectedOrder.rider_name}</span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-400 font-medium block">Special Instructions / Description</span>
                      <span className="font-semibold text-slate-700">{selectedOrder.description}</span>
                    </div>
                  </div>
                </div>

                {/* Courier Staff Live Operational Status Manager */}
                {!isShipper && (
                  <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <RotateCcw className="w-4 h-4 text-primary" /> Operational Status Dispatch
                    </h4>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold text-slate-600">Update Order Status:</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="bg-slate-50 border border-outline-variant rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="Total Booking">1. Total Booking</option>
                        <option value="Picked up by rider">2. Picked up by rider</option>
                        <option value="Arrived at warehouse (Origin)">3. Arrived at warehouse (Origin)</option>
                        <option value="Not Arrived">4. Not Arrived</option>
                        <option value="In Transit">5. In Transit</option>
                        <option value="Arrived at warehouse (Dest)">6. Arrived at warehouse (Dest)</option>
                        <option value="Out for Delivery">7. Out for Delivery</option>
                        <option value="Delivered">8. Delivered</option>
                        <option value="Delivery Failed">9. Delivery Failed</option>
                        <option value="Ready for Return">10. Ready for Return</option>
                        <option value="Return to Shipper">11. Return to Shipper</option>
                        <option value="Lost / Damage">12. Lost / Damage</option>
                      </select>
                    </div>

                    {(editStatus === 'Delivery Failed' || editStatus === 'Ready for Return') && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[11px] font-semibold text-slate-600">Reason / Courier Remark:</label>
                        <input
                          type="text"
                          placeholder="e.g. Customer refused, Receiver unavailable, Wrong address"
                          value={statusComment}
                          onChange={(e) => setStatusComment(e.target.value)}
                          className="bg-slate-50 border border-outline-variant rounded-xl p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus || (editStatus === selectedOrder.status && !statusComment)}
                      className="w-full mt-2 bg-primary text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      {isUpdatingStatus ? 'Saving Live Status...' : 'Save Operational Status'}
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </PortalLayout>
  );
}

export default function TrackingPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TrackingPageContent />
    </React.Suspense>
  );
}

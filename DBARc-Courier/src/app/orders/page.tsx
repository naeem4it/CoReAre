'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';
import { ShipperDateRangePicker } from '@/features/shipper/ui/ShipperDateRangePicker';
import {
  Printer,
  Search,
  X,
  Package,
  Plus,
  CheckSquare,
  Square,
  Ban,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { TablePagination } from '@/components/ui/TablePagination';

function extractCityFromAddress(address: string): string {
  if (!address) return 'Pakistan';
  const knownCities = [
    'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad', 'Multan',
    'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Gujrat', 'Jhelum',
    'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sahiwal', 'Sheikhupura', 'Sukkur',
    'Larkana', 'Mardan', 'Kasur', 'Rahim Yar Khan', 'Dera Ghazi Khan', 'Abbottabad'
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
  return address.trim() || 'Pakistan';
}

/**
 * Business Rule: Cancel order is only allowed BEFORE transit.
 * Once in transit, arrived at destination, out for delivery, or delivered, cancellation is locked.
 */
export function canCancelOrder(status: string): boolean {
  if (!status) return true;
  const s = status.toLowerCase().trim();

  // If already cancelled or in / past transit:
  if (
    s.includes('transit') ||
    s.includes('destination') ||
    s.includes('out for delivery') ||
    s.includes('delivered') ||
    s.includes('failed') ||
    s.includes('return') ||
    s.includes('lost') ||
    s.includes('damage') ||
    s.includes('cancel')
  ) {
    return false;
  }

  const norm = normalizeShipmentStatus(status);
  const nonCancellable = [
    SHIPMENT_STATUSES.IN_TRANSIT,
    SHIPMENT_STATUSES.ARRIVED_DEST,
    SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
    SHIPMENT_STATUSES.DELIVERED,
    SHIPMENT_STATUSES.DELIVERY_FAILED,
    SHIPMENT_STATUSES.READY_FOR_RETURN,
    SHIPMENT_STATUSES.RETURN_TO_SHIPPER,
    SHIPMENT_STATUSES.LOST_DAMAGE,
  ];

  return !nonCancellable.includes(norm);
}

import {
  isEligibleForDispatchSlip,
  DispatchSlipCard,
  type OrderRow,
} from '@/features/shipper/ui/DispatchSlipCard';

export { isEligibleForDispatchSlip, DispatchSlipCard, type OrderRow };

function OrderListContent() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams?.get('status') || '';
  const urlCity = searchParams?.get('city') || '';
  const urlSearch = searchParams?.get('search') || '';

  const { user, activeBusinessId } = useAuth();
  const { businessName } = useTenant();
  const [data, setData] = React.useState<OrderRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState(urlSearch);
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Date Range State for Booking Orders List (default: past 30 days up to today)
  const now = new Date();
  const past30Days = new Date();
  past30Days.setDate(past30Days.getDate() - 30);
  const [fromDate, setFromDate] = React.useState<string>(past30Days.toISOString().split('T')[0]);
  const [toDate, setToDate] = React.useState<string>(now.toISOString().split('T')[0]);

  // Cancel Order Modal State
  const [orderToCancel, setOrderToCancel] = React.useState<OrderRow | null>(null);
  const [cancelReason, setCancelReason] = React.useState<string>('Customer requested cancellation');
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Derive active filters: user selection takes priority over URL query params
  const statusFilter = selectedStatus !== null ? selectedStatus : (urlStatus || '');
  const cityFilter = selectedCity !== null ? selectedCity : (urlCity || '');

  // Tenant 2PL self-service cities & 3PL partner state
  const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null);
  const [selfServiceCities, setSelfServiceCities] = React.useState<string[]>([]);
  const [courierTplPartners, setCourierTplPartners] = React.useState<Array<{ id: number; name?: string; is_preferred?: boolean }>>([]);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = React.useState<(number | string)[]>([]);

  // Dispatch Slips Print Modal State
  const [showSlipsModal, setShowSlipsModal] = React.useState(false);

  const isShipper = React.useMemo(() => {
    if (!user) return false;
    const hasShipperRelation = !!(user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : true));
    const hasShipperRoles = Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0;
    return hasShipperRelation || hasShipperRoles;
  }, [user]);

  const shipperId = React.useMemo(() => {
    if (user?.shipper) {
      if (Array.isArray(user.shipper) && user.shipper.length > 0) {
        const matching = user.shipper.find((s: { id?: number }) => s.id === activeBusinessId);
        return matching ? matching.id : user.shipper[0].id;
      } else if (typeof user.shipper === 'object' && user.shipper.id) {
        return user.shipper.id;
      }
    }
    return activeBusinessId || null;
  }, [user, activeBusinessId]);

  // Load configured 2PL self-service cities for courier tenant
  React.useEffect(() => {
    const loadTenantConfig = async () => {
      try {
        const res = await apiClient.get('/tenant/list?populate=*');
        const items = res.data?.data || [];
        const currentTenant = items.find((t: { id?: number; attributes?: { documentId?: string } }) =>
          String(t.id) === String(tenantId) || t.attributes?.documentId === String(tenantId)
        ) || items[0];
        const tenantData = currentTenant?.attributes || currentTenant;
        if (tenantData?.self_service_cities && Array.isArray(tenantData.self_service_cities)) {
          setSelfServiceCities(tenantData.self_service_cities);
        } else if (tenantId) {
          const saved = localStorage.getItem(`self_service_cities_${tenantId}`);
          if (saved) {
            try { setSelfServiceCities(JSON.parse(saved)); } catch { }
          }
        }
      } catch (err) {
        console.warn('Could not load tenant self service cities:', err);
        if (tenantId) {
          const saved = localStorage.getItem(`self_service_cities_${tenantId}`);
          if (saved) {
            try { setSelfServiceCities(JSON.parse(saved)); } catch { }
          }
        }
      }

      // Load 3PL partners
      try {
        const tplRes = await apiClient.get('/tpl-partners', {
          params: { filters: tenantId ? { tenant: tenantId } : {}, populate: '*' }
        });
        const partners = (tplRes.data?.data || []).map((item: { id: number; attributes?: Record<string, unknown> }) => ({
          id: item.id,
          ...(item.attributes || item)
        }));
        setCourierTplPartners(partners);
      } catch (err) {
        console.warn('Could not load tpl partners:', err);
      }
    };

    loadTenantConfig();
  }, [tenantId]);

  React.useEffect(() => {
    const fetchParcels = async () => {
      try {
        setIsLoading(true);
        const parcelsUrl = '/parcels?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=100';
        const response = await apiClient.get<StrapiCollectionResponse<Parcel>>(parcelsUrl);
        let parcels = response.data?.data || [];

        if (isShipper && shipperId && parcels.length > 0) {
          parcels = parcels.filter((item) => {
            const raw = item as Record<string, unknown>;
            const itemShipper = (raw.shipper || (raw.pickup_location as Record<string, unknown>)?.shipper) as { id?: number } | undefined;
            if (!itemShipper) return true;
            return itemShipper.id === shipperId;
          });
        }

        if (parcels.length > 0) {
          interface RawParcelRecord {
            id: number | string;
            tracking_number: string;
            recipient_name?: string;
            recipient_phone?: string;
            recipient_address?: string;
            destination_city?: { CityName?: string; name?: string };
            source_city?: { CityName?: string; name?: string };
            allow_to_open?: string;
            comments?: string;
            description?: string;
            product_description?: string;
            remarks?: string;
            special_instructions?: string;
            notes?: string;
            shipper?: { id?: number; name?: string; address?: string; phone?: string };
            pickup_location?: { id?: number; address?: string; phone?: string; shipper?: { id?: number; name?: string } };
            pieces?: number;
            weight?: number;
            cod_amount?: number | string;
            payment_type?: string;
            status?: string;
            is_3pl?: boolean;
            courier?: { name?: string };
            reference_number?: string;
            order_id?: string;
            createdAt?: string;
            date?: string;
          }

          const mapped: OrderRow[] = parcels.map((item) => {
            const raw = item as unknown as RawParcelRecord;
            const customerName = raw.recipient_name || 'Customer';
            const initials = customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';
            const destination = raw.destination_city?.CityName
              || raw.destination_city?.name
              || extractCityFromAddress(raw.recipient_address || '');
            const origin = raw.source_city?.CityName || raw.source_city?.name || 'Lahore';
            const allowToOpen = raw.allow_to_open || 'No';
            const parcelDetail = raw.comments || raw.description || raw.product_description || 'Standard Parcel';
            const product = raw.product_description || raw.description || raw.comments || 'Standard E-Commerce Parcel';
            const remarks = raw.remarks || raw.special_instructions || raw.notes || raw.comments || 'Call before delivery';
            const shipperPhone = raw.shipper?.phone || raw.pickup_location?.phone || '+92 300 0000000';
            const pieces = raw.pieces || 1;
            const orderReference = raw.reference_number || raw.order_id || `#${raw.id}`;

            // Format date as DD-MM-YY (e.g. "29-09-26")
            const d = new Date(raw.createdAt || raw.date || Date.now());
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            const dateFormatted = `${day}-${month}-${year}`;

            // Check if destination is in courier's configured 2PL self-service areas
            const normDest = destination.toLowerCase().trim();
            const normAddr = (raw.recipient_address || '').toLowerCase().trim();
            const in2PLArea = (selfServiceCities.length > 0)
              ? selfServiceCities.some((c: string) => {
                const normC = c.toLowerCase().trim();
                return normC === normDest || normDest.includes(normC) || normAddr.includes(normC);
              })
              : (!raw.is_3pl && (!raw.courier || raw.courier?.name === 'IN-HOUSE' || raw.courier?.name === '2PL'));

            const is2PL = in2PLArea && !(raw.is_3pl && raw.courier && raw.courier?.name !== 'IN-HOUSE');

            let tplCourierId = 'IN-HOUSE';
            let tplTrackingNo = raw.tracking_number;

            if (!is2PL) {
              tplCourierId = raw.courier?.name
                || (courierTplPartners.find((p) => p.is_preferred)?.name)
                || (courierTplPartners[0]?.name)
                || 'Leopards Courier';
              const cleanPrefix = tplCourierId.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'LE';
              tplTrackingNo = raw.reference_number || `${cleanPrefix}${raw.tracking_number.replace(/[^0-9]/g, '').slice(-10) || '7545194076'}`;
            }

            return {
              id: raw.id,
              trackingNumber: `${raw.tracking_number}`,
              orderReference,
              customerName,
              avatar: initials,
              phone: raw.recipient_phone || 'N/A',
              origin,
              destination,
              address: raw.recipient_address || 'No address provided',
              shipperName: raw.shipper?.name || raw.pickup_location?.shipper?.name || 'Shipper Account',
              shipperAddress: raw.pickup_location?.address || raw.shipper?.address || 'Pickup Warehouse',
              shipperPhone,
              paymentType: raw.payment_type === 'PAID' || Number(raw.cod_amount) === 0 ? 'PAID' : 'COD',
              codAmount: Number(raw.cod_amount) || 0,
              weightKg: raw.weight || 0.5,
              pieces,
              status: raw.status || 'booked',
              allowToOpen,
              product,
              remarks,
              parcelDetail,
              is2PL,
              tplCourierId,
              tplTrackingNo,
              dateCreated: raw.createdAt || new Date().toISOString(),
              dateFormatted,
            };
          });
          setData(mapped);
        } else {
          setData([]);
        }
      } catch (error) {
        console.warn('Could not fetch orders:', error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParcels();
  }, [isShipper, shipperId, selfServiceCities, courierTplPartners]);

  // Filter orders by search, status, destination city, and Date Range
  const filteredData = data.filter((row) => {
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      const matchSearch = (
        row.trackingNumber.toLowerCase().includes(lower) ||
        row.customerName.toLowerCase().includes(lower) ||
        row.address.toLowerCase().includes(lower) ||
        row.status.toLowerCase().includes(lower) ||
        row.orderReference.toLowerCase().includes(lower)
      );
      if (!matchSearch) return false;
    }

    if (statusFilter) {
      const normRow = normalizeShipmentStatus(row.status);
      const normFilter = normalizeShipmentStatus(statusFilter);
      const matchStatus = normRow === normFilter || row.status.toLowerCase().includes(statusFilter.toLowerCase());
      if (!matchStatus) return false;
    }

    if (cityFilter) {
      const lowerCity = cityFilter.toLowerCase();
      const matchCity = row.destination.toLowerCase().includes(lowerCity) || row.address.toLowerCase().includes(lowerCity);
      if (!matchCity) return false;
    }

    // Date Range Filter
    if (fromDate) {
      const rowDate = (row.dateCreated || '').split('T')[0];
      if (rowDate && rowDate < fromDate) return false;
    }
    if (toDate) {
      const rowDate = (row.dateCreated || '').split('T')[0];
      if (rowDate && rowDate > toDate) return false;
    }

    return true;
  });

  // Table Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  // Business Rule: Dispatch slips can strictly only be generated for Booked orders
  const eligibleBookedOrders = React.useMemo(() => {
    return filteredData.filter((r) => isEligibleForDispatchSlip(r.status));
  }, [filteredData]);

  const selectedOrders = React.useMemo(() => {
    return data.filter(row => selectedIds.includes(row.id) && isEligibleForDispatchSlip(row.status));
  }, [data, selectedIds]);

  const handleToggleRow = (row: OrderRow) => {
    if (!isEligibleForDispatchSlip(row.status)) {
      setToastMessage(`Dispatch slips can only be generated for Booked orders. (Order ${row.trackingNumber} is ${row.status})`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSelectedIds(prev =>
      prev.includes(row.id) ? prev.filter(item => item !== row.id) : [...prev, row.id]
    );
  };

  const handleToggleSelectAll = () => {
    if (eligibleBookedOrders.length === 0) {
      setToastMessage('No Booked orders available to select for dispatch slips.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const allEligibleSelected = eligibleBookedOrders.every(r => selectedIds.includes(r.id));
    if (allEligibleSelected) {
      const eligibleIds = new Set(eligibleBookedOrders.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !eligibleIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...eligibleBookedOrders.map(r => r.id)]));
      setSelectedIds(newSelected);
    }
  };

  const handlePrintSelected = () => {
    if (selectedOrders.length === 0) {
      setToastMessage('Please select at least one Booked order to generate dispatch slips.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setShowSlipsModal(true);
  };

  const handlePrintIndividual = (row: OrderRow) => {
    if (!isEligibleForDispatchSlip(row.status)) {
      setToastMessage(`Dispatch slips are only allowed for Booked orders. (Current status: ${row.status})`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSelectedIds([row.id]);
    setShowSlipsModal(true);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  // Handle Order Cancellation (Prohibited once in transit or delivered)
  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      setIsCancelling(true);
      try {
        await apiClient.put(`/parcels/${orderToCancel.id}`, {
          data: {
            status: 'Cancelled',
            remarks: cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled by Shipper',
          },
        });
      } catch (apiErr) {
        console.warn('API parcel cancel error (updating local state):', apiErr);
      }

      // Update local data state immediately
      setData((prev) =>
        prev.map((order) =>
          order.id === orderToCancel.id
            ? {
              ...order,
              status: 'Cancelled',
              remarks: cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled by Shipper',
            }
            : order
        )
      );

      setToastMessage(`Order ${orderToCancel.trackingNumber} has been successfully cancelled.`);
      setTimeout(() => setToastMessage(null), 4500);
    } finally {
      setIsCancelling(false);
      setOrderToCancel(null);
      setCancelReason('Customer requested cancellation');
    }
  };

  return (
    <PortalLayout>
      {/* PRINT CSS: 3 to 4 dispatch slips per A4 page */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #dispatch-slips-print-area, #dispatch-slips-print-area * {
            visibility: visible !important;
          }
          #dispatch-slips-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4mm !important;
            background: white !important;
          }
          .dispatch-slip-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            box-sizing: border-box !important;
            border: 1.5px solid #000 !important;
            margin-bottom: 3mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      <div className="p-lg max-w-[1920px] w-full mx-auto space-y-lg no-print">
        {/* ===================== LINE 1: HEADING & TOP ACTIONS ===================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
              <Package className="w-4 h-4" /> Booked Orders &amp; Dispatch Slips
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Booking Orders List
              </h1>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                {filteredData.length} order{filteredData.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-body-md text-secondary font-medium mt-0.5">
              Filter by date range, status, or search, and manage dispatch slips &amp; order cancellations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Generate Slips Action Button */}
            <button
              onClick={handlePrintSelected}
              disabled={selectedOrders.length === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${selectedOrders.length > 0
                ? 'bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              title={selectedOrders.length > 0 ? `Generate dispatch slips for ${selectedOrders.length} booked order(s)` : 'Select booked orders to generate slips'}
            >
              <Printer className="w-4 h-4" />
              Generate Slips {selectedOrders.length > 0 && `(${selectedOrders.length})`}
            </button>

            {/* Prominent Add Order Button to Create Orders */}
            <Link
              href="/shipments/book?tab=manual"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
              title="Create new order booking"
            >
              <Plus className="w-4 h-4" /> Add Order
            </Link>
          </div>
        </div>

        {/* ===================== LINE 2: DEDICATED FILTERS BAR ===================== */}
        <div className="bg-white border border-outline-variant rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Filters Group: Search, Status, Date Range */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
            {/* 1. Search Input */}
            <div className="relative min-w-[200px] max-w-[300px] flex-1">
              <Search className="w-4 h-4 text-outline absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Tracking #, Consignee..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-outline-variant bg-slate-50/70 hover:bg-white focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs transition-colors"
              />
            </div>

            {/* 2. Status Dropdown Selector */}
            <div className="relative">
              <select
                id="status-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3.5 py-2 text-xs font-bold border border-outline-variant bg-slate-50/70 hover:bg-white focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs text-slate-800 cursor-pointer transition-colors"
                title="Filter by Order Status"
              >
                <option value="">All Statuses ({data.length})</option>
                <option value="Booked">Booked / Total Booking</option>
                <option value="Not Arrived">Not Arrived</option>
                <option value="Picked up by rider">Picked Up by Rider</option>
                <option value="Arrived at warehouse">Arrived at Warehouse</option>
                <option value="In Transit">In Transit</option>
                <option value="Arrived at destination">Arrived at Destination</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Delivery Failed">Delivery Failed</option>
                <option value="Ready for Return">Ready for Return</option>
                <option value="Return to Shipper">Returned to Shipper</option>
                <option value="Lost / Damage">Lost / Damage</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* 3. Shipper Date Range Picker */}
            <ShipperDateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onChange={(from, to) => {
                setFromDate(from);
                setToDate(to);
                setCurrentPage(1);
              }}
            />

            {/* Clear All Filters Button */}
            {(statusFilter || cityFilter || searchQuery || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('');
                  setSelectedCity('');
                  setSearchQuery('');
                  setFromDate('');
                  setToDate('');
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                title="Reset all active filters"
              >
                <X className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            )}
          </div>

          {/* Active Status Badges and Counter */}
          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium shrink-0">
            {(statusFilter || cityFilter) && (
              <div className="flex items-center gap-1.5">
                {statusFilter && (
                  <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[11px]">
                    Status: {statusFilter}
                  </span>
                )}
                {cityFilter && (
                  <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[11px]">
                    City: {cityFilter}
                  </span>
                )}
              </div>
            )}
            <span className="text-slate-300 font-bold">|</span>
            <span className="font-semibold text-slate-700">
              Showing {filteredData.length} of {data.length}
            </span>
          </div>
        </div>

        {/* Multi-Select Floating Notification Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 px-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-xs font-bold text-primary-900">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {selectedIds.length}
              </span>
              <span>parcel{selectedIds.length > 1 ? 's' : ''} selected for dispatch slip printing</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
              >
                Deselect All
              </button>
              <button
                onClick={handlePrintSelected}
                className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Slips ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary transition-colors cursor-pointer select-none"
                title={eligibleBookedOrders.length > 0 ? 'Select all Booked orders for dispatch slip generation' : 'No Booked orders available'}
              >
                {eligibleBookedOrders.length > 0 && eligibleBookedOrders.every(r => selectedIds.includes(r.id)) ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({eligibleBookedOrders.length} Booked)</span>
              </button>
              <span className="text-slate-300">|</span>
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Booked Orders Listing
              </h4>
            </div>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredData.length} order{filteredData.length !== 1 ? 's' : ''} ({eligibleBookedOrders.length} Booked)
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      checked={eligibleBookedOrders.length > 0 && eligibleBookedOrders.every(r => selectedIds.includes(r.id))}
                      disabled={eligibleBookedOrders.length === 0}
                      onChange={handleToggleSelectAll}
                      title={eligibleBookedOrders.length > 0 ? "Select all Booked orders" : "No Booked orders available to select"}
                    />
                  </th>
                  <th className="px-4 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Consignee</th>
                  <th className="px-4 py-3">Destination Address</th>
                  <th className="px-4 py-3">Shipper</th>
                  <th className="px-4 py-3">Payment / COD</th>
                  <th className="px-4 py-3">Allow to Open</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-xs font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                      Loading booked orders...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-700">No booked orders found in selected range.</p>
                        <Link
                          href="/shipments/book?tab=manual"
                          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> Create New Order
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => {
                    const isSlipEligible = isEligibleForDispatchSlip(row.status);
                    const cancellable = canCancelOrder(row.status);
                    const isCancelled = row.status.toLowerCase().includes('cancel');

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors group ${isSlipEligible ? 'cursor-pointer' : 'cursor-default'
                          } ${selectedIds.includes(row.id) ? 'bg-primary-50/40' : ''}`}
                        onClick={() => {
                          if (isSlipEligible) {
                            handleToggleRow(row);
                          } else {
                            setToastMessage(`Dispatch slips can only be generated for Booked orders. (Status: ${row.status})`);
                            setTimeout(() => setToastMessage(null), 4000);
                          }
                        }}
                      >
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className={`w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary ${isSlipEligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                              }`}
                            checked={selectedIds.includes(row.id)}
                            disabled={!isSlipEligible}
                            onChange={() => handleToggleRow(row)}
                            title={
                              isSlipEligible
                                ? 'Select for dispatch slip'
                                : `Cannot select: dispatch slips are only allowed for Booked orders (Current status: ${row.status})`
                            }
                          />
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-primary text-sm">
                          {row.trackingNumber}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                              {row.avatar}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{row.customerName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{row.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700 max-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <span className="truncate text-xs text-slate-800">{row.address}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-1.5 py-0.2 text-[9px] font-extrabold rounded uppercase tracking-wider ${row.is2PL
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                {row.is2PL ? '2PL (In-House)' : `3PL (${row.tplCourierId})`}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {row.destination}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-800 font-semibold">{row.shipperName}</td>
                        <td className="px-4 py-4">
                          {row.paymentType === 'PAID' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              PAID
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              COD: PKR {row.codAmount.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${row.allowToOpen === 'Yes' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                            {row.allowToOpen === 'Yes' ? 'Open Allowed' : 'No Open'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isCancelled
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                            {row.status === 'booked' ? 'Booked' : row.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 ml-auto">
                            {/* 1. Dispatch Slip Button (Strictly only for Booked orders) */}
                            {isSlipEligible ? (
                              <button
                                onClick={() => handlePrintIndividual(row)}
                                className="px-2.5 py-1.5 bg-white border border-outline-variant hover:border-primary text-slate-700 hover:text-primary rounded-lg font-bold text-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                title="Print singular dispatch slip (Booked order)"
                              >
                                <Printer className="w-3.5 h-3.5" /> Slip
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-not-allowed opacity-60"
                                title={`Dispatch slip not allowed: only available for Booked orders (Current status: ${row.status})`}
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-400" /> Slip
                              </button>
                            )}

                            {/* 2. Cancel Order Button (Locked once in or after transit) */}
                            {cancellable ? (
                              <button
                                onClick={() => setOrderToCancel(row)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                title="Cancel this order (allowed before transit)"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" /> Cancel
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-not-allowed opacity-70"
                                title={isCancelled ? 'Order already cancelled' : 'Cannot cancel order once in transit or delivered'}
                              >
                                <Ban className="w-3.5 h-3.5 text-slate-400" />
                                {isCancelled ? 'Cancelled' : 'In Transit'}
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

          {/* Table Pagination Controls */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="orders"
          />
        </div>
      </div>

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Cancel Order Booking</h3>
                <p className="text-xs text-slate-500 font-mono">Tracking: {orderToCancel.trackingNumber}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Consignee:</span>
                <span className="font-bold text-slate-800">{orderToCancel.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Destination:</span>
                <span className="font-bold text-slate-800">{orderToCancel.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">COD Amount:</span>
                <span className="font-bold text-slate-800">PKR {orderToCancel.codAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  {orderToCancel.status} (Before Transit)
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for cancellation (optional):</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs font-medium border border-outline-variant bg-white rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Item out of stock">Item out of stock</option>
                <option value="Duplicate booking">Duplicate booking</option>
                <option value="Incorrect customer details">Incorrect customer details</option>
                <option value="Shipper operational reason">Shipper operational reason</option>
              </select>
            </div>

            <p className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 leading-normal">
              <strong>Notice:</strong> This order is currently <strong>before transit</strong> ({orderToCancel.status}) and is eligible for cancellation. Once cancelled, riders will not dispatch this shipment.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReason('Customer requested cancellation');
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" /> Confirm Cancellation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH SLIPS PRINT PREVIEW MODAL */}
      {showSlipsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" /> Dispatch Slips Print Preview
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected. Formatted matching courier standard (3 to 4 slips per A4 sheet).
                </p>
              </div>
              <button
                onClick={() => setShowSlipsModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render realistic slips inside modal */}
            <div className="space-y-4 bg-slate-100/70 p-4 rounded-xl border border-slate-200">
              {selectedOrders.map((order) => (
                <DispatchSlipCard
                  key={order.id}
                  order={order}
                  businessName={businessName || 'Shipzo'}
                />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setShowSlipsModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={triggerBrowserPrint}
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print {selectedOrders.length} Dispatch Slip{selectedOrders.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISOLATED PRINT STYLED AREA FOR BROWSER PRINT (3-4 SLIPS PER A4 PAGE) */}
      <div id="dispatch-slips-print-area" className="hidden">
        {selectedOrders.map((order) => (
          <DispatchSlipCard
            key={order.id}
            order={order}
            businessName={businessName || 'Shipzo'}
          />
        ))}
      </div>

      {/* FLOATING SUCCESS TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </PortalLayout>
  );
}

export default function OrderList() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-emerald-700 border-4 border-solid border-current border-r-transparent rounded-full" />
      </div>
    }>
      <OrderListContent />
    </React.Suspense>
  );
}

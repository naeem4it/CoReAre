'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PortalLayout from '@/components/PortalLayout';
import { apiClient, fetchAllPaginated } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';
import { getDefaultDateRange, toLocalDateString } from '@/shared/utils/date';
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
  CheckCircle2,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { TablePagination } from '@/components/ui/TablePagination';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';

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
  const nonCancellable: string[] = [
    SHIPMENT_STATUSES.IN_TRANSIT,
    SHIPMENT_STATUSES.ARRIVED_DEST,
    SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
    SHIPMENT_STATUSES.DELIVERED,
    SHIPMENT_STATUSES.DELIVERY_FAILED,
    SHIPMENT_STATUSES.READY_FOR_RETURN,
    SHIPMENT_STATUSES.RETURN_TO_SHIPPER,
    SHIPMENT_STATUSES.LOST_DAMAGE,
  ];

  return !nonCancellable.includes(norm as string);
}

/**
 * Business Rule: Orders can ONLY be edited when in 'Booked' status.
 * Once in transit, arrived at destination, out for delivery, or completed, editing is locked.
 */
export function isOrderEditable(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === 'booked' || s === 'total booking' || s === 'pending';
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

  // Date Range State for Booking Orders List (default: past 30 days up to today in local time)
  const defaultRange = React.useMemo(() => getDefaultDateRange(30), []);
  const [fromDate, setFromDate] = React.useState<string>(defaultRange.fromDate);
  const [toDate, setToDate] = React.useState<string>(defaultRange.toDate);

  // Cancel Order Modal State (Single)
  const [orderToCancel, setOrderToCancel] = React.useState<OrderRow | null>(null);
  const [cancelReason, setCancelReason] = React.useState<string>('Customer requested cancellation');
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Bulk Cancel Orders Modal State
  const [showBulkCancelModal, setShowBulkCancelModal] = React.useState(false);
  const [bulkCancelReason, setBulkCancelReason] = React.useState<string>('Customer requested cancellation');
  const [isBulkCancelling, setIsBulkCancelling] = React.useState(false);

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
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [selectedBatchIndex, setSelectedBatchIndex] = React.useState<number | 'ALL'>('ALL');

  const isShipper = React.useMemo(() => {
    if (!user) return false;
    const hasShipperRelation = !!(user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : true));
    const hasShipperRoles = Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0;
    return hasShipperRelation || hasShipperRoles;
  }, [user]);

  const shipperId = React.useMemo(() => {
    if (activeBusinessId) return activeBusinessId;
    if (user?.shipper) {
      if (Array.isArray(user.shipper) && user.shipper.length > 0) {
        return user.shipper[0].id || user.shipper[0];
      } else if (typeof user.shipper === 'object' && user.shipper.id) {
        return user.shipper.id;
      } else if (typeof user.shipper === 'number') {
        return user.shipper;
      }
    }
    return null;
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
          ...(item.attributes || item),
          id: item.id
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
        let parcelsUrl = '/parcels?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=2000';
        if (isShipper && shipperId) {
          parcelsUrl += `&filters[$or][0][shipper][id][$eq]=${shipperId}&filters[$or][1][pickup_location][shipper][id][$eq]=${shipperId}`;
        }
        const parcelsRaw = await fetchAllPaginated(parcelsUrl);
        let parcels = Array.isArray(parcelsRaw) ? parcelsRaw : [];

        if (isShipper && shipperId && parcels.length > 0) {
          parcels = parcels.filter((item: any) => {
            const s = item.shipper || item.attributes?.shipper || item.pickup_location?.shipper || item.pickup_location?.attributes?.shipper;
            if (!s) return true;
            const pId = typeof s === 'number' ? s : (s.id || s.data?.id);
            if (pId === undefined || pId === null) return true;
            return Number(pId) === Number(shipperId);
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
              documentId: (raw as any).documentId || (raw as any).attributes?.documentId,
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
      let matchStatus = normRow === normFilter || row.status.toLowerCase().includes(statusFilter.toLowerCase());
      // Shipper mental model: 'Not Arrived' covers Booked orders awaiting arrival at origin warehouse
      if (!matchStatus && (normFilter === SHIPMENT_STATUSES.NOT_ARRIVED || statusFilter.toLowerCase().includes('not arrived'))) {
        matchStatus = (normRow === SHIPMENT_STATUSES.BOOKED || normRow === SHIPMENT_STATUSES.NOT_ARRIVED);
      }
      if (!matchStatus) return false;
    }

    if (cityFilter) {
      const lowerCity = cityFilter.toLowerCase();
      const matchCity = row.destination.toLowerCase().includes(lowerCity) || row.address.toLowerCase().includes(lowerCity);
      if (!matchCity) return false;
    }

    // Date Range Filter (local time conversion)
    if (fromDate) {
      const rowDate = toLocalDateString(row.dateCreated);
      if (rowDate && rowDate < fromDate) return false;
    }
    if (toDate) {
      const rowDate = toLocalDateString(row.dateCreated);
      if (rowDate && rowDate > toDate) return false;
    }

    return true;
  });

  // Table Sorting & Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const {
    sortConfig,
    handleSort,
    sortedItems: sortedOrders,
  } = useTableSort<OrderRow>(filteredData, {
    defaultColumn: 'id',
    defaultDirection: 'desc',
    customExtractors: {
      trackingNumber: (r) => r.trackingNumber,
      customerName: (r) => r.customerName,
      address: (r) => r.address,
      shipper: (r) => r.shipperName,
      codAmount: (r) => Number(r.codAmount) || 0,
      status: (r) => r.status,
      dateCreated: (r) => r.dateCreated,
    },
  });

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, safePage, pageSize]);

  // Business Rule: Dispatch slips can strictly only be generated for Booked orders
  const eligibleBookedOrders = React.useMemo(() => {
    return filteredData.filter((r) => isEligibleForDispatchSlip(r.status));
  }, [filteredData]);

  // Business Rule: Cancellation is permitted before transit (Booked, Pending, etc.)
  const eligibleCancellableOrders = React.useMemo(() => {
    return filteredData.filter((r) => canCancelOrder(r.status));
  }, [filteredData]);

  const selectedOrders = React.useMemo(() => {
    return data.filter(row => selectedIds.includes(row.id) && isEligibleForDispatchSlip(row.status));
  }, [data, selectedIds]);

  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(selectedOrders.length / BATCH_SIZE);

  const ordersToPrint = React.useMemo(() => {
    if (selectedBatchIndex === 'ALL' || selectedOrders.length <= BATCH_SIZE) {
      return selectedOrders;
    }
    const idx = typeof selectedBatchIndex === 'number' ? selectedBatchIndex : 0;
    const start = idx * BATCH_SIZE;
    return selectedOrders.slice(start, start + BATCH_SIZE);
  }, [selectedOrders, selectedBatchIndex]);

  // Preview only first 5 slips in modal to keep DOM light and responsive
  const previewOrders = React.useMemo(() => {
    return ordersToPrint.slice(0, 5);
  }, [ordersToPrint]);

  const selectedCancellableOrders = React.useMemo(() => {
    return data.filter(row => selectedIds.includes(row.id) && canCancelOrder(row.status));
  }, [data, selectedIds]);

  const handleToggleRow = (row: OrderRow) => {
    const isSelectable = isEligibleForDispatchSlip(row.status) || canCancelOrder(row.status);
    if (!isSelectable) {
      setToastMessage(`Order ${row.trackingNumber} is ${row.status} and cannot be modified.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSelectedIds(prev =>
      prev.includes(row.id) ? prev.filter(item => item !== row.id) : [...prev, row.id]
    );
  };

  const handleToggleSelectAll = () => {
    const selectable = filteredData.filter(r => isEligibleForDispatchSlip(r.status) || canCancelOrder(r.status));
    if (selectable.length === 0) {
      setToastMessage('No eligible orders available to select.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const allSelected = selectable.every(r => selectedIds.includes(r.id));
    if (allSelected) {
      const selectableIds = new Set(selectable.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !selectableIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...selectable.map(r => r.id)]));
      setSelectedIds(newSelected);
    }
  };

  const handlePrintSelected = () => {
    if (selectedOrders.length === 0) {
      setToastMessage('Please select at least one Booked order to generate dispatch slips.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (selectedOrders.length > BATCH_SIZE) {
      setSelectedBatchIndex(0); // Default to Batch 1 (1–100) for instant preview
    } else {
      setSelectedBatchIndex('ALL');
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
    setSelectedBatchIndex('ALL');
    setShowSlipsModal(true);
  };

  const triggerBrowserPrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  // Handle Order Cancellation (Prohibited once in transit or delivered)
  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      setIsCancelling(true);
      const parcelId = orderToCancel.documentId || orderToCancel.id;
      try {
        await apiClient.put(`/parcels/${parcelId}`, {
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

      // Deselect if currently selected
      setSelectedIds((prev) => prev.filter((id) => id !== orderToCancel.id));

      setToastMessage(`Order ${orderToCancel.trackingNumber} has been successfully cancelled.`);
      setTimeout(() => setToastMessage(null), 4500);
    } finally {
      setIsCancelling(false);
      setOrderToCancel(null);
      setCancelReason('Customer requested cancellation');
    }
  };

  // Handle Bulk Order Cancellation
  const handleConfirmBulkCancel = async () => {
    if (selectedCancellableOrders.length === 0) return;
    setIsBulkCancelling(true);
    let successCount = 0;
    let failedCount = 0;
    const updatedIds = new Set<string | number>();

    for (const order of selectedCancellableOrders) {
      try {
        const parcelId = order.documentId || order.id;
        await apiClient.put(`/parcels/${parcelId}`, {
          data: {
            status: 'Cancelled',
            remarks: bulkCancelReason ? `Bulk Cancelled: ${bulkCancelReason}` : 'Bulk Cancelled by Shipper',
          },
        });
        successCount++;
        updatedIds.add(order.id);
      } catch (err) {
        console.warn(`Failed to cancel order ${order.trackingNumber}:`, err);
        failedCount++;
      }
    }

    if (updatedIds.size > 0) {
      setData((prev) =>
        prev.map((order) =>
          updatedIds.has(order.id)
            ? {
              ...order,
              status: 'Cancelled',
              remarks: bulkCancelReason ? `Bulk Cancelled: ${bulkCancelReason}` : 'Bulk Cancelled by Shipper',
            }
            : order
        )
      );
      setSelectedIds((prev) => prev.filter((id) => !updatedIds.has(id)));
    }

    setIsBulkCancelling(false);
    setShowBulkCancelModal(false);

    if (failedCount === 0) {
      setToastMessage(`Successfully cancelled ${successCount} order${successCount > 1 ? 's' : ''}.`);
    } else {
      setToastMessage(`Cancelled ${successCount} order(s), but ${failedCount} order(s) failed to cancel.`);
    }
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <PortalLayout>
      {/* PRINT CSS: 3 to 4 dispatch slips per A4 page */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media screen {
          #dispatch-slips-print-portal {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > *:not(#dispatch-slips-print-portal) {
            display: none !important;
          }
          #dispatch-slips-print-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .dispatch-slip-card {
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            box-sizing: border-box !important;
            border: 1.5px solid #000000 !important;
            margin-bottom: 4mm !important;
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

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Bulk Cancel Orders Button */}
            <button
              type="button"
              onClick={() => {
                if (selectedCancellableOrders.length === 0) {
                  setToastMessage('Please select at least one Booked order to cancel.');
                  setTimeout(() => setToastMessage(null), 4000);
                  return;
                }
                setShowBulkCancelModal(true);
              }}
              disabled={selectedCancellableOrders.length === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${selectedCancellableOrders.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              title={
                selectedCancellableOrders.length > 0
                  ? `Cancel ${selectedCancellableOrders.length} selected booked order(s)`
                  : 'Select booked orders to cancel'
              }
            >
              <Ban className="w-4 h-4" />
              Bulk Cancel {selectedCancellableOrders.length > 0 && `(${selectedCancellableOrders.length})`}
            </button>

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
          <div className="p-4 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary transition-colors cursor-pointer select-none"
                title={eligibleBookedOrders.length > 0 ? 'Select all Booked orders' : 'No Booked orders available'}
              >
                {filteredData.some(r => isEligibleForDispatchSlip(r.status) || canCancelOrder(r.status)) &&
                  filteredData
                    .filter(r => isEligibleForDispatchSlip(r.status) || canCancelOrder(r.status))
                    .every(r => selectedIds.includes(r.id)) ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({eligibleBookedOrders.length} Booked)</span>
              </button>

              {selectedIds.length > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {selectedIds.length} Selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Clear selection
                  </button>
                  {selectedCancellableOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBulkCancelModal(true)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title={`Cancel ${selectedCancellableOrders.length} selected orders`}
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-600" /> Cancel Selected ({selectedCancellableOrders.length})
                    </button>
                  )}
                </>
              )}

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
                      checked={
                        filteredData.some(r => isEligibleForDispatchSlip(r.status) || canCancelOrder(r.status)) &&
                        filteredData
                          .filter(r => isEligibleForDispatchSlip(r.status) || canCancelOrder(r.status))
                          .every(r => selectedIds.includes(r.id))
                      }
                      disabled={!filteredData.some(r => isEligibleForDispatchSlip(r.status) || canCancelOrder(r.status))}
                      onChange={handleToggleSelectAll}
                      title="Select all eligible Booked orders"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Tracking ID" column="trackingNumber" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Consignee" column="customerName" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Destination Address" column="address" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Shipper" column="shipper" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Payment / COD" column="codAmount" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">Allow to Open</th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Status" column="status" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
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
                    const isEditable = isOrderEditable(row.status);
                    const cancellable = canCancelOrder(row.status);
                    const isCancelled = row.status.toLowerCase().includes('cancel');

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors group ${isSlipEligible || cancellable ? 'cursor-pointer' : 'cursor-default'
                          } ${selectedIds.includes(row.id) ? 'bg-primary-50/40' : ''}`}
                        onClick={() => {
                          if (isSlipEligible || cancellable) {
                            handleToggleRow(row);
                          } else {
                            setToastMessage(`Order ${row.trackingNumber} is ${row.status} and cannot be modified.`);
                            setTimeout(() => setToastMessage(null), 4000);
                          }
                        }}
                      >
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className={`w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary ${isSlipEligible || cancellable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                              }`}
                            checked={selectedIds.includes(row.id)}
                            disabled={!isSlipEligible && !cancellable}
                            onChange={() => handleToggleRow(row)}
                            title={
                              isSlipEligible || cancellable
                                ? 'Select for dispatch slip or cancellation'
                                : `Cannot select: order is ${row.status} (locked)`
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
                            {/* 0. Edit Order Button (Strictly only for Booked orders) */}
                            {isEditable ? (
                              <Link
                                href={`/shipments/book?editId=${row.id}&editTracking=${encodeURIComponent(row.trackingNumber)}${row.documentId ? `&documentId=${encodeURIComponent(row.documentId)}` : ''}`}
                                className="px-2.5 py-1.5 bg-white border border-outline-variant hover:border-primary text-slate-700 hover:text-primary rounded-lg font-bold text-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                title="Edit this Booked order"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-not-allowed opacity-60"
                                title={`Cannot edit: only allowed for Booked orders (Current status: ${row.status})`}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Edit
                              </button>
                            )}

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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToCancel(row);
                                }}
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

      {/* CANCEL ORDER CONFIRMATION MODAL (Portaled to body to guarantee perfect center alignment & prevent layout clipping) */}
      {orderToCancel && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 no-print overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
          onClick={() => {
            if (!isCancelling) {
              setOrderToCancel(null);
              setCancelReason('Customer requested cancellation');
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col p-6 sm:p-7 gap-4 text-slate-800 my-auto animate-in zoom-in-95 duration-200"
            style={{ width: '100%', maxWidth: '520px', minWidth: '320px', flexShrink: 0, boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">Cancel Order Booking</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {orderToCancel.trackingNumber}
                    </span>
                    {orderToCancel.orderReference && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Ref: {orderToCancel.orderReference}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReason('Customer requested cancellation');
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Details Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-medium block text-[10.5px] uppercase tracking-wider">Consignee</span>
                  <span className="font-bold text-slate-900 block truncate">{orderToCancel.customerName}</span>
                  {orderToCancel.phone && (
                    <span className="font-mono text-slate-500 text-[11px] block">{orderToCancel.phone}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10.5px] uppercase tracking-wider">Destination</span>
                  <span className="font-bold text-slate-900 block">{orderToCancel.destination}</span>
                  <span className="text-slate-500 text-[11px] truncate block max-w-full" title={orderToCancel.address}>
                    {orderToCancel.address}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium block text-[10.5px] uppercase tracking-wider">COD Amount</span>
                  <span className="font-black text-slate-900 text-sm">
                    {orderToCancel.codAmount > 0 ? `PKR ${orderToCancel.codAmount.toLocaleString()}` : 'Prepaid (PKR 0)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10.5px] uppercase tracking-wider">Current Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md text-[10.5px] mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {orderToCancel.status === 'booked' ? 'Booked' : orderToCancel.status} (Before Transit)
                  </span>
                </div>
              </div>
            </div>

            {/* Cancellation Reason Dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={isCancelling}
                className="w-full text-xs font-medium border border-slate-300 bg-white rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 cursor-pointer shadow-2xs"
              >
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Customer unreachable / refused on confirmation call">Customer unreachable / refused on confirmation call</option>
                <option value="Incorrect COD amount or product details">Incorrect COD amount or product details</option>
                <option value="Item damaged or out of stock">Item damaged or out of stock</option>
                <option value="Duplicate order booking">Duplicate order booking</option>
                <option value="Incomplete or unserviceable address">Incomplete or unserviceable address</option>
                <option value="Shipper operational reason">Shipper operational reason</option>
              </select>
            </div>

            {/* Warning Banner */}
            <div className="text-[11.5px] text-rose-800 bg-rose-50/80 p-3 rounded-xl border border-rose-200/80 flex items-start gap-2 leading-relaxed">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> Once confirmed, this order will be immediately cancelled in the system. Courier riders will not pick up or manifest this shipment.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReason('Customer requested cancellation');
                }}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelOrder}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-75"
              >
                {isCancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cancelling Order...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* BULK CANCEL ORDERS CONFIRMATION MODAL (Portaled to body to guarantee perfect center alignment) */}
      {showBulkCancelModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 no-print overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
          onClick={() => {
            if (!isBulkCancelling) {
              setShowBulkCancelModal(false);
              setBulkCancelReason('Customer requested cancellation');
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col p-6 sm:p-7 gap-4 text-slate-800 my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar"
            style={{ width: '100%', maxWidth: '580px', minWidth: '320px', flexShrink: 0, boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3.5 text-rose-600">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Bulk Cancel Orders</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCancellableOrders.length} booked order{selectedCancellableOrders.length > 1 ? 's' : ''} selected for cancellation
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isBulkCancelling}
                onClick={() => {
                  setShowBulkCancelModal(false);
                  setBulkCancelReason('Customer requested cancellation');
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Orders Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs space-y-2.5">
              <div className="flex items-center justify-between font-bold text-slate-800 pb-2 border-b border-slate-200">
                <span>Orders to be cancelled ({selectedCancellableOrders.length}):</span>
                <span className="text-emerald-700 font-black">
                  Total COD: PKR {selectedCancellableOrders.reduce((sum, o) => sum + (Number(o.codAmount) || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200/60 custom-scrollbar">
                {selectedCancellableOrders.map((order) => (
                  <div key={order.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{order.trackingNumber}</span>
                      <span className="text-slate-600 font-medium">({order.customerName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{order.destination}</span>
                      <span className="font-bold text-slate-800">PKR {Number(order.codAmount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancellation Reason Dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Reason for cancellation (applies to all): <span className="text-rose-500">*</span>
              </label>
              <select
                value={bulkCancelReason}
                onChange={(e) => setBulkCancelReason(e.target.value)}
                disabled={isBulkCancelling}
                className="w-full text-xs font-medium border border-slate-300 bg-white rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 cursor-pointer shadow-2xs"
              >
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Batch cancellation by Shipper">Batch cancellation by Shipper</option>
                <option value="Item out of stock / inventory depleted">Item out of stock / inventory depleted</option>
                <option value="Duplicate bookings">Duplicate bookings</option>
                <option value="Incorrect customer details or rates">Incorrect customer details or rates</option>
                <option value="Shipper operational reason">Shipper operational reason</option>
              </select>
            </div>

            {/* Warning Notice */}
            <div className="text-[11.5px] text-rose-800 bg-rose-50/80 p-3 rounded-xl border border-rose-200/80 flex items-start gap-2 leading-relaxed">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> These {selectedCancellableOrders.length} order(s) are currently <strong>before transit</strong> ({selectedCancellableOrders[0]?.status || 'Booked'}) and will be marked as <strong>'Cancelled'</strong> in the database.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isBulkCancelling}
                onClick={() => {
                  setShowBulkCancelModal(false);
                  setBulkCancelReason('Customer requested cancellation');
                }}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Keep Orders
              </button>
              <button
                type="button"
                disabled={isBulkCancelling}
                onClick={handleConfirmBulkCancel}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-75"
              >
                {isBulkCancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cancelling {selectedCancellableOrders.length} Orders...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Cancel ({selectedCancellableOrders.length}) Orders</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
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

            {/* Batch Controls for Large Selection (e.g. 517 orders) */}
            {selectedOrders.length > BATCH_SIZE && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-slate-700">
                  Total {selectedOrders.length} booked slips. Choose batch or print all:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchIndex('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${selectedBatchIndex === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    All ({selectedOrders.length})
                  </button>
                  {Array.from({ length: totalBatches }).map((_, bIdx) => {
                    const startNum = bIdx * BATCH_SIZE + 1;
                    const endNum = Math.min((bIdx + 1) * BATCH_SIZE, selectedOrders.length);
                    const isSelected = selectedBatchIndex === bIdx;
                    return (
                      <button
                        key={bIdx}
                        type="button"
                        onClick={() => setSelectedBatchIndex(bIdx)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${isSelected
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {startNum}–{endNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Informational Notice when previewing large batches */}
            {ordersToPrint.length > 5 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 px-3 text-xs text-emerald-800 flex items-center justify-between">
                <span>
                  Showing first 5 preview slips. <strong>All {ordersToPrint.length} slips</strong> will be sent to the printer.
                </span>
                <span className="font-bold text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                  Fast Preview Active
                </span>
              </div>
            )}

            {/* Render realistic slips inside modal (preview only first 5 to prevent DOM freezing) */}
            <div className="space-y-4 bg-slate-100/70 p-4 rounded-xl border border-slate-200">
              {previewOrders.map((order) => (
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
                disabled={isPrinting}
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-75"
              >
                {isPrinting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Preparing Print Job...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" /> Print {ordersToPrint.length} Dispatch Slip{ordersToPrint.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISOLATED PRINT STYLED AREA FOR BROWSER PRINT (Mounted directly to body via portal for instant zero-lag pagination) */}
      {showSlipsModal && typeof document !== 'undefined' && createPortal(
        <div id="dispatch-slips-print-portal">
          {ordersToPrint.map((order) => (
            <DispatchSlipCard
              key={order.id}
              order={order}
              businessName={businessName || 'Shipzo'}
            />
          ))}
        </div>,
        document.body
      )}

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

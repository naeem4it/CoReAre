'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PortalLayout from '@/components/PortalLayout';
import { apiClient, fetchAllPaginated } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { getDefaultDateRange, toLocalDateString } from '@/shared/utils/date';
import { ShipperDateRangePicker } from '@/features/shipper/ui/ShipperDateRangePicker';
import {
  DispatchSlipCard,
  OrderRow,
  isEligibleForDispatchSlip
} from '@/features/shipper/ui/DispatchSlipCard';
import {
  Printer,
  Search,
  X,
  Package,
  Plus,
  CheckSquare,
  Square,
  AlertTriangle,
  FileText,
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

interface RawParcelRecord {
  id: number | string;
  tracking_number: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  destination_city?: { CityName?: string; name?: string };
  source_city?: { CityName?: string; name?: string };
  allow_open?: boolean | string;
  allow_to_open?: string;
  product_description?: string;
  remarks?: string;
  special_instructions?: string;
  parcel_detail?: string;
  reference_number?: string;
  shipper?: { id?: number; name?: string; address?: string; phone?: string; mobile_number?: string };
  pickup_location?: {
    id?: number;
    address?: string;
    phone?: string;
    shipper?: { id?: number; name?: string; address?: string; phone?: string; mobile_number?: string };
  };
  pieces?: number | string;
  weight?: number;
  cod_amount?: number | string;
  payment_type?: string;
  status?: string;
  is_2pl?: boolean;
  courier?: { name?: string };
  createdAt?: string;
}

interface TenantSetupItem {
  id: number;
  cities?: string[] | string;
  attributes?: {
    cities?: string[] | string;
  };
}

interface CourierPartnerItem {
  id: number;
  name?: string;
  is_preferred?: boolean;
  attributes?: {
    name?: string;
    is_preferred?: boolean;
  };
}

function AirwayBillContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get('search') || '';

  const { user, activeBusinessId } = useAuth();
  const { businessName } = useTenant();

  const [data, setData] = React.useState<OrderRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState(urlSearch);
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [selectedRouting, setSelectedRouting] = React.useState<'ALL' | '2PL' | '3PL'>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'BOOKED_ONLY'>('BOOKED_ONLY');
  const [isLoading, setIsLoading] = React.useState(true);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Date Range State for Airway Bills (default: past 30 days up to today in local time)
  const defaultRange = React.useMemo(() => getDefaultDateRange(30), []);
  const [fromDate, setFromDate] = React.useState<string>(defaultRange.fromDate);
  const [toDate, setToDate] = React.useState<string>(defaultRange.toDate);

  // Tenant 2PL self-service cities & 3PL partner state
  const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null);
  const [selfServiceCities, setSelfServiceCities] = React.useState<string[]>([]);
  const [courierTplPartners, setCourierTplPartners] = React.useState<Array<{ id: number; name?: string; is_preferred?: boolean }>>([]);

  // Multi-Selection State (Stores IDs of orders selected for AWB dispatch slips)
  const [selectedIds, setSelectedIds] = React.useState<(number | string)[]>([]);

  // Dispatch Slips Print Preview Modal
  const [showSlipsModal, setShowSlipsModal] = React.useState(false);

  const isShipper = React.useMemo(() => {
    if (!user) return false;
    const hasShipperRelation = !!(user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : true));
    const hasShipperRoles = Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0;
    return hasShipperRelation || hasShipperRoles;
  }, [user]);

  const shipperId = React.useMemo(() => {
    if (activeBusinessId) return activeBusinessId;
    if (user?.shipper) {
      if (Array.isArray(user.shipper) && user.shipper.length > 0) return user.shipper[0].id || user.shipper[0];
      if (typeof user.shipper === 'object' && 'id' in user.shipper) {
        return (user.shipper as { id?: number }).id || null;
      }
      if (typeof user.shipper === 'number') return user.shipper;
    }
    return null;
  }, [user, activeBusinessId]);

  // Fetch Tenant routing setups
  React.useEffect(() => {
    let isMounted = true;
    if (!tenantId) return;

    apiClient.get<{ data?: TenantSetupItem[] }>(`/tenant-2pl-setups?filters[tenant][id][$eq]=${tenantId}&populate=*`)
      .then((res) => {
        if (!isMounted) return;
        const setups = res.data?.data || [];
        const cities: string[] = [];
        setups.forEach((setup) => {
          const rawCities = setup.cities || setup.attributes?.cities;
          if (Array.isArray(rawCities)) {
            cities.push(...rawCities);
          } else if (typeof rawCities === 'string') {
            cities.push(...rawCities.split(',').map((c: string) => c.trim()).filter(Boolean));
          }
        });
        setSelfServiceCities(cities);
      })
      .catch((err: unknown) => console.warn('Could not load 2PL self service cities:', err));

    apiClient.get<{ data?: CourierPartnerItem[] }>(`/courier-tpl-partners?filters[tenant][id][$eq]=${tenantId}&populate=*`)
      .then((res) => {
        if (!isMounted) return;
        const partners = res.data?.data || [];
        setCourierTplPartners(partners.map((p) => ({
          id: p.id,
          name: p.name || p.attributes?.name || 'TPL Courier',
          is_preferred: p.is_preferred ?? p.attributes?.is_preferred ?? false,
        })));
      })
      .catch((err: unknown) => console.warn('Could not load courier 3PL partners:', err));

    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  // Load Parcels / Shipments
  React.useEffect(() => {
    let isMounted = true;

    const loadShipments = async () => {
      try {
        let endpoint = '/parcels?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=2000';

        if (isShipper && shipperId) {
          endpoint += `&filters[$or][0][shipper][id][$eq]=${shipperId}&filters[$or][1][pickup_location][shipper][id][$eq]=${shipperId}`;
        }

        const rawData = await fetchAllPaginated(endpoint);
        if (!isMounted) return;

        if (Array.isArray(rawData) && rawData.length > 0) {
          const mapped: OrderRow[] = rawData.map((item) => {
            const raw = ((item as unknown as { attributes?: RawParcelRecord }).attributes
              ? (item as unknown as { attributes: RawParcelRecord }).attributes
              : item) as unknown as RawParcelRecord;

            const destination = extractCityFromAddress(raw.recipient_address || '');
            const origin = extractCityFromAddress(raw.pickup_location?.address || raw.shipper?.address || '');

            const customerName = raw.recipient_name || 'Customer';
            const initials = customerName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'CU';

            const pieces = Number(raw.pieces) || 1;
            const allowToOpen = raw.allow_open || raw.allow_to_open ? 'Yes' : 'No';
            const product = raw.product_description || raw.remarks || 'Standard Parcel';
            const remarks = raw.special_instructions || raw.remarks || 'Handle with care';
            const parcelDetail = raw.parcel_detail || `${pieces} Pc (${raw.weight || 0.5} Kg)`;
            const orderReference = raw.reference_number || `#${raw.id}`;
            const shipperPhone = raw.pickup_location?.phone || raw.shipper?.phone || raw.shipper?.mobile_number || '0300-0000000';

            const createdDate = raw.createdAt ? new Date(raw.createdAt) : new Date();
            const dateFormatted = createdDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            // Accurate 2PL vs 3PL routing determination
            const destLower = destination.toLowerCase().trim();
            const isDestInSelfService = selfServiceCities.some((c) =>
              destLower.includes(c.toLowerCase().trim()) || c.toLowerCase().trim().includes(destLower)
            );
            const is2PL = raw.is_2pl !== undefined ? Boolean(raw.is_2pl) : (selfServiceCities.length > 0 ? isDestInSelfService : false);

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
      } catch (error: unknown) {
        console.warn('Could not fetch orders for Airway Bill:', error);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadShipments();

    return () => {
      isMounted = false;
    };
  }, [isShipper, shipperId, selfServiceCities, courierTplPartners, refreshTrigger]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Destination cities list for filtering
  const availableCities = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      if (r.destination && r.destination !== 'Pakistan') set.add(r.destination);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filter orders by search, date range, routing, city, and status filter
  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      // 1. Search Query
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        const matchSearch = (
          row.trackingNumber.toLowerCase().includes(lower) ||
          row.customerName.toLowerCase().includes(lower) ||
          row.address.toLowerCase().includes(lower) ||
          row.status.toLowerCase().includes(lower) ||
          row.orderReference.toLowerCase().includes(lower) ||
          row.phone.toLowerCase().includes(lower)
        );
        if (!matchSearch) return false;
      }

      // 2. Date Range Filter (local time conversion)
      if (fromDate) {
        const rowDate = toLocalDateString(row.dateCreated);
        if (rowDate && rowDate < fromDate) return false;
      }
      if (toDate) {
        const rowDate = toLocalDateString(row.dateCreated);
        if (rowDate && rowDate > toDate) return false;
      }

      // 3. Routing Filter (2PL vs 3PL)
      if (selectedRouting === '2PL' && !row.is2PL) return false;
      if (selectedRouting === '3PL' && row.is2PL) return false;

      // 4. City Filter
      if (selectedCity) {
        if (row.destination.toLowerCase() !== selectedCity.toLowerCase()) return false;
      }

      // 5. Status Filter: if set to BOOKED_ONLY, only show eligible booked orders
      if (statusFilter === 'BOOKED_ONLY') {
        if (!isEligibleForDispatchSlip(row.status)) return false;
      }

      return true;
    });
  }, [data, searchQuery, fromDate, toDate, selectedRouting, selectedCity, statusFilter]);

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
      orderReference: (r) => r.orderReference,
      customerName: (r) => r.customerName,
      address: (r) => r.address,
      codAmount: (r) => Number(r.codAmount) || 0,
      weight: (r) => Number(r.weightKg) || 0,
      status: (r) => r.status,
    },
  });

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, safePage, pageSize]);

  // Strictly filter Booked orders that are eligible for dispatch slip printing
  const eligibleBookedOrders = React.useMemo(() => {
    return filteredData.filter((r) => isEligibleForDispatchSlip(r.status));
  }, [filteredData]);

  // Selected orders that are strictly eligible for dispatch slip printing
  const selectedOrders = React.useMemo(() => {
    return data.filter((row) => selectedIds.includes(row.id) && isEligibleForDispatchSlip(row.status));
  }, [data, selectedIds]);

  // Row selection handler
  const handleToggleRow = (row: OrderRow) => {
    if (!isEligibleForDispatchSlip(row.status)) {
      setToastMessage(`Dispatch slips can only be generated for Booked orders. (Order ${row.trackingNumber} is ${row.status})`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(row.id) ? prev.filter((item) => item !== row.id) : [...prev, row.id]
    );
  };

  // Select all eligible Booked orders in current filtered view
  const handleToggleSelectAll = () => {
    if (eligibleBookedOrders.length === 0) {
      setToastMessage('No Booked orders available in this view to select for dispatch slips.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const allEligibleSelected = eligibleBookedOrders.every((r) => selectedIds.includes(r.id));
    if (allEligibleSelected) {
      const eligibleIds = new Set(eligibleBookedOrders.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !eligibleIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...eligibleBookedOrders.map((r) => r.id)]));
      setSelectedIds(newSelected);
    }
  };

  // Open modal to print selected slips
  const handlePrintSelected = () => {
    if (selectedOrders.length === 0) {
      setToastMessage('Please select at least one Booked order to generate dispatch slips.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setShowSlipsModal(true);
  };

  // Quick Print All Booked orders in the active filtered view
  const handleQuickPrintAll = () => {
    if (eligibleBookedOrders.length === 0) {
      setToastMessage('No Booked orders found matching your filters to print dispatch slips.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSelectedIds(eligibleBookedOrders.map((r) => r.id));
    setShowSlipsModal(true);
  };

  // Individual print handler
  const handlePrintIndividual = (row: OrderRow) => {
    if (!isEligibleForDispatchSlip(row.status)) {
      setToastMessage(`Dispatch slips can only be printed for Booked orders. (Current status: ${row.status})`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setSelectedIds([row.id]);
    setShowSlipsModal(true);
  };

  // Trigger high-precision thermal / A4 browser print
  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <PortalLayout>
      {/* HIGH-PRECISION PRINT CSS: 3 to 4 dispatch slips per A4 page / Thermal Labels */}
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
              <FileText className="w-4 h-4" /> Airway Bill &amp; Dispatch Slips Management
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                Airway Bill (AWB)
              </h1>
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-0.5 rounded-full border border-primary/20">
                {eligibleBookedOrders.length} Booked ready for slip printing
              </span>
            </div>
            <p className="text-body-md text-secondary font-medium mt-0.5">
              Select booked orders to generate standard courier dispatch slips with dual barcode (3PL) or single barcode (2PL).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Print All Booked in view */}
            <button
              onClick={handleQuickPrintAll}
              disabled={eligibleBookedOrders.length === 0}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                eligibleBookedOrders.length > 0
                  ? 'bg-slate-800 text-white hover:bg-black cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title="Print all eligible Booked orders in current filter view"
            >
              <Printer className="w-4 h-4" /> Print All Booked ({eligibleBookedOrders.length})
            </button>

            {/* Print Selected Slips Action Button */}
            <button
              onClick={handlePrintSelected}
              disabled={selectedOrders.length === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
                selectedOrders.length > 0
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={selectedOrders.length > 0 ? `Print dispatch slips for ${selectedOrders.length} booked order(s)` : 'Select booked orders to print slips'}
            >
              <Printer className="w-4 h-4" />
              Print Selected Slips {selectedOrders.length > 0 && `(${selectedOrders.length})`}
            </button>

            {/* Quick Add Order Link */}
            <Link
              href="/shipments/book?tab=manual"
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Create new order booking"
            >
              <Plus className="w-4 h-4" /> Add Order
            </Link>
          </div>
        </div>

        {/* ===================== LINE 2: DEDICATED FILTERS BAR ===================== */}
        <div className="bg-white border border-outline-variant rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Filters Group: Search, Date Range, Routing, City, Status */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
            {/* 1. Search Input */}
            <div className="relative min-w-[200px] max-w-[280px] flex-1">
              <Search className="w-4 h-4 text-outline absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Tracking #, Consignee, Ref..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-outline-variant bg-slate-50/70 hover:bg-white focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs transition-colors"
              />
            </div>

            {/* 2. Unified Shipper Date Range Picker */}
            <div className="shrink-0">
              <ShipperDateRangePicker
                fromDate={fromDate}
                toDate={toDate}
                onChange={(from, to) => {
                  setFromDate(from);
                  setToDate(to);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* 3. Routing Type Filter (2PL vs 3PL) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedRouting('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedRouting === 'ALL'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Routing
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRouting('2PL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedRouting === '2PL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2PL (In-House)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRouting('3PL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedRouting === '3PL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3PL Partner
              </button>
            </div>

            {/* 4. Destination City Filter */}
            {availableCities.length > 0 && (
              <select
                value={selectedCity || ''}
                onChange={(e) => {
                  setSelectedCity(e.target.value || null);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold border border-outline-variant bg-slate-50/70 hover:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="">All Destinations ({availableCities.length})</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            {/* 5. Status Filter Switch */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Show:</span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter(statusFilter === 'BOOKED_ONLY' ? 'ALL' : 'BOOKED_ONLY');
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'BOOKED_ONLY'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {statusFilter === 'BOOKED_ONLY' ? 'Booked Only (Slip Ready)' : 'All Statuses'}
              </button>
            </div>
          </div>

          {/* Reset Filters / Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {(searchQuery || selectedCity || selectedRouting !== 'ALL' || statusFilter !== 'BOOKED_ONLY') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCity(null);
                  setSelectedRouting('ALL');
                  setStatusFilter('BOOKED_ONLY');
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 border border-outline-variant hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
              title="Refresh shipments"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* ===================== TABLE CARD & SELECTION BAR ===================== */}
        <div className="bg-white border border-outline-variant rounded-2xl shadow-xs overflow-hidden">
          {/* Sub-Header Selection Bar */}
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary transition-colors cursor-pointer select-none"
                title={eligibleBookedOrders.length > 0 ? 'Select all Booked orders for dispatch slip generation' : 'No Booked orders available in this view'}
              >
                {eligibleBookedOrders.length > 0 && eligibleBookedOrders.every((r) => selectedIds.includes(r.id)) ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({eligibleBookedOrders.length} Booked)</span>
              </button>
              <span className="text-slate-300">|</span>
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Airway Bill Ready Shipments
              </h4>
            </div>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredData.length} order{filteredData.length !== 1 ? 's' : ''} ({eligibleBookedOrders.length} eligible for slips)
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
                      checked={eligibleBookedOrders.length > 0 && eligibleBookedOrders.every((r) => selectedIds.includes(r.id))}
                      disabled={eligibleBookedOrders.length === 0}
                      onChange={handleToggleSelectAll}
                      title={eligibleBookedOrders.length > 0 ? 'Select all Booked orders' : 'No Booked orders available to select'}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Tracking ID / AWB" column="trackingNumber" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Order Ref" column="orderReference" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Consignee" column="customerName" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Destination Address" column="address" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Payment / COD" column="codAmount" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Weight & Pcs" column="weight" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Status" column="status" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-xs font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                      Loading orders for Airway Bill...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-700">No shipments found matching the selected criteria.</p>
                        <Link
                          href="/shipments/book?tab=manual"
                          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> Book New Order
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => {
                    const isSlipEligible = isEligibleForDispatchSlip(row.status);

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors group ${
                          isSlipEligible ? 'cursor-pointer' : 'cursor-default opacity-85'
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
                        {/* Checkbox: Disabled if not in Booked status */}
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className={`w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary ${
                              isSlipEligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
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

                        {/* Tracking ID & Barcode indicator */}
                        <td className="px-4 py-4 font-mono font-bold text-primary text-sm">
                          <div className="flex flex-col">
                            <span>{row.trackingNumber}</span>
                            <span className="text-[10px] text-slate-400 font-sans font-normal">
                              {row.dateFormatted}
                            </span>
                          </div>
                        </td>

                        {/* Order Reference */}
                        <td className="px-4 py-4 font-mono font-semibold text-slate-800">
                          {row.orderReference}
                        </td>

                        {/* Consignee */}
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

                        {/* Destination Address & Routing Badge */}
                        <td className="px-4 py-4 text-slate-700 max-w-[240px]">
                          <div className="flex flex-col gap-1">
                            <span className="truncate text-xs text-slate-800">{row.address}</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 text-[9px] font-extrabold rounded uppercase tracking-wider ${
                                  row.is2PL
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {row.is2PL ? '2PL (1 Barcode)' : `3PL (${row.tplCourierId} - 2 Barcodes)`}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {row.destination}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Payment & COD */}
                        <td className="px-4 py-4">
                          {row.paymentType === 'PAID' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              PAID
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              COD: Rs {row.codAmount.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Weight & Pieces */}
                        <td className="px-4 py-4 text-slate-800">
                          <span className="font-bold">{row.weightKg.toFixed(2)} Kg</span>
                          <span className="text-slate-400 text-[10px] ml-1">({row.pieces} pc{row.pieces !== 1 ? 's' : ''})</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSlipEligible
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {row.status === 'booked' ? 'Booked' : row.status}
                          </span>
                        </td>

                        {/* Action: Print Dispatch Slip */}
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 ml-auto">
                            {isSlipEligible ? (
                              <button
                                onClick={() => handlePrintIndividual(row)}
                                className="px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-lg font-bold text-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Print dispatch slip for this booked order"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print Slip
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-not-allowed opacity-60"
                                title={`Dispatch slip not allowed: only available for Booked orders (Status: ${row.status})`}
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-400" /> Locked
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
            itemLabel="shipments"
          />
        </div>
      </div>

      {/* DISPATCH SLIPS PRINT PREVIEW MODAL */}
      {showSlipsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" /> Airway Bill &amp; Dispatch Slips Print Preview
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedOrders.length} Booked order{selectedOrders.length > 1 ? 's' : ''} ready. Dual barcodes generated for 3PL shipments; single barcode for 2PL in-house shipments.
                </p>
              </div>
              <button
                onClick={() => setShowSlipsModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render realistic slips inside modal preview */}
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
                Cancel
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

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </PortalLayout>
  );
}

export default function AirwayBillPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full" />
        </div>
      }
    >
      <AirwayBillContent />
    </React.Suspense>
  );
}

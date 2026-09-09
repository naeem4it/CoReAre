'use client';

import * as React from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';
import { useAuth } from '@/components/AuthProvider';
import { 
  Printer, 
  Search, 
  X, 
  Package, 
  Check, 
  Layers, 
  ChevronRight, 
  Eye, 
  Edit2, 
  Plus,
  CheckSquare,
  Square,
  Barcode as BarcodeIcon,
  Truck,
  ShieldCheck,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';

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

type OrderRow = {
  id: number | string;
  trackingNumber: string;
  customerName: string;
  avatar: string;
  phone: string;
  origin: string;
  destination: string;
  address: string;
  shipperName: string;
  shipperAddress: string;
  shipperPhone: string;
  paymentType: 'COD' | 'PAID';
  codAmount: number;
  weightKg: number;
  pieces: number;
  status: string;
  allowToOpen: string;
  parcelDetail: string;
  is2PL: boolean;
  tplCourierId: string;
  tplTrackingNo: string;
  dateCreated: string;
};

// Clean SVG Barcode Component for Print and Preview
function SlipBarcode({ text, height = 28 }: { text: string; height?: number }) {
  const bars = React.useMemo(() => {
    let result = '';
    const clean = text.toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'DBA-000';
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      const pattern = (code * 9301 + 49297) % 233280;
      const bin = (pattern % 64).toString(2).padStart(6, '1');
      result += bin;
    }
    return result.slice(0, 50);
  }, [text]);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg height={height} viewBox="0 0 100 24" className="w-full max-w-[140px] h-auto">
        {bars.split('').map((b, i) => (
          <rect
            key={i}
            x={i * 1.9 + 2}
            y="0"
            width={b === '1' ? 1.2 : 0.6}
            height="24"
            fill="#000000"
          />
        ))}
      </svg>
      <span className="font-mono text-[9px] font-bold text-slate-900 tracking-wider mt-0.5">{text}</span>
    </div>
  );
}

export default function OrderList() {
  const { user, activeBusinessId } = useAuth();
  const [data, setData] = React.useState<OrderRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Tenant 2PL self-service cities & 3PL partner state
  const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null);
  const [selfServiceCities, setSelfServiceCities] = React.useState<string[]>([]);
  const [courierTplPartners, setCourierTplPartners] = React.useState<any[]>([]);

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
        const matching = user.shipper.find((s: any) => s.id === activeBusinessId);
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
        const currentTenant = items.find((t: any) => String(t.id) === String(tenantId) || t.attributes?.documentId === String(tenantId)) || items[0];
        const tenantData = currentTenant?.attributes || currentTenant;
        if (tenantData?.self_service_cities && Array.isArray(tenantData.self_service_cities)) {
          setSelfServiceCities(tenantData.self_service_cities);
        } else if (tenantId) {
          const saved = localStorage.getItem(`self_service_cities_${tenantId}`);
          if (saved) {
            try { setSelfServiceCities(JSON.parse(saved)); } catch {}
          }
        }
      } catch (err) {
        console.warn('Could not load tenant self service cities:', err);
        if (tenantId) {
          const saved = localStorage.getItem(`self_service_cities_${tenantId}`);
          if (saved) {
            try { setSelfServiceCities(JSON.parse(saved)); } catch {}
          }
        }
      }

      // Load 3PL partners
      try {
        const tplRes = await apiClient.get('/tpl-partners', {
          params: { filters: tenantId ? { tenant: tenantId } : {}, populate: '*' }
        });
        const partners = (tplRes.data?.data || []).map((item: any) => ({ id: item.id, ...(item.attributes || item) }));
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
          parcels = parcels.filter((item: any) => {
            if (!item.shipper && !item.pickup_location?.shipper) return true;
            const itemShipperId = item.shipper?.id || item.pickup_location?.shipper?.id;
            return itemShipperId === shipperId;
          });
        }
        
        if (parcels.length > 0) {
          const mapped: OrderRow[] = parcels.map((item: any) => {
            const customerName = item.recipient_name || 'Customer';
            const initials = customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';
            const destination = item.destination_city?.CityName 
              || item.destination_city?.name 
              || extractCityFromAddress(item.recipient_address);
            const origin = item.source_city?.CityName || item.source_city?.name || 'Lahore';
            const allowToOpen = item.allow_to_open || 'No';
            const parcelDetail = item.comments || item.description || item.product_description || 'Standard Parcel';
            const shipperPhone = item.shipper?.phone || item.pickup_location?.phone || '+92 300 0000000';
            const pieces = item.pieces || 1;

            // Check if destination is in courier's configured 2PL self-service areas
            const normDest = destination.toLowerCase().trim();
            const normAddr = (item.recipient_address || '').toLowerCase().trim();
            const in2PLArea = (selfServiceCities.length > 0)
              ? selfServiceCities.some((c: string) => {
                  const normC = c.toLowerCase().trim();
                  return normC === normDest || normDest.includes(normC) || normAddr.includes(normC);
                })
              : (!item.is_3pl && (!item.courier || item.courier?.name === 'IN-HOUSE' || item.courier?.name === '2PL'));

            const is2PL = in2PLArea && !(item.is_3pl && item.courier && item.courier?.name !== 'IN-HOUSE');

            let tplCourierId = 'IN-HOUSE';
            let tplTrackingNo = item.tracking_number;

            if (!is2PL) {
              tplCourierId = item.courier?.name 
                || (courierTplPartners.find((p: any) => p.is_preferred)?.name)
                || (courierTplPartners[0]?.name)
                || 'Leopards Courier';
              const cleanPrefix = tplCourierId.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'LCS';
              tplTrackingNo = item.reference_number || `${cleanPrefix}-${item.tracking_number.replace('DBA-', '')}`;
            }

            return {
              id: item.id,
              trackingNumber: `${item.tracking_number}`,
              customerName,
              avatar: initials,
              phone: item.recipient_phone || 'N/A',
              origin,
              destination,
              address: item.recipient_address || 'No address provided',
              shipperName: item.shipper?.name || item.pickup_location?.shipper?.name || 'Shipper Account',
              shipperAddress: item.pickup_location?.address || 'Pickup Warehouse',
              shipperPhone,
              paymentType: item.payment_type === 'PAID' || Number(item.cod_amount) === 0 ? 'PAID' : 'COD',
              codAmount: Number(item.cod_amount) || 0,
              weightKg: item.weight || 0.5,
              pieces,
              status: item.status || 'booked',
              allowToOpen,
              parcelDetail,
              is2PL,
              tplCourierId,
              tplTrackingNo,
              dateCreated: item.createdAt || new Date().toISOString(),
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

  const filteredData = data.filter((row) => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return (
      row.trackingNumber.toLowerCase().includes(lower) ||
      row.customerName.toLowerCase().includes(lower) ||
      row.address.toLowerCase().includes(lower) ||
      row.status.toLowerCase().includes(lower)
    );
  });

  const selectedOrders = React.useMemo(() => {
    return data.filter(row => selectedIds.includes(row.id));
  }, [data, selectedIds]);

  const handleToggleRow = (id: number | string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredData.length && filteredData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(r => r.id));
    }
  };

  const handlePrintSelected = () => {
    if (selectedOrders.length === 0) return;
    setShowSlipsModal(true);
  };

  const handlePrintIndividual = (row: OrderRow) => {
    setSelectedIds([row.id]);
    setShowSlipsModal(true);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <PortalLayout>
      {/* PRINT CSS: 3 or 4 slips per A4 page */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
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
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 5mm !important;
            background: white !important;
          }
          .dispatch-slip-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 2px dashed #0f172a !important;
            height: 68mm !important;
            box-sizing: border-box !important;
            padding: 3mm 4mm !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}} />

      <div className="p-lg max-w-[1920px] w-full mx-auto space-y-lg no-print">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
              <Package className="w-4 h-4" /> Booked Orders & Dispatch Slips
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              Booking Orders List
            </h1>
            <p className="text-body-md text-secondary font-medium">
              Select orders to generate and print 3 to 4 dispatch slips per page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-outline absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Tracking #, Name, City..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs font-medium border border-outline-variant bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm w-64"
              />
            </div>
            
            {/* Generate Slips Action Button */}
            <button
              onClick={handlePrintSelected}
              disabled={selectedIds.length === 0}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
                selectedIds.length > 0
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              Generate Dispatch Slips {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>

            <a
              href="/store"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              title="Open customer-facing sample shirt store in a separate browser tab"
            >
              <ShoppingBag className="w-4 h-4" /> Open Shirt Store (QA)
            </a>

            <Link
              href="/shipments/book"
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Order
            </Link>
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
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary transition-colors cursor-pointer"
              >
                {selectedIds.length === filteredData.length && filteredData.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All</span>
              </button>
              <span className="text-slate-300">|</span>
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Booked Orders Listing
              </h4>
            </div>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredData.length} booked order{filteredData.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer"
                      checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Consignee</th>
                  <th className="px-4 py-3">Destination Address</th>
                  <th className="px-4 py-3">Shipper</th>
                  <th className="px-4 py-3">Payment / COD</th>
                  <th className="px-4 py-3">Allow to Open</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Dispatch Slip</th>
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
                      No booked orders found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${
                        selectedIds.includes(row.id) ? 'bg-primary-50/40' : ''
                      }`}
                      onClick={() => handleToggleRow(row.id)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => handleToggleRow(row.id)}
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
                            <span className={`inline-flex items-center px-1.5 py-0.2 text-[9px] font-extrabold rounded uppercase tracking-wider ${
                              row.is2PL
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.allowToOpen === 'Yes' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {row.allowToOpen === 'Yes' ? 'Open Allowed' : 'No Open'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {row.status === 'booked' ? 'Booked' : row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handlePrintIndividual(row)}
                          className="px-3 py-1.5 bg-white border border-outline-variant hover:border-primary text-slate-700 hover:text-primary rounded-lg font-bold text-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          title="Print singular dispatch slip"
                        >
                          <Printer className="w-3.5 h-3.5" /> Slip
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
                  {selectedOrders.length} parcel{selectedOrders.length > 1 ? 's' : ''} selected • Formatted for 3 to 4 slips per A4 page
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerBrowserPrint}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Now (All Slips)
                </button>
                <button 
                  onClick={() => setShowSlipsModal(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Grid (Showing exact printable layout) */}
            <div className="space-y-4 py-2">
              {selectedOrders.map((order, idx) => (
                <div 
                  key={order.id} 
                  className="border-2 border-slate-900 rounded-xl p-3.5 bg-white text-slate-900 font-sans shadow-sm flex flex-col justify-between relative overflow-hidden"
                  style={{ minHeight: '230px' }}
                >
                  {/* Slip Header */}
                  <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm tracking-tight text-primary">DBArc Express</span>
                      <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        DISPATCH SLIP #{idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        order.is2PL 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-400' 
                          : 'bg-amber-50 text-amber-900 border-amber-400'
                      }`}>
                        {order.is2PL ? '2PL' : `3PL (${order.tplCourierId})`}: {order.destination}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                        order.allowToOpen === 'Yes' 
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-500' 
                          : 'bg-rose-100 text-rose-900 border-rose-500'
                      }`}>
                        Allow to Open: {order.allowToOpen.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Barcode Section: 1 Barcode for 2PL locations, 2 Barcodes for 3PL locations */}
                  {order.is2PL ? (
                    /* 2PL In-House Courier Delivery: ONLY 1 BARCODE */
                    <div className="flex flex-col items-center justify-center py-2.5 bg-slate-50/80 border-b border-slate-300 rounded my-1.5 px-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Office Tracking Barcode</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          2PL IN-HOUSE
                        </span>
                      </div>
                      <SlipBarcode text={order.trackingNumber} height={30} />
                    </div>
                  ) : (
                    /* 3PL Partner Courier Delivery: 2 BARCODES */
                    <div className="grid grid-cols-2 gap-3 py-2 bg-slate-50/80 border-b border-slate-300 rounded my-1.5 px-2">
                      {/* Barcode 1: Office Tracking Barcode */}
                      <div className="flex flex-col items-center border-r border-slate-300 pr-2">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">1. Office Tracking Barcode</span>
                        <SlipBarcode text={order.trackingNumber} height={26} />
                      </div>

                      {/* Barcode 2: 3PL Courier ID / Tracking No */}
                      <div className="flex flex-col items-center pl-2">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">2. 3PL Partner Barcode ({order.tplCourierId})</span>
                        <SlipBarcode text={order.tplTrackingNo} height={26} />
                      </div>
                    </div>
                  )}

                  {/* Shipper and Consignee Details */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] py-1">
                    <div className="border-r border-slate-200 pr-2">
                      <span className="font-bold text-slate-500 uppercase text-[9px] block">Shipper Details (Origin):</span>
                      <p className="font-bold text-slate-900 text-xs">{order.shipperName}</p>
                      <p className="text-slate-600 font-mono text-[9px]">Ph: {order.shipperPhone}</p>
                      <p className="text-slate-700 line-clamp-2 text-[9px]">{order.shipperAddress}</p>
                    </div>

                    <div className="bg-primary-50/40 p-1.5 rounded border border-primary-100">
                      <span className="font-bold text-primary-900 uppercase text-[9px] block">Consignee Details (Destination):</span>
                      <p className="font-extrabold text-slate-900 text-xs">{order.customerName}</p>
                      <p className="text-slate-700 font-mono font-bold text-[10px]">Ph: {order.phone}</p>
                      <p className="text-slate-800 font-medium line-clamp-2 text-[9px]">{order.address}</p>
                    </div>
                  </div>

                  {/* Bottom Strip: Amount, Weight, Parcel Detail */}
                  <div className="flex items-center justify-between border-t-2 border-slate-900 pt-1.5 mt-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 block uppercase">Weight / Pcs:</span>
                        <span className="text-[11px] font-bold text-slate-900">{order.weightKg} KG • {order.pieces} Pc</span>
                      </div>
                      <div className="border-l border-slate-300 pl-3">
                        <span className="text-[8px] font-bold text-slate-500 block uppercase">Parcel Detail:</span>
                        <span className="text-[10px] font-semibold text-slate-800 truncate max-w-[200px] block">{order.parcelDetail}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] font-bold text-slate-500 block uppercase">COD / Payment Amount:</span>
                      {order.codAmount > 0 ? (
                        <span className="text-sm font-black text-slate-900">PKR {order.codAmount.toLocaleString()}</span>
                      ) : (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          PREPAID (PKR 0)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
        {selectedOrders.map((order, idx) => (
          <div key={order.id} className="dispatch-slip-card font-sans flex flex-col justify-between">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '13px', textTransform: 'uppercase' }}>DBArc Express</strong>
                <span style={{ fontSize: '10px', fontWeight: 'bold', border: '1px solid black', padding: '1px 4px' }}>
                  SLIP #{idx + 1}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase',
                  border: '1px solid black',
                  padding: '1px 5px',
                  background: order.is2PL ? '#ecfdf5' : '#fffbeb'
                }}>
                  {order.is2PL ? '2PL' : `3PL (${order.tplCourierId})`}: {order.destination}
                </span>
                <span style={{ 
                  fontSize: '9px', 
                  fontWeight: 'bold', 
                  border: '1px solid black', 
                  padding: '1px 5px',
                  background: order.allowToOpen === 'Yes' ? '#ecfdf5' : '#fff1f2'
                }}>
                  ALLOW TO OPEN: {order.allowToOpen.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Barcode Section: 1 Barcode for 2PL locations, 2 Barcodes for 3PL locations */}
            {order.is2PL ? (
              /* 2PL In-House Delivery: 1 BARCODE */
              <div style={{ textAlign: 'center', margin: '4px 0', borderBottom: '1px solid #94a3b8', paddingBottom: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Office Tracking Barcode</span>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', border: '1px solid #10b981', background: '#ecfdf5', color: '#065f46', padding: '0 3px' }}>
                    2PL IN-HOUSE
                  </span>
                </div>
                <SlipBarcode text={order.trackingNumber} height={28} />
              </div>
            ) : (
              /* 3PL Partner Courier Delivery: 2 BARCODES */
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '4px 0', borderBottom: '1px solid #94a3b8', paddingBottom: '3px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>1. Office Tracking Barcode</span>
                  <SlipBarcode text={order.trackingNumber} height={24} />
                </div>
                <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>2. 3PL Courier Barcode ({order.tplCourierId})</span>
                  <SlipBarcode text={order.tplTrackingNo} height={24} />
                </div>
              </div>
            )}

            {/* Shipper & Consignee Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '9px', lineHeight: '1.2' }}>
              <div>
                <strong style={{ fontSize: '8px', textTransform: 'uppercase', color: '#475569' }}>Shipper (From):</strong><br />
                <strong style={{ fontSize: '10px' }}>{order.shipperName}</strong><br />
                <span>Ph: {order.shipperPhone}</span><br />
                <span style={{ color: '#334155' }}>{order.shipperAddress}</span>
              </div>
              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '8px' }}>
                <strong style={{ fontSize: '8px', textTransform: 'uppercase', color: '#475569' }}>Consignee (To):</strong><br />
                <strong style={{ fontSize: '10px' }}>{order.customerName}</strong><br />
                <strong>Ph: {order.phone}</strong><br />
                <span style={{ fontWeight: '600' }}>{order.address}</span>
              </div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid black', paddingTop: '3px', marginTop: '2px', fontSize: '9px' }}>
              <div>
                <span><strong>Weight:</strong> {order.weightKg} KG ({order.pieces} Pcs)</span><br />
                <span><strong>Parcel Detail:</strong> {order.parcelDetail}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>Amount:</span><br />
                {order.codAmount > 0 ? (
                  <strong style={{ fontSize: '13px' }}>COD: PKR {order.codAmount.toLocaleString()}</strong>
                ) : (
                  <strong style={{ fontSize: '11px', border: '1px solid black', padding: '1px 4px' }}>PREPAID (PKR 0)</strong>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </PortalLayout>
  );
}

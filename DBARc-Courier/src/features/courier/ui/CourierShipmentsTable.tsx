'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';

type ShipmentRow = {
  id: number | string;
  trackingNumber: string;
  customerName: string;
  avatar: string;
  origin: string;
  destination: string;
  paymentType: 'COD' | 'PAID';
  codAmount: number;
  status: 'Booked' | 'Total Booking' | 'Not Arrived' | 'Arrived' | 'In Transit' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper' | 'booked';
  eta: string;
};

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';

interface CourierShipmentsTableProps {
  fromDate?: string;
  toDate?: string;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

export const CourierShipmentsTable = ({ 
  fromDate, 
  toDate, 
  selectedStatus = 'all', 
  onSelectStatus 
}: CourierShipmentsTableProps) => {
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const [data, setData] = React.useState<ShipmentRow[]>([]);
  const [filteredData, setFilteredData] = React.useState<ShipmentRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

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

  React.useEffect(() => {
    const fetchParcels = async () => {
      try {
        setIsLoading(true);
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

        const parcelsUrl = '/parcels?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=200';
        const response = await apiClient.get<StrapiCollectionResponse<Parcel>>(parcelsUrl);
        let parcels = response.data?.data || [];
        
        if (isShipper && shipperId && parcels.length > 0) {
          parcels = parcels.filter((item: any) => {
            if (!item.shipper && !item.pickup_location?.shipper) return true;
            const itemShipperId = item.shipper?.id || item.pickup_location?.shipper?.id;
            return itemShipperId === shipperId;
          });
        } else if (tenantId && parcels.length > 0) {
          parcels = parcels.filter((item: any) => {
            const shipTenant = item.shipper?.tenant?.id || item.shipper?.tenant;
            const offTenant = item.origin_office?.tenant?.id || item.origin_office?.tenant;
            if (shipTenant && Number(shipTenant) !== Number(tenantId)) return false;
            if (offTenant && Number(offTenant) !== Number(tenantId)) return false;
            return true;
          });
        }
        
        if (fromDate || toDate) {
          parcels = parcels.filter((item: any) => {
            if (!item.createdAt) return true;
            const itemDate = new Date(item.createdAt);
            if (fromDate) {
              const from = new Date(fromDate);
              from.setHours(0, 0, 0, 0);
              if (itemDate < from) return false;
            }
            if (toDate) {
              const to = new Date(toDate);
              to.setHours(23, 59, 59, 999);
              if (itemDate > to) return false;
            }
            return true;
          });
        }
        
        if (parcels.length > 0) {
          const mapped: ShipmentRow[] = parcels.map((item: Parcel) => {
            const customerName = item.recipient_name || 'Customer';
            const initials = customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';
            
            const origin = typeof (item as any).source_city === 'string'
              ? (item as any).source_city
              : ((item as any).source_city?.CityName || (item as any).source_city?.name || 'Karachi');

            const destination = typeof (item as any).destination_city === 'string'
              ? (item as any).destination_city
              : ((item as any).destination_city?.CityName || (item as any).destination_city?.name || item.recipient_address?.split(',').pop()?.trim() || 'Islamabad');
            
            let uiStatus: ShipmentRow['status'] = 'Booked';
            if (item.status) {
              if ((item.status as string) === 'Total Booking' || (item.status as string) === 'booked') {
                uiStatus = 'Booked';
              } else {
                uiStatus = item.status as any;
              }
            }
            
            const paymentType: 'COD' | 'PAID' = (item as any).payment_type === 'PAID' || Number(item.cod_amount) === 0 ? 'PAID' : 'COD';
            const codAmount = Number(item.cod_amount) || 0;

            return {
              id: item.id,
              trackingNumber: `#${item.tracking_number}`,
              customerName,
              avatar: initials,
              origin,
              destination,
              paymentType,
              codAmount,
              status: uiStatus,
              eta: item.createdAt ? new Date(item.createdAt).toLocaleDateString() + ', ' + new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            };
          });
          setData(mapped);
          setFilteredData(mapped);
        } else {
          setData([]);
          setFilteredData([]);
        }
      } catch (error) {
        console.warn('Could not fetch dynamic shipments:', error);
        setData([]);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParcels();
  }, [isShipper, shipperId, fromDate, toDate, user]);

  // Filter based on selectedStatus tile and search query
  React.useEffect(() => {
    let result = data;

    if (selectedStatus && selectedStatus !== 'all') {
      result = result.filter((row) => {
        const norm = normalizeShipmentStatus(row.status);
        if (selectedStatus === 'not-arrived') {
          return norm === SHIPMENT_STATUSES.BOOKED || norm === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER || norm === SHIPMENT_STATUSES.NOT_ARRIVED || ['Booked', 'Total Booking', 'Order Created', 'Pending'].includes(row.status as string);
        }
        if (selectedStatus === 'arrived') {
          return norm === SHIPMENT_STATUSES.ARRIVED_ORIGIN || norm === SHIPMENT_STATUSES.ARRIVED_DEST || norm === SHIPMENT_STATUSES.IN_TRANSIT;
        }
        if (selectedStatus === 'out-for-delivery') {
          return norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY;
        }
        if (selectedStatus === 'delivered') {
          return norm === SHIPMENT_STATUSES.DELIVERED;
        }
        if (selectedStatus === 'shipper-advice') {
          return norm === SHIPMENT_STATUSES.DELIVERY_FAILED;
        }
        if (selectedStatus === 'ready-to-return') {
          return norm === SHIPMENT_STATUSES.READY_FOR_RETURN;
        }
        if (selectedStatus === 'return-to-shipper') {
          return norm === SHIPMENT_STATUSES.RETURN_TO_SHIPPER || norm === SHIPMENT_STATUSES.LOST_DAMAGE;
        }
        return true;
      });
    }

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (row) =>
          row.trackingNumber.toLowerCase().includes(lower) ||
          row.customerName.toLowerCase().includes(lower) ||
          row.origin.toLowerCase().includes(lower) ||
          row.destination.toLowerCase().includes(lower) ||
          row.status.toLowerCase().includes(lower)
      );
    }
    setFilteredData(result);
  }, [searchQuery, data, selectedStatus]);

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('No shipment data to export.');
      return;
    }
    const headers = ['Tracking ID', 'Customer', 'Origin', 'Destination', 'Status', 'Payment Type', 'COD Amount', 'Booking Time'];
    const rows = filteredData.map(r => [
      `"${r.trackingNumber}"`,
      `"${r.customerName.replace(/"/g, '""')}"`,
      `"${r.origin}"`,
      `"${r.destination}"`,
      `"${r.status}"`,
      `"${r.paymentType}"`,
      r.codAmount,
      `"${r.eta}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dbarc_shipments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: ShipmentRow['status']) => {
    switch (status) {
      case 'Out For delivery':
        return (
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[12px] font-semibold border border-yellow-200">
            Out For Delivery
          </span>
        );
      case 'Delivered':
        return (
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[12px] font-semibold border border-emerald-200">
            Delivered
          </span>
        );
      case 'Booked':
      case 'booked':
      case 'Total Booking':
        return (
          <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-[12px] font-semibold border border-outline-variant">
            Booked
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[12px] font-semibold border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getAvatarBg = (avatar: string) => {
    if (avatar === 'AS') return 'bg-primary-fixed text-primary';
    if (avatar === 'MK') return 'bg-secondary-fixed text-secondary';
    return 'bg-tertiary-fixed text-tertiary';
  };

  return (
    <section className="mt-lg bg-white rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="p-md border-b border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Active Operations Detail</h2>
          <p className="text-xs text-slate-500">Live parcel shipment stream with real-time operational status</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              className="w-full text-body-md border border-outline-variant rounded-lg py-1.5 pl-9 pr-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
              placeholder="Filter by ID or City..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              filter_list
            </span>
          </div>

          <button 
            onClick={() => router.push('/orders')}
            className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Open all orders and print dispatch slips"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Orders & Slips</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="bg-surface-container-high px-4 py-2 rounded-lg text-label-md font-label-md hover:bg-surface-container-highest transition-colors active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Active Filter Indicator Bar */}
      {selectedStatus && selectedStatus !== 'all' && (
        <div className="flex items-center gap-2 px-md py-2 bg-primary/5 border-b border-outline-variant text-xs text-slate-700">
          <span className="font-bold">Active Tile Filter:</span>
          <span className="px-2.5 py-0.5 bg-primary text-white rounded-full font-bold text-[11px] uppercase tracking-wider">
            {selectedStatus.replace(/-/g, ' ')}
          </span>
          <span className="text-slate-400">({filteredData.length} records found)</span>
          <button
            onClick={() => onSelectStatus && onSelectStatus('all')}
            className="ml-auto text-primary hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">close</span> Clear Filter
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-on-surface-variant">
            <tr>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Tracking ID</th>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Customer</th>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Origin / Destination</th>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Status</th>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Payment</th>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant text-right">ETA / Date</th>
              <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-md py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading shipments...</p>
                  </div>
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((row) => (
                <tr 
                  className="hover:bg-slate-50 transition-colors cursor-pointer group" 
                  key={row.id}
                  onClick={() => router.push(`/tracking?search=${row.trackingNumber.replace('#', '')}`)}
                >
                  <td className="px-md py-4 font-tabular-nums text-primary font-semibold">{row.trackingNumber}</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarBg(row.avatar)}`}>
                        {row.avatar}
                      </div>
                      <span className="font-body-md text-body-md text-on-surface font-medium">{row.customerName}</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md">
                      <span>{row.origin}</span>
                      <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
                      <span>{row.destination}</span>
                    </div>
                  </td>
                  <td className="px-md py-4">{getStatusBadge(row.status)}</td>
                  <td className="px-md py-4">
                    {row.paymentType === 'PAID' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        PAID
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        COD: Rs. {row.codAmount.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-md py-4 text-right font-tabular-nums font-body-md text-body-md text-on-surface">
                    {row.eta}
                  </td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tracking?search=${row.trackingNumber.replace('#', '')}`);
                        }}
                        title="View tracking & live timeline"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-primary hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        <span>Track</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/orders');
                        }}
                        title="Open Orders & Slips"
                        className="p-1 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-md py-12 text-center text-slate-500">
                  No shipments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-md flex justify-between items-center bg-slate-50/50">
        <p className="text-label-md font-label-md text-on-surface-variant">
          Showing 1-{filteredData.length} of {filteredData.length} items
        </p>
        <div className="flex gap-2">
          <button className="p-2 border border-outline-variant rounded bg-white hover:bg-slate-100 disabled:opacity-50 cursor-pointer" disabled>
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button className="p-2 border border-outline-variant rounded bg-white hover:bg-slate-100 cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  );
};

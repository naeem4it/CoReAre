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
  status: 'Total Booking' | 'Not Arrived' | 'Arrived' | 'In Transit' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper' | 'booked';
  eta: string;
};

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface CourierShipmentsTableProps {
  fromDate?: string;
  toDate?: string;
}

export const CourierShipmentsTable = ({ fromDate, toDate }: CourierShipmentsTableProps) => {
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
            
            const origin = (item as any).source_city?.name || 'Karachi';
            const destination = (item as any).destination_city?.name || item.recipient_address?.split(',').pop()?.trim() || 'Islamabad';
            
            let uiStatus: ShipmentRow['status'] = 'booked';
            if (item.status) {
              if (item.status === 'Total Booking') {
                uiStatus = 'booked';
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
  }, [isShipper, shipperId, fromDate, toDate]);

  React.useEffect(() => {
    if (!searchQuery) {
      setFilteredData(data);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = data.filter(
        (row) =>
          row.trackingNumber.toLowerCase().includes(lower) ||
          row.customerName.toLowerCase().includes(lower) ||
          row.origin.toLowerCase().includes(lower) ||
          row.destination.toLowerCase().includes(lower) ||
          row.status.toLowerCase().includes(lower)
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, data]);

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
      case 'booked':
      case 'Total Booking':
        return (
          <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-[12px] font-semibold border border-outline-variant">
            Total Booking
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
        <h2 className="font-headline-md text-headline-md text-on-surface">Active Operations Detail</h2>
        <div className="flex items-center gap-sm w-full md:w-auto">
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
          <button className="bg-surface-container-high px-4 py-2 rounded-lg text-label-md font-label-md hover:bg-surface-container-highest transition-colors active:scale-95 cursor-pointer">
            Export CSV
          </button>
        </div>
      </div>
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/tracking?search=${row.trackingNumber.replace('#', '')}`);
                      }}
                      title="View tracking & shipment details"
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline group-hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-md py-12 text-center text-slate-500">
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

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, fetchAllPaginated } from '@/shared/api/api-client';
import { RiderService } from '@/services/api';
import { Parcel } from '@/types/generated/parcel.types';
import { useAuth } from '@/components/AuthProvider';
import { toLocalDateString } from '@/shared/utils/date';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';

type StatsData = {
  totalShipments: number;
  notArrived: number;
  arrived: number;
  outForDelivery: number;
  delivered: number;
  readyToReturn: number;
  returnToShipper: number;
  shipperAdvice: number;
  cancelled: number;
};

interface CourierStatsProps {
  fromDate?: string;
  toDate?: string;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

export const CourierStats = ({ fromDate, toDate, selectedStatus = 'all', onSelectStatus }: CourierStatsProps) => {
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const [stats, setStats] = React.useState<StatsData>({
    totalShipments: 0,
    notArrived: 0,
    arrived: 0,
    outForDelivery: 0,
    delivered: 0,
    readyToReturn: 0,
    returnToShipper: 0,
    shipperAdvice: 0,
    cancelled: 0,
  });
  const [totalShippers, setTotalShippers] = React.useState<number>(0);
  const [totalRiders, setTotalRiders] = React.useState<number>(0);
  const [totalOffices, setTotalOffices] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const isShipper = React.useMemo(() => {
    if (!user) return false;
    if (user.shipper_roles && Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0) return true;
    const roleType = (
      user.role?.type || 
      user.role_type || 
      user.role?.name || 
      (typeof user.role === 'string' ? user.role : '')
    ).toString().toLowerCase();
    if (roleType.includes('shipper')) return true;
    if (user.user_type === 'shipper' || user.type === 'shipper') return true;
    const email = (user.email || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    if (email.includes('shipper') || username.includes('shipper')) return true;
    const hasShipperRelation = !!(user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : true));
    return hasShipperRelation;
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
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

        // 1. Fetch All Parcels using fetchAllPaginated to ensure all 517+ bookings are included
        const params: any = {
          populate: '*',
          sort: ['createdAt:desc'],
          pagination: { pageSize: 1000 }
        };

        if (isShipper && shipperId) {
          params['filters[$or][0][shipper][id][$eq]'] = shipperId;
          params['filters[$or][1][pickup_location][shipper][id][$eq]'] = shipperId;
        }

        const rawList = await fetchAllPaginated<Parcel>('/parcels', { params });
        let parcels = Array.isArray(rawList) ? rawList : [];

        // Apply tenant isolation on courier side
        if (!isShipper && tenantId && parcels.length > 0) {
          parcels = parcels.filter((item: any) => {
            const shipTenant = item.shipper?.tenant?.id || item.shipper?.tenant;
            const offTenant = item.origin_office?.tenant?.id || item.origin_office?.tenant;
            if (shipTenant && Number(shipTenant) !== Number(tenantId)) return false;
            if (offTenant && Number(offTenant) !== Number(tenantId)) return false;
            return true;
          });
        }

        // Apply Date Range Filter if provided
        if (fromDate || toDate) {
          parcels = parcels.filter((item: any) => {
            const created = item.createdAt;
            if (!created) return true;
            const dateStr = toLocalDateString(created);
            if (fromDate && dateStr < fromDate) return false;
            if (toDate && dateStr > toDate) return false;
            return true;
          });
        }

        let notArrived = 0;
        let arrived = 0;
        let outForDelivery = 0;
        let delivered = 0;
        let readyToReturn = 0;
        let returnToShipper = 0;
        let shipperAdvice = 0;
        let cancelled = 0;

        parcels.forEach((p: any) => {
          const norm = normalizeShipmentStatus(p.status);
          const rawStatus = (p.status || '').toString().toLowerCase();

          if (norm === SHIPMENT_STATUSES.CANCELLED || rawStatus.includes('cancel')) {
            cancelled++;
            return;
          }

          switch (norm) {
            case SHIPMENT_STATUSES.BOOKED:
            case SHIPMENT_STATUSES.PICKED_UP_BY_RIDER:
            case SHIPMENT_STATUSES.NOT_ARRIVED:
              notArrived++;
              break;
            case SHIPMENT_STATUSES.ARRIVED_ORIGIN:
            case SHIPMENT_STATUSES.ARRIVED_DEST:
            case SHIPMENT_STATUSES.IN_TRANSIT:
              arrived++;
              break;
            case SHIPMENT_STATUSES.OUT_FOR_DELIVERY:
              outForDelivery++;
              break;
            case SHIPMENT_STATUSES.DELIVERED:
              delivered++;
              break;
            case SHIPMENT_STATUSES.DELIVERY_FAILED:
              shipperAdvice++;
              break;
            case SHIPMENT_STATUSES.READY_FOR_RETURN:
              readyToReturn++;
              break;
            case SHIPMENT_STATUSES.RETURN_TO_SHIPPER:
            case SHIPMENT_STATUSES.LOST_DAMAGE:
              returnToShipper++;
              break;
            default:
              if (['Booked', 'Total Booking', 'Order Created', 'Pending', 'booked'].includes(p.status)) {
                notArrived++;
              } else {
                notArrived++;
              }
              break;
          }
        });

        if (isMounted) {
          setStats({
            totalShipments: parcels.length,
            notArrived,
            arrived,
            outForDelivery,
            delivered,
            readyToReturn,
            returnToShipper,
            shipperAdvice,
            cancelled,
          });
        }

        // 2. Fetch Total Shippers count isolated to tenant
        try {
          const shipperFilters: any = {};
          if (tenantId) {
            shipperFilters.tenant = tenantId;
          }
          const shippersRes = await apiClient.get('/shippers', {
            params: { filters: shipperFilters, pagination: { limit: 100 } }
          }).catch(() => null);
          const rawShippers = shippersRes?.data?.data || [];
          if (isMounted) setTotalShippers(rawShippers.length);
        } catch {
          if (isMounted) setTotalShippers(0);
        }

        // 3. Fetch Enrolled Riders isolated to tenant
        try {
          const riderParams = `?filters[status][$ne]=inactive${tenantId ? `&filters[tenant][$eq]=${tenantId}` : ''}&pagination[pageSize]=100`;
          const ridersRes = await RiderService.getAll(riderParams).catch(() => null);
          const rawRiders = ridersRes?.data || [];
          if (isMounted) setTotalRiders(rawRiders.length);
        } catch {
          if (isMounted) setTotalRiders(0);
        }

        // 4. Fetch Courier Offices / Hubs strictly isolated to tenant
        try {
          const officeFilters: any = { type: 'courier' };
          if (tenantId) {
            officeFilters.tenant = tenantId;
          }
          const officesRes = await apiClient.get('/offices', {
            params: { filters: officeFilters, pagination: { limit: 100 } }
          }).catch(() => null);
          const rawOffices = officesRes?.data?.data || [];
          if (isMounted) setTotalOffices(rawOffices.length);
        } catch {
          if (isMounted) setTotalOffices(0);
        }
      } catch (error) {
        console.warn('Could not fetch dynamic stats:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [isShipper, shipperId, fromDate, toDate, user]);

  const deliveryRate = React.useMemo(() => {
    if (!stats.totalShipments || stats.totalShipments === 0) return 0;
    return (stats.delivered / stats.totalShipments) * 100;
  }, [stats.totalShipments, stats.delivered]);

  const handleTileClick = (filterKey: string, targetHref?: string) => {
    if (onSelectStatus) {
      onSelectStatus(selectedStatus === filterKey ? 'all' : filterKey);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-6">
      {/* 1. Shippers / My Team */}
      {!isShipper ? (
        <div 
          onClick={() => router.push('/administration/employees?type=shipper')}
          className="bg-white p-3.5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-primary transition-all group cursor-pointer"
          title="Click to view Enrolled Shippers Directory"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <span className="text-primary font-bold text-[10px] flex items-center gap-0.5 bg-primary/10 px-2 py-0.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
              Directory <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
            </span>
          </div>
          <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Total Shippers</h3>
          <p className="text-xl font-black mt-0.5 tabular-nums text-slate-900">
            {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : totalShippers.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Registered Merchant Stores</p>
        </div>
      ) : (
        <div 
          onClick={() => router.push('/administration/employees?type=team')}
          className="bg-white p-3.5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-primary transition-all group cursor-pointer"
          title="Click to view Store Team"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
            <span className="text-primary font-bold text-[10px] flex items-center gap-0.5 bg-primary/10 px-2 py-0.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
              Team <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
            </span>
          </div>
          <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Store Team</h3>
          <p className="text-xl font-black mt-0.5 tabular-nums text-slate-900">Active</p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Manage Staff & Permissions</p>
        </div>
      )}

      {/* 2. Enrolled Riders */}
      <div 
        onClick={() => router.push('/administration/employees?type=rider')}
        className="bg-white p-3.5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-cyan-500 transition-all group cursor-pointer"
        title="Click to view Enrolled Fleet & Riders Directory"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">two_wheeler</span>
          </div>
          <span className="text-cyan-600 font-bold text-[10px] flex items-center gap-0.5 bg-cyan-50 px-2 py-0.5 rounded-full group-hover:bg-cyan-600 group-hover:text-white transition-colors">
            Fleet <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </span>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Enrolled Riders</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-slate-900">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : totalRiders.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 truncate">Active Delivery Fleet</p>
      </div>

      {/* 3. Office-Wise Orders / Hubs */}
      <div 
        onClick={() => router.push('/administration/offices')}
        className="bg-white p-3.5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-violet-500 transition-all group cursor-pointer"
        title="Click to view Regional Offices & Distribution Hubs"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">apartment</span>
          </div>
          <span className="text-violet-600 font-bold text-[10px] flex items-center gap-0.5 bg-violet-50 px-2 py-0.5 rounded-full group-hover:bg-violet-600 group-hover:text-white transition-colors">
            Offices <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </span>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Office-wise Hubs</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-slate-900">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : totalOffices.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 truncate">Distribution Hubs & Stations</p>
      </div>

      {/* 4. Total Shipments (All Booked Orders) */}
      <div 
        onClick={() => handleTileClick('all')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'all' 
            ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
            : 'border-outline-variant hover:border-primary'
        }`}
        title="Total Shipments = All orders booked in the system. Click to filter below or open Orders List."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/orders');
            }}
            className="text-primary hover:underline font-bold text-[10px] bg-primary/10 hover:bg-primary hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Orders List & Slips"
          >
            Orders <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Total Shipments</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-slate-900">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.totalShipments.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 truncate">All Booked Orders in System</p>
      </div>

      {/* 5. Not Arrived */}
      <div 
        onClick={() => handleTileClick('not-arrived')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'not-arrived' 
            ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/50' 
            : 'border-outline-variant hover:border-amber-500'
        }`}
        title="Not Arrived = Booked shipments awaiting warehouse arrival scan. Click to filter or open list."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">pending_actions</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/orders?status=Not+Arrived');
            }}
            className="text-amber-700 hover:underline font-bold text-[10px] bg-amber-100 hover:bg-amber-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Not Arrived Bookings"
          >
            Pending <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Not Arrived</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-amber-600">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.notArrived.toLocaleString()}
        </p>
        <p className="text-[10px] text-amber-700/80 mt-1 truncate">Awaiting Warehouse Arrival</p>
      </div>

      {/* 6. Arrived */}
      <div 
        onClick={() => handleTileClick('arrived')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'arrived' 
            ? 'border-blue-500 ring-2 ring-blue-400/30 bg-blue-50/50' 
            : 'border-outline-variant hover:border-blue-500'
        }`}
        title="Arrived = Physically scanned into warehouse intake. Click to filter or open Operations Arrivals."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">warehouse</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/operations/arrivals');
            }}
            className="text-blue-700 hover:underline font-bold text-[10px] bg-blue-100 hover:bg-blue-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Arrivals Scanning"
          >
            Arrivals <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Arrived</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-blue-600">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.arrived.toLocaleString()}
        </p>
        <p className="text-[10px] text-blue-700/80 mt-1 truncate">Physically Scanned at Hub</p>
      </div>

      {/* 7. Out For Delivery */}
      <div 
        onClick={() => handleTileClick('out-for-delivery')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'out-for-delivery' 
            ? 'border-yellow-500 ring-2 ring-yellow-400/30 bg-yellow-50/50' 
            : 'border-outline-variant hover:border-yellow-500'
        }`}
        title="Out For Delivery = Dispatched on rider delivery run sheet. Click to filter or open Delivery Sheets."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-yellow-50 text-yellow-700 group-hover:bg-yellow-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/operations/delivery-sheet');
            }}
            className="text-yellow-800 hover:underline font-bold text-[10px] bg-yellow-100 hover:bg-yellow-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Delivery Runsheets"
          >
            Runsheet <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Out For Delivery</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-yellow-700">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.outForDelivery.toLocaleString()}
        </p>
        <p className="text-[10px] text-yellow-800/80 mt-1 truncate">Dispatched with Delivery Rider</p>
      </div>

      {/* 8. Delivered */}
      <div 
        onClick={() => handleTileClick('delivered')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'delivered' 
            ? 'border-emerald-500 ring-2 ring-emerald-400/30 bg-emerald-50/50' 
            : 'border-outline-variant hover:border-emerald-500'
        }`}
        title="Delivered = Successfully delivered to consignee. Click to filter or open Delivered list."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/orders?status=Delivered');
            }}
            className="text-emerald-700 hover:underline font-bold text-[10px] bg-emerald-100 hover:bg-emerald-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Delivered Orders"
          >
            {deliveryRate.toFixed(0)}% Rate <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Delivered</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-emerald-600">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.delivered.toLocaleString()}
        </p>
        <p className="text-[10px] text-emerald-700/80 mt-1 truncate">Successfully Delivered</p>
      </div>

      {/* 9. Shipper Advice */}
      <div 
        onClick={() => handleTileClick('shipper-advice')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'shipper-advice' 
            ? 'border-purple-500 ring-2 ring-purple-400/30 bg-purple-50/50' 
            : 'border-outline-variant hover:border-purple-500'
        }`}
        title="Shipper Advice = Failed delivery attempts requiring instructions. Click to filter or open Advice Portal."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">contact_support</span>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/shipper-advise');
            }}
            className="text-purple-700 hover:underline font-bold text-[10px] bg-purple-100 hover:bg-purple-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Shipper Advice Portal"
          >
            Advice <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Shipper Advice</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-purple-600">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.shipperAdvice.toLocaleString()}
        </p>
        <p className="text-[10px] text-purple-700/80 mt-1 truncate">Failed Attempts Awaiting Action</p>
      </div>

      {/* 10. Ready To Return */}
      <div 
        onClick={() => handleTileClick('ready-to-return')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'ready-to-return' 
            ? 'border-rose-500 ring-2 ring-rose-400/30 bg-rose-50/50' 
            : 'border-outline-variant hover:border-rose-500'
        }`}
        title="Ready To Return = Parcels marked for return back to merchant. Click to filter or open De-Manifestation."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">assignment_return</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/operations/demanifestation');
            }}
            className="text-rose-700 hover:underline font-bold text-[10px] bg-rose-100 hover:bg-rose-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open De-Manifestation / Returns"
          >
            RTO Queue <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Ready To Return</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-rose-600">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.readyToReturn.toLocaleString()}
        </p>
        <p className="text-[10px] text-rose-700/80 mt-1 truncate">Marked for Return Processing</p>
      </div>

      {/* 11. Return to Shipper */}
      <div 
        onClick={() => handleTileClick('return-to-shipper')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'return-to-shipper' 
            ? 'border-red-600 ring-2 ring-red-500/30 bg-red-50/50' 
            : 'border-outline-variant hover:border-red-600'
        }`}
        title="Return to Shipper = Parcels closed and returned to merchant. Click to filter or open Returned list."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">keyboard_return</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/orders?status=Return+to+Shipper');
            }}
            className="text-red-700 hover:underline font-bold text-[10px] bg-red-100 hover:bg-red-600 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Returned to Shipper Orders"
          >
            Returned <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Return to Shipper</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-red-600">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.returnToShipper.toLocaleString()}
        </p>
        <p className="text-[10px] text-red-700/80 mt-1 truncate">Returned Back to Merchant</p>
      </div>

      {/* 12. Cancelled Bookings */}
      <div 
        onClick={() => handleTileClick('cancelled')}
        className={`bg-white p-3.5 rounded-2xl border transition-all group cursor-pointer shadow-sm hover:shadow-md ${
          selectedStatus === 'cancelled' 
            ? 'border-slate-700 ring-2 ring-slate-600/30 bg-slate-100' 
            : 'border-outline-variant hover:border-slate-600'
        }`}
        title="Cancelled = Orders cancelled before transit. Click to filter or open Cancelled list."
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">block</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/orders?status=Cancelled');
            }}
            className="text-slate-700 hover:underline font-bold text-[10px] bg-slate-100 hover:bg-slate-800 hover:text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Open Cancelled Orders"
          >
            Cancelled <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
        <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Cancelled</h3>
        <p className="text-xl font-black mt-0.5 tabular-nums text-slate-700">
          {isLoading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" /> : stats.cancelled.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 truncate">Cancelled Before Transit</p>
      </div>
    </div>
  );
};

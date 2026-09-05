'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';
import { useAuth } from '@/components/AuthProvider';

type StatsData = {
  totalShipments: number;
  notArrived: number;
  arrived: number;
  delivered: number;
};

interface CourierStatsProps {
  fromDate?: string;
  toDate?: string;
}

export const CourierStats = ({ fromDate, toDate }: CourierStatsProps) => {
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const [stats, setStats] = React.useState<StatsData>({
    totalShipments: 0,
    notArrived: 0,
    arrived: 0,
    delivered: 0,
  });
  const [totalShippers, setTotalShippers] = React.useState<number>(0);
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
    const fetchStats = async () => {
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

        // Apply Date Range Filter if set
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

        setStats({
          totalShipments: parcels.length,
          notArrived: parcels.filter((p: Parcel) => p.status === 'Total Booking' || p.status === 'Not Arrived').length,
          arrived: parcels.filter((p: Parcel) => ['Arrived', 'Arrived At Destination', 'Out For delivery', 'Ready To Return', 'Return Dispatched'].includes(p.status || '')).length,
          delivered: parcels.filter((p: Parcel) => p.status === 'Delivered').length,
        });

        // Fetch Total Shippers count for Courier
        try {
          const shippersRes = await apiClient.get('/shippers?pagination[pageSize]=1');
          const count = shippersRes.data?.meta?.pagination?.total ?? (shippersRes.data?.data?.length || 0);
          setTotalShippers(count);
        } catch {
          try {
            const usersRes = await apiClient.get('/users?filters[role][name][$containsi]=shipper');
            setTotalShippers(usersRes.data?.length || 0);
          } catch {
            setTotalShippers(0);
          }
        }
      } catch (error) {
        console.warn('Could not fetch dynamic stats:', error);
        setStats({ totalShipments: 0, notArrived: 0, arrived: 0, delivered: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isShipper, shipperId, fromDate, toDate]);

  const deliveryRate = React.useMemo(() => {
    if (!stats.totalShipments || stats.totalShipments === 0) return 0;
    return (stats.delivered / stats.totalShipments) * 100;
  }, [stats.totalShipments, stats.delivered]);

  const activeRate = React.useMemo(() => {
    if (!stats.totalShipments || stats.totalShipments === 0) return 0;
    return ((stats.arrived + stats.delivered) / stats.totalShipments) * 100;
  }, [stats.totalShipments, stats.arrived, stats.delivered]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-gutter mb-xl">
      {/* Total Shippers (Clickable -> Shipper Listing) */}
      <div 
        onClick={() => router.push('/administration/employees?type=shipper')}
        className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-primary transition-all group cursor-pointer"
        title="Click to view Shippers Directory"
      >
        <div className="flex items-start justify-between mb-sm">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <span className="text-primary font-medium text-[11px] flex items-center gap-0.5 bg-primary/5 px-2 py-0.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
            View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>
        <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Total Shippers</h3>
        <p className="font-display-lg text-display-lg mt-1 tabular-nums text-slate-900">
          {isLoading ? (
            <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded"></span>
          ) : (
            totalShippers.toLocaleString()
          )}
        </p>
      </div>

      {/* Total Shipments */}
      <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-sm">
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">sailing</span>
          </div>
          {stats.totalShipments === 0 ? (
            <span className="text-slate-500 font-tabular-nums text-[12px] bg-slate-100 px-2 py-0.5 rounded-full">0.0%</span>
          ) : activeRate >= 50 ? (
            <span className="text-emerald-600 flex items-center font-tabular-nums text-[12px] bg-emerald-50 px-2 py-0.5 rounded-full">+{activeRate.toFixed(1)}%</span>
          ) : (
            <span className="text-rose-600 flex items-center font-tabular-nums text-[12px] bg-rose-50 px-2 py-0.5 rounded-full">{activeRate.toFixed(1)}%</span>
          )}
        </div>
        <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Total Shipments</h3>
        <p className="font-display-lg text-display-lg mt-1 tabular-nums">
          {isLoading ? (
            <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded"></span>
          ) : (
            stats.totalShipments.toLocaleString()
          )}
        </p>
      </div>

      {/* Not Arrived */}
      <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-sm">
          <div className="p-2 rounded-lg bg-tertiary-container/10 text-tertiary group-hover:bg-tertiary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <span className="text-on-surface-variant font-tabular-nums text-[12px] bg-surface-container-high px-2 py-0.5 rounded-full">Pending</span>
        </div>
        <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Not Arrived</h3>
        <p className="font-display-lg text-display-lg mt-1 tabular-nums text-tertiary">
          {isLoading ? (
            <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded"></span>
          ) : (
            stats.notArrived.toLocaleString()
          )}
        </p>
      </div>

      {/* Arrived */}
      <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-sm">
          <div className="p-2 rounded-lg bg-secondary-container/50 text-on-secondary-container group-hover:bg-secondary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">inventory</span>
          </div>
          <span className="text-secondary font-tabular-nums text-[12px] bg-secondary-container/30 px-2 py-0.5 rounded-full">In Transit</span>
        </div>
        <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Arrived</h3>
        <p className="font-display-lg text-display-lg mt-1 tabular-nums text-secondary">
          {isLoading ? (
            <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded"></span>
          ) : (
            stats.arrived.toLocaleString()
          )}
        </p>
      </div>

      {/* Delivered */}
      <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-sm">
          <div className="p-2 rounded-lg bg-primary-container text-white group-hover:bg-primary transition-colors">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          {stats.totalShipments === 0 ? (
            <span className="text-slate-500 font-tabular-nums text-[12px] bg-slate-100 px-2 py-0.5 rounded-full">0.0% Goal</span>
          ) : deliveryRate >= 75 ? (
            <span className="text-emerald-600 font-tabular-nums text-[12px] bg-emerald-50 px-2 py-0.5 rounded-full">{deliveryRate.toFixed(1)}% Goal</span>
          ) : (
            <span className="text-rose-600 font-tabular-nums text-[12px] bg-rose-50 px-2 py-0.5 rounded-full">{deliveryRate.toFixed(1)}% Goal</span>
          )}
        </div>
        <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Delivered</h3>
        <p className="font-display-lg text-display-lg mt-1 tabular-nums text-primary-container">
          {isLoading ? (
            <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded"></span>
          ) : (
            stats.delivered.toLocaleString()
          )}
        </p>
      </div>
    </div>
  );
};

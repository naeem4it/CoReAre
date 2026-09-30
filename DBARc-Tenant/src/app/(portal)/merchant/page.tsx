'use client';

import * as React from 'react';
import { apiClient, fetchAllPaginated } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';
import { ShipperDateRangePicker } from '@/features/shipper/ui/ShipperDateRangePicker';
import { ShipperStatsGrid } from '@/features/shipper/ui/ShipperStatsGrid';
import { ShipperOrdersOverTimeChart } from '@/features/shipper/ui/ShipperOrdersOverTimeChart';
import { ShipperOrdersOverviewDonut, OverviewSlice } from '@/features/shipper/ui/ShipperOrdersOverviewDonut';
import { ShipperTopCities, CityMetricItem } from '@/features/shipper/ui/ShipperTopCities';
import { ShipperLatestOrders, LatestOrderRecord } from '@/features/shipper/ui/ShipperLatestOrders';
import { normalizeShipmentStatus, SHIPMENT_STATUSES } from '@/shared/constants/shipment-statuses';

import { getDefaultDateRange, toLocalDateString } from '@/shared/utils/date';

interface ParcelItem {
  id: number;
  tracking_number?: string;
  status?: string;
  cod_amount?: number | string;
  delivery_charges?: number | string;
  createdAt?: string;
  destination_city?: { id: number; name?: string; CityName?: string };
  city?: string;
  recipient_address?: string;
  shipper?: { id?: number };
  pickup_location?: { shipper?: { id?: number } };
  attributes?: { createdAt?: string; shipper?: { id?: number; data?: { id?: number } } };
}

export default function MerchantDashboard() {
  const { user, activeBusinessId } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [allParcels, setAllParcels] = React.useState<ParcelItem[]>([]);

  // Default date range: past 30 days up to today (local system time)
  const defaultRange = React.useMemo(() => getDefaultDateRange(30), []);
  const [fromDate, setFromDate] = React.useState<string>(defaultRange.fromDate);
  const [toDate, setToDate] = React.useState<string>(defaultRange.toDate);

  const shipperId = React.useMemo(() => {
    if (activeBusinessId) return activeBusinessId;
    if (user?.shippers && user.shippers.length > 0) {
      return user.shippers[0].id;
    }
    const anyUser = user as any;
    if (anyUser?.shipper) {
      if (Array.isArray(anyUser.shipper) && anyUser.shipper.length > 0) {
        return anyUser.shipper[0].id || anyUser.shipper[0];
      }
      if (typeof anyUser.shipper === 'object' && anyUser.shipper.id) return anyUser.shipper.id;
      if (typeof anyUser.shipper === 'number') return anyUser.shipper;
    }
    return null;
  }, [user, activeBusinessId]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchParcels = async () => {
      try {
        setLoading(true);
        const params: any = {
          populate: '*',
          sort: ['createdAt:desc'],
          pagination: { pageSize: 1000 }
        };
        if (shipperId) {
          params['filters[$or][0][shipper][id][$eq]'] = shipperId;
          params['filters[$or][1][pickup_location][shipper][id][$eq]'] = shipperId;
        }

        const parcels: ParcelItem[] = await fetchAllPaginated('/parcels', { params });
        if (isMounted) {
          setAllParcels(Array.isArray(parcels) ? parcels : []);
        }
      } catch (err) {
        console.warn('Could not fetch live dashboard parcels:', err);
        if (isMounted) setAllParcels([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchParcels();
    return () => {
      isMounted = false;
    };
  }, [shipperId]);

  const getParcelShipperId = (p: ParcelItem): number | null => {
    const s: any = p.shipper || (p as any).attributes?.shipper || p.pickup_location?.shipper || (p as any).pickup_location?.attributes?.shipper;
    if (!s) return null;
    if (typeof s === 'number') return s;
    if (s.id) return Number(s.id);
    if (s.data?.id) return Number(s.data.id);
    return null;
  };

  // Filter parcels based on shipper and date range
  const filteredParcels = React.useMemo(() => {
    return allParcels.filter((p) => {
      if (shipperId) {
        const pShipperId = getParcelShipperId(p);
        if (pShipperId !== null && pShipperId !== Number(shipperId)) return false;
      }

      const created = p.createdAt || p.attributes?.createdAt;
      if (created) {
        const itemDate = toLocalDateString(created);
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }
      return true;
    });
  }, [allParcels, shipperId, fromDate, toDate]);

  // 1. Calculate the 13 Metric Cards
  const metrics = React.useMemo(() => {
    const totalCount = filteredParcels.length;
    const totalCod = filteredParcels.reduce((sum, p) => sum + (Number(p.cod_amount) || 0), 0);

    const calcStatus = (targetStatuses: string[]) => {
      const matches = filteredParcels.filter((p) => {
        const norm = normalizeShipmentStatus(p.status);
        return targetStatuses.includes(norm);
      });
      const count = matches.length;
      const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      const sum = matches.reduce((acc, p) => acc + (Number(p.cod_amount) || 0), 0);
      return { count, pct, sum };
    };

    // 'Not Arrived' for the shipper includes Booked orders awaiting warehouse arrival/rider pickup
    const notArr = calcStatus([SHIPMENT_STATUSES.NOT_ARRIVED, SHIPMENT_STATUSES.BOOKED]);
    const picked = calcStatus([SHIPMENT_STATUSES.PICKED_UP_BY_RIDER]);
    const arrOrigin = calcStatus([SHIPMENT_STATUSES.ARRIVED_ORIGIN]);
    const transit = calcStatus([SHIPMENT_STATUSES.IN_TRANSIT]);
    const arrDest = calcStatus([SHIPMENT_STATUSES.ARRIVED_DEST]);
    const outDel = calcStatus([SHIPMENT_STATUSES.OUT_FOR_DELIVERY]);
    const deliv = calcStatus([SHIPMENT_STATUSES.DELIVERED]);
    const failed = calcStatus([SHIPMENT_STATUSES.DELIVERY_FAILED]);
    const readyRet = calcStatus([SHIPMENT_STATUSES.READY_FOR_RETURN]);
    const retShipper = calcStatus([SHIPMENT_STATUSES.RETURN_TO_SHIPPER]);
    const lostDam = calcStatus([SHIPMENT_STATUSES.LOST_DAMAGE]);
    const canc = filteredParcels.filter((p) => {
      const norm = normalizeShipmentStatus(p.status);
      return norm === SHIPMENT_STATUSES.CANCELLED || (p.status || '').toLowerCase().includes('cancel');
    });
    const cancSum = canc.reduce((acc, p) => acc + (Number(p.cod_amount) || 0), 0);
    const cancPct = totalCount > 0 ? Math.round((canc.length / totalCount) * 100) : 0;

    return {
      totalBooking: { key: 'total', label: 'TOTAL BOOKING', value: totalCount, percentage: 100, codAmount: totalCod },
      notArrived: { key: 'not_arrived', label: 'NOT ARRIVED', value: notArr.count, percentage: notArr.pct, codAmount: notArr.sum },
      pickedUpByRider: { key: 'picked_up', label: 'PICKED UP BY RIDER', value: picked.count, percentage: picked.pct, codAmount: picked.sum },
      arrivedAtWarehouse: { key: 'arrived_origin', label: 'ARRIVED AT WAREHOUSE', value: arrOrigin.count, percentage: arrOrigin.pct, codAmount: arrOrigin.sum },
      inTransit: { key: 'in_transit', label: 'IN TRANSIT', value: transit.count, percentage: transit.pct, codAmount: transit.sum },
      arrivedAtDestination: { key: 'arrived_dest', label: 'ARRIVED AT DESTINATION', value: arrDest.count, percentage: arrDest.pct, codAmount: arrDest.sum },
      outForDelivery: { key: 'out_for_delivery', label: 'OUT FOR DELIVERY', value: outDel.count, percentage: outDel.pct, codAmount: outDel.sum },
      delivered: { key: 'delivered', label: 'DELIVERED', value: deliv.count, percentage: deliv.pct, codAmount: deliv.sum },
      deliveryFailed: { key: 'delivery_failed', label: 'DELIVERY FAILED', value: failed.count, percentage: failed.pct, codAmount: failed.sum },
      readyForReturn: { key: 'ready_return', label: 'READY FOR RETURN', value: readyRet.count, percentage: readyRet.pct, codAmount: readyRet.sum },
      returnedToShipper: { key: 'returned_shipper', label: 'RETURNED TO SHIPPER', value: retShipper.count, percentage: retShipper.pct, codAmount: retShipper.sum },
      lostDamage: { key: 'lost_damage', label: 'LOST / DAMAGE', value: lostDam.count, percentage: lostDam.pct, codAmount: lostDam.sum },
      cancelled: { key: 'cancelled', label: 'CANCELLED', value: canc.length, percentage: cancPct, codAmount: cancSum },
    };
  }, [filteredParcels]);

  // 2. Timeline data for Orders over time chart
  const timelineData = React.useMemo(() => {
    if (filteredParcels.length === 0) {
      const fromObj = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date();
      const toObj = toDate ? new Date(`${toDate}T00:00:00`) : new Date();
      return [
        {
          date: fromDate || 'Start',
          label: !isNaN(fromObj.getTime()) ? fromObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Start',
          count: 0
        },
        {
          date: toDate || 'End',
          label: !isNaN(toObj.getTime()) ? toObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'End',
          count: 0
        },
      ];
    }

    const map = new Map<string, number>();
    filteredParcels.forEach((p) => {
      const dt = toLocalDateString(p.createdAt || p.attributes?.createdAt);
      if (dt) {
        map.set(dt, (map.get(dt) || 0) + 1);
      }
    });

    const dates = Array.from(map.keys()).sort();
    if (dates.length === 1) {
      const singleDate = dates[0];
      const dateObj = new Date(`${singleDate}T00:00:00`);
      const label = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : singleDate;
      return [
        { date: singleDate, label, count: map.get(singleDate) || 0 }
      ];
    }

    return dates.map((d) => {
      const dateObj = new Date(`${d}T00:00:00`);
      const label = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : d;
      return { date: d, label, count: map.get(d) || 0 };
    });
  }, [filteredParcels, fromDate, toDate]);

  // 3. Donut chart slices for Orders overview
  const donutSlices: OverviewSlice[] = React.useMemo(() => {
    return [
      {
        label: 'Delivered',
        count: metrics.delivered.value,
        percentage: metrics.delivered.percentage,
        color: '#0D695D',
        statusQuery: 'Delivered',
      },
      {
        label: 'Delivery failed',
        count: metrics.deliveryFailed.value,
        percentage: metrics.deliveryFailed.percentage,
        color: '#A4263B',
        statusQuery: 'Delivery Failed',
      },
      {
        label: 'Ready for return',
        count: metrics.readyForReturn.value,
        percentage: metrics.readyForReturn.percentage,
        color: '#C89260',
        statusQuery: 'Ready for Return',
      },
    ];
  }, [metrics]);

  // 4. Top cities list with progress bars
  const topCities: CityMetricItem[] = React.useMemo(() => {
    if (filteredParcels.length === 0) {
      return [];
    }

    const cityCounts: Record<string, number> = {};
    filteredParcels.forEach((p) => {
      const c = p.destination_city?.CityName || p.destination_city?.name || p.city || 'Unknown';
      const cleanName = typeof c === 'string' && c.trim() ? c.trim() : 'Unknown';
      cityCounts[cleanName] = (cityCounts[cleanName] || 0) + 1;
    });

    const total = filteredParcels.length || 1;
    return Object.entries(cityCounts)
      .map(([cityName, count]) => ({
        cityName,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredParcels]);

  // 5. Latest orders list
  const latestOrders: LatestOrderRecord[] = React.useMemo(() => {
    if (filteredParcels.length === 0) {
      return [];
    }

    return filteredParcels.slice(0, 5).map((p) => {
      let formatted = 'N/A';
      const created = p.createdAt || p.attributes?.createdAt;
      if (created) {
        try {
          const d = new Date(created);
          formatted = d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        } catch {}
      }

      return {
        id: p.id,
        trackingNumber: p.tracking_number || `SHZ100000${p.id}`,
        formattedDate: formatted,
        status: p.status || 'Booked',
        codAmount: Number(p.cod_amount) || 0,
      };
    });
  }, [filteredParcels]);

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12">
      {/* Page Title & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Your shipments at a glance for the selected period.
          </p>
        </div>

        <div>
          <ShipperDateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />
        </div>
      </div>

      {/* 13 Metric Cards Grid */}
      <ShipperStatsGrid metrics={metrics} isLoading={loading} />

      {/* Charts Row: Orders over time & Orders overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ShipperOrdersOverTimeChart dailyData={timelineData} />
        </div>
        <div className="lg:col-span-5">
          <ShipperOrdersOverviewDonut
            totalCount={metrics.totalBooking.value}
            slices={donutSlices}
          />
        </div>
      </div>

      {/* Bottom Row: Top cities & Latest orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <ShipperTopCities cities={topCities} />
        </div>
        <div className="lg:col-span-7">
          <ShipperLatestOrders orders={latestOrders} />
        </div>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, fetchAllPaginated } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { useAuth } from '@/components/AuthProvider';
import { toLocalDateString } from '@/shared/utils/date';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';

export interface CourierAnalyticsChartsProps {
  fromDate?: string;
  toDate?: string;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

interface TimelinePoint {
  date: string;
  label: string;
  count: number;
  codAmount: number;
}

interface StatusSlice {
  label: string;
  key: string;
  count: number;
  percentage: number;
  color: string;
  href: string;
}

interface CityData {
  cityName: string;
  count: number;
  percentage: number;
  codAmount: number;
  deliveredCount: number;
  successRate: number;
}

interface ShipperData {
  id?: number | string | undefined;
  name: string;
  count: number;
  percentage: number;
  codAmount: number;
}

export function CourierAnalyticsCharts({
  fromDate,
  toDate,
  selectedStatus = 'all',
  onSelectStatus,
}: CourierAnalyticsChartsProps) {
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const [parcels, setParcels] = React.useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Time chart mode: Daily vs Weekly
  const [timelineMode, setTimelineMode] = React.useState<'Daily' | 'Weekly'>('Daily');
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    x: number;
    y: number;
    label: string;
    count: number;
    codAmount: number;
  } | null>(null);

  // Donut hover
  const [hoveredDonutKey, setHoveredDonutKey] = React.useState<string | null>(null);

  // Tenant / Shipper isolation
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
    return !!(user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : true));
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

  // Fetch all parcels matching date range & tenant isolation
  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
        const tenantId =
          user?.tenant?.id ||
          user?.tenantId ||
          (typeof user?.tenant === 'number' ? user.tenant : null) ||
          storedUser?.tenant?.id ||
          storedUser?.tenant;

        const params: any = {
          populate: '*',
          sort: ['createdAt:desc'],
          pagination: { pageSize: 1000 },
        };

        if (isShipper && shipperId) {
          params['filters[$or][0][shipper][id][$eq]'] = shipperId;
          params['filters[$or][1][pickup_location][shipper][id][$eq]'] = shipperId;
        }

        const rawList = await fetchAllPaginated<Parcel>('/parcels', { params });
        let list = Array.isArray(rawList) ? rawList : [];

        // Tenant isolation
        if (!isShipper && tenantId && list.length > 0) {
          list = list.filter((item: any) => {
            const shipTenant = item.shipper?.tenant?.id || item.shipper?.tenant;
            const offTenant = item.origin_office?.tenant?.id || item.origin_office?.tenant;
            if (shipTenant && Number(shipTenant) !== Number(tenantId)) return false;
            if (offTenant && Number(offTenant) !== Number(tenantId)) return false;
            return true;
          });
        }

        // Apply Date Range Filter if provided
        if (fromDate || toDate) {
          list = list.filter((item: any) => {
            const created = item.createdAt;
            if (!created) return true;
            const dateStr = toLocalDateString(created);
            if (fromDate && dateStr < fromDate) return false;
            if (toDate && dateStr > toDate) return false;
            return true;
          });
        }

        if (isMounted) {
          setParcels(list);
        }
      } catch (err) {
        console.warn('CourierAnalyticsCharts: failed to load parcel data', err);
        if (isMounted) setParcels([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate, isShipper, shipperId, user]);

  // Total volume & basic aggregates
  const totalVolume = parcels.length;

  // 1. TIMELINE DATA (Daily & Weekly)
  const { dailyTimeline, weeklyTimeline, peakDayInfo, averageDaily } = React.useMemo(() => {
    if (parcels.length === 0) {
      return {
        dailyTimeline: [] as TimelinePoint[],
        weeklyTimeline: [] as TimelinePoint[],
        peakDayInfo: { date: 'N/A', count: 0 },
        averageDaily: 0,
      };
    }

    const dayMap = new Map<string, { count: number; cod: number }>();
    parcels.forEach((p) => {
      const dt = toLocalDateString(p.createdAt);
      if (!dt) return;
      const current = dayMap.get(dt) || { count: 0, cod: 0 };
      current.count += 1;
      current.cod += Number(p.cod_amount) || 0;
      dayMap.set(dt, current);
    });

    const sortedDates = Array.from(dayMap.keys()).sort();

    let peak = { date: 'N/A', count: 0 };
    const dailyPoints: TimelinePoint[] = sortedDates.map((d) => {
      const info = dayMap.get(d)!;
      if (info.count > peak.count) {
        const dObj = new Date(`${d}T00:00:00`);
        const label = !isNaN(dObj.getTime())
          ? dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : d;
        peak = { date: label, count: info.count };
      }
      const dObj = new Date(`${d}T00:00:00`);
      const label = !isNaN(dObj.getTime())
        ? dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : d;
      return {
        date: d,
        label,
        count: info.count,
        codAmount: info.cod,
      };
    });

    // Group into weekly buckets
    const weekMap = new Map<string, { label: string; count: number; cod: number }>();
    dailyPoints.forEach((pt) => {
      const dObj = new Date(`${pt.date}T00:00:00`);
      const firstDayOfYear = new Date(dObj.getFullYear(), 0, 1);
      const pastDaysOfYear = (dObj.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekKey = `${dObj.getFullYear()}-W${weekNum}`;

      const curr = weekMap.get(weekKey) || {
        label: `Wk ${weekNum}`,
        count: 0,
        cod: 0,
      };
      curr.count += pt.count;
      curr.cod += pt.codAmount;
      weekMap.set(weekKey, curr);
    });

    const weeklyPoints: TimelinePoint[] = Array.from(weekMap.entries()).map(([k, v]) => ({
      date: k,
      label: v.label,
      count: v.count,
      codAmount: v.cod,
    }));

    const avg = dailyPoints.length > 0 ? (totalVolume / dailyPoints.length).toFixed(1) : '0';

    return {
      dailyTimeline: dailyPoints,
      weeklyTimeline: weeklyPoints,
      peakDayInfo: peak,
      averageDaily: Number(avg),
    };
  }, [parcels, totalVolume]);

  const activeTimeline = timelineMode === 'Daily' ? dailyTimeline : weeklyTimeline;

  // Timeline SVG calculations
  const chartWidth = 660;
  const chartHeight = 220;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;

  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const maxTimelineCount = React.useMemo(() => {
    const highest = Math.max(...activeTimeline.map((p) => p.count), 0);
    if (highest <= 4) return 6;
    if (highest <= 10) return 12;
    if (highest <= 20) return 24;
    return Math.ceil(highest / 5) * 5;
  }, [activeTimeline]);

  const timelineCoords = React.useMemo(() => {
    if (activeTimeline.length === 0) return [];
    const stepX = activeTimeline.length > 1 ? innerW / (activeTimeline.length - 1) : innerW / 2;

    return activeTimeline.map((pt, i) => {
      const x = padLeft + (activeTimeline.length > 1 ? i * stepX : innerW / 2);
      const ratio = pt.count / maxTimelineCount;
      const y = padTop + innerH - ratio * innerH;
      return {
        x,
        y,
        label: pt.label,
        count: pt.count,
        codAmount: pt.codAmount,
      };
    });
  }, [activeTimeline, innerW, innerH, maxTimelineCount, padLeft, padTop]);

  // Smooth bezier curve
  const timelinePathD = React.useMemo(() => {
    if (timelineCoords.length === 0) return '';
    if (timelineCoords.length === 1) return `M ${timelineCoords[0].x} ${timelineCoords[0].y}`;

    let d = `M ${timelineCoords[0].x} ${timelineCoords[0].y}`;
    for (let i = 0; i < timelineCoords.length - 1; i++) {
      const curr = timelineCoords[i];
      const next = timelineCoords[i + 1];
      const cx1 = curr.x + (next.x - curr.x) / 2;
      const cy1 = curr.y;
      const cx2 = curr.x + (next.x - curr.x) / 2;
      const cy2 = next.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${next.x} ${next.y}`;
    }
    return d;
  }, [timelineCoords]);

  // Gradient area
  const timelineAreaD = React.useMemo(() => {
    if (timelineCoords.length === 0) return '';
    const bottomY = padTop + innerH;
    const first = timelineCoords[0];
    const last = timelineCoords[timelineCoords.length - 1];
    return `${timelinePathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [timelinePathD, timelineCoords, innerH, padTop]);

  // Y-axis ticks
  const yTicks = React.useMemo(() => {
    const step = maxTimelineCount / 3;
    return [maxTimelineCount, Math.round(maxTimelineCount - step), Math.round(maxTimelineCount - step * 2), 0];
  }, [maxTimelineCount]);

  // 2. STATUS BREAKDOWN & DONUT CHART
  const { statusBreakdown, deliverySuccessRate, totalCodDelivered, totalCodInTransit, totalCodReturned, totalCodOverall } =
    React.useMemo(() => {
      let delivered = 0;
      let outForDelivery = 0;
      let inTransit = 0;
      let warehousePending = 0;
      let shipperAdvice = 0;
      let returned = 0;
      let cancelled = 0;

      let codDelivered = 0;
      let codInTransit = 0;
      let codReturned = 0;
      let codOverall = 0;

      parcels.forEach((p) => {
        const norm = normalizeShipmentStatus(p.status);
        const rawStatus = (p.status || '').toString().toLowerCase();
        const cod = Number(p.cod_amount) || 0;
        codOverall += cod;

        if (norm === SHIPMENT_STATUSES.CANCELLED || rawStatus.includes('cancel')) {
          cancelled++;
          codReturned += cod;
          return;
        }

        switch (norm) {
          case SHIPMENT_STATUSES.DELIVERED:
            delivered++;
            codDelivered += cod;
            break;
          case SHIPMENT_STATUSES.OUT_FOR_DELIVERY:
            outForDelivery++;
            codInTransit += cod;
            break;
          case SHIPMENT_STATUSES.IN_TRANSIT:
          case SHIPMENT_STATUSES.ARRIVED_DEST:
            inTransit++;
            codInTransit += cod;
            break;
          case SHIPMENT_STATUSES.ARRIVED_ORIGIN:
          case SHIPMENT_STATUSES.BOOKED:
          case SHIPMENT_STATUSES.NOT_ARRIVED:
          case SHIPMENT_STATUSES.PICKED_UP_BY_RIDER:
            warehousePending++;
            codInTransit += cod;
            break;
          case SHIPMENT_STATUSES.DELIVERY_FAILED:
            shipperAdvice++;
            codInTransit += cod;
            break;
          case SHIPMENT_STATUSES.READY_FOR_RETURN:
          case SHIPMENT_STATUSES.RETURN_TO_SHIPPER:
          case SHIPMENT_STATUSES.LOST_DAMAGE:
            returned++;
            codReturned += cod;
            break;
          default:
            warehousePending++;
            codInTransit += cod;
            break;
        }
      });

      const total = parcels.length || 1;
      const pct = (c: number) => Number(((c / total) * 100).toFixed(1));

      const slices: StatusSlice[] = [
        {
          label: 'Delivered',
          key: 'delivered',
          count: delivered,
          percentage: pct(delivered),
          color: '#10b981', // emerald-500
          href: '/orders?status=Delivered',
        },
        {
          label: 'Out For Delivery',
          key: 'out_for_delivery',
          count: outForDelivery,
          percentage: pct(outForDelivery),
          color: '#f59e0b', // amber-500
          href: '/operations/delivery-sheet',
        },
        {
          label: 'In Transit',
          key: 'in_transit',
          count: inTransit,
          percentage: pct(inTransit),
          color: '#3b82f6', // blue-500
          href: '/orders?status=In+Transit',
        },
        {
          label: 'At Warehouse / Booked',
          key: 'warehouse',
          count: warehousePending,
          percentage: pct(warehousePending),
          color: '#6366f1', // indigo-500
          href: '/operations/arrivals',
        },
        {
          label: 'Shipper Advice',
          key: 'shipper_advice',
          count: shipperAdvice,
          percentage: pct(shipperAdvice),
          color: '#f97316', // orange-500
          href: '/shipper-advise',
        },
        {
          label: 'Returned',
          key: 'returned',
          count: returned,
          percentage: pct(returned),
          color: '#ef4444', // red-500
          href: '/orders?status=Return+to+Shipper',
        },
        {
          label: 'Cancelled',
          key: 'cancelled',
          count: cancelled,
          percentage: pct(cancelled),
          color: '#64748b', // slate-500
          href: '/orders?status=Cancelled',
        },
      ];

      // Delivery Success Rate = Delivered / (Delivered + Returned + Cancelled) or Delivered / Total
      const completed = delivered + returned + cancelled;
      const successRate = completed > 0 ? ((delivered / completed) * 100).toFixed(1) : ((delivered / total) * 100).toFixed(1);

      return {
        statusBreakdown: slices,
        deliverySuccessRate: Number(successRate),
        totalCodDelivered: codDelivered,
        totalCodInTransit: codInTransit,
        totalCodReturned: codReturned,
        totalCodOverall: codOverall,
      };
    }, [parcels]);

  // Donut SVG geometry
  const donutSize = 176;
  const donutStrokeWidth = 22;
  const donutRadius = (donutSize - donutStrokeWidth) / 2;
  const donutCenter = donutSize / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;

  const computedDonutSlices = React.useMemo(() => {
    let accumulated = 0;
    return statusBreakdown.map((slice) => {
      const strokeLength = (slice.percentage / 100) * donutCircumference;
      const strokeDashoffset = -((accumulated / 100) * donutCircumference);
      accumulated += slice.percentage;
      return {
        ...slice,
        strokeLength,
        strokeDashoffset,
      };
    });
  }, [statusBreakdown, donutCircumference]);

  // 3. PIPELINE FUNNEL (Physical Shipment Journey)
  const pipelineSteps = React.useMemo(() => {
    const total = parcels.length || 1;

    let bookedCount = 0;
    let arrivedOriginCount = 0;
    let inTransitCount = 0;
    let outForDeliveryCount = 0;
    let deliveredCount = 0;

    parcels.forEach((p) => {
      const norm = normalizeShipmentStatus(p.status);
      const raw = (p.status || '').toString().toLowerCase();
      if (raw.includes('cancel')) return;

      // Pipeline progression stages
      bookedCount++; // All active entered

      if (
        norm !== SHIPMENT_STATUSES.BOOKED &&
        norm !== SHIPMENT_STATUSES.NOT_ARRIVED &&
        norm !== SHIPMENT_STATUSES.PICKED_UP_BY_RIDER
      ) {
        arrivedOriginCount++;
      }

      if (
        norm === SHIPMENT_STATUSES.IN_TRANSIT ||
        norm === SHIPMENT_STATUSES.ARRIVED_DEST ||
        norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY ||
        norm === SHIPMENT_STATUSES.DELIVERED
      ) {
        inTransitCount++;
      }

      if (norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY || norm === SHIPMENT_STATUSES.DELIVERED) {
        outForDeliveryCount++;
      }

      if (norm === SHIPMENT_STATUSES.DELIVERED) {
        deliveredCount++;
      }
    });

    return [
      {
        id: 'booked',
        title: 'Booked Intake',
        icon: 'receipt_long',
        count: bookedCount,
        percentage: 100,
        color: 'from-blue-600 to-indigo-600',
        href: '/orders',
        badge: 'Intake',
      },
      {
        id: 'arrived',
        title: 'Hub Sorted',
        icon: 'warehouse',
        count: arrivedOriginCount,
        percentage: Math.round((arrivedOriginCount / total) * 100),
        color: 'from-indigo-600 to-violet-600',
        href: '/operations/arrivals',
        badge: 'Warehouse',
      },
      {
        id: 'transit',
        title: 'Linehaul Transit',
        icon: 'local_shipping',
        count: inTransitCount,
        percentage: Math.round((inTransitCount / total) * 100),
        color: 'from-cyan-600 to-blue-600',
        href: '/orders?status=In+Transit',
        badge: 'Linehaul',
      },
      {
        id: 'out_delivery',
        title: 'Out for Delivery',
        icon: 'two_wheeler',
        count: outForDeliveryCount,
        percentage: Math.round((outForDeliveryCount / total) * 100),
        color: 'from-amber-500 to-orange-500',
        href: '/operations/delivery-sheet',
        badge: 'Riders',
      },
      {
        id: 'delivered',
        title: 'Delivered',
        icon: 'check_circle',
        count: deliveredCount,
        percentage: Math.round((deliveredCount / total) * 100),
        color: 'from-emerald-500 to-teal-600',
        href: '/orders?status=Delivered',
        badge: 'Completed',
      },
    ];
  }, [parcels]);

  // 4. TOP DESTINATION CITIES
  const topCities: CityData[] = React.useMemo(() => {
    if (parcels.length === 0) return [];

    const cityMap = new Map<
      string,
      { count: number; cod: number; delivered: number }
    >();

    parcels.forEach((p) => {
      const c =
        (p as any).destination_city?.CityName ||
        (p as any).destination_city?.name ||
        (p as any).city ||
        (p as any).destination ||
        (p.recipient_address ? p.recipient_address.split(',').pop()?.trim() : null) ||
        'Karachi';
      const cleanCity = typeof c === 'string' && c.trim() ? c.trim() : 'Karachi';

      const curr = cityMap.get(cleanCity) || { count: 0, cod: 0, delivered: 0 };
      curr.count += 1;
      curr.cod += Number(p.cod_amount) || 0;
      const norm = normalizeShipmentStatus(p.status);
      if (norm === SHIPMENT_STATUSES.DELIVERED) {
        curr.delivered += 1;
      }
      cityMap.set(cleanCity, curr);
    });

    const total = parcels.length || 1;

    return Array.from(cityMap.entries())
      .map(([cityName, data]) => ({
        cityName,
        count: data.count,
        percentage: Number(((data.count / total) * 100).toFixed(1)),
        codAmount: data.cod,
        deliveredCount: data.delivered,
        successRate: data.count > 0 ? Math.round((data.delivered / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [parcels]);

  // 5. TOP SHIPPERS / MERCHANTS
  const topShippers: ShipperData[] = React.useMemo(() => {
    if (parcels.length === 0) return [];

    const shipperMap = new Map<
      string,
      { id?: number | string; count: number; cod: number; name: string }
    >();

    parcels.forEach((p) => {
      const s = (p as any).shipper || (p as any).pickup_location?.shipper;
      const name = s?.name || (s as any)?.company_name || 'Retail Client';
      const id = s?.id;

      const curr = shipperMap.get(name) || { id, count: 0, cod: 0, name };
      curr.count += 1;
      curr.cod += Number(p.cod_amount) || 0;
      shipperMap.set(name, curr);
    });

    const total = parcels.length || 1;

    return Array.from(shipperMap.values())
      .map((item) => ({
        id: item.id,
        name: item.name,
        count: item.count,
        percentage: Number(((item.count / total) * 100).toFixed(1)),
        codAmount: item.cod,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [parcels]);

  // Estimated Freight Revenue (Sum of delivery_charges)
  const totalFreightCharges = React.useMemo(() => {
    return parcels.reduce((sum, p) => sum + (Number(p.delivery_charges) || 250), 0);
  }, [parcels]);

  return (
    <section className="space-y-6 my-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Courier Network Analytics & Insights
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time booking velocity, delivery performance, logistical pipeline funnel, and COD liquidity
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Volume:</span>
            <strong className="text-slate-900 font-bold">{totalVolume.toLocaleString()}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Delivery Rate:</span>
            <strong className="text-emerald-950 font-bold">{deliverySuccessRate}%</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
            <span>COD Flow:</span>
            <strong className="text-blue-950 font-bold">Rs. {totalCodOverall.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Row 1: Volume Over Time (Timeline) + Performance Breakdown (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 cols: Orders Over Time Area Chart */}
        <div className="lg:col-span-7 bg-white border border-outline-variant rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Shipment Booking Velocity</span>
                <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {timelineMode} Trend
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily parcel intake volume across all booking channels
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Daily Average & Peak Indicators */}
              <div className="hidden sm:flex items-center gap-3 text-right">
                <div className="text-[11px]">
                  <span className="text-slate-400">Avg/Day:</span>{' '}
                  <strong className="text-slate-800 font-bold">{averageDaily}</strong>
                </div>
                {peakDayInfo.count > 0 && (
                  <div className="text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-400">Peak:</span>{' '}
                    <strong className="text-emerald-700 font-bold">
                      {peakDayInfo.count} ({peakDayInfo.date})
                    </strong>
                  </div>
                )}
              </div>

              {/* Mode Toggle: Daily vs Weekly */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setTimelineMode('Daily')}
                  className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
                    timelineMode === 'Daily'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineMode('Weekly')}
                  className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
                    timelineMode === 'Weekly'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
          </div>

          {/* SVG Area Chart Container */}
          <div className="relative w-full h-[230px] select-none">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Loading shipment timeline...
              </div>
            ) : activeTimeline.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">timeline</span>
                <span>No bookings recorded in this date range</span>
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="courierTimelineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {yTicks.map((val, idx) => {
                    const ratio = val / maxTimelineCount;
                    const y = padTop + innerH - ratio * innerH;
                    return (
                      <g key={idx}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={chartWidth - padRight}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray={val === 0 ? 'none' : '3 3'}
                          strokeWidth="1"
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          fill="#94a3b8"
                          fontSize="10"
                          fontFamily="sans-serif"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area Fill */}
                  {timelineAreaD && (
                    <path
                      d={timelineAreaD}
                      fill="url(#courierTimelineGradient)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Stroke Line */}
                  {timelinePathD && (
                    <path
                      d={timelinePathD}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Hover Guideline */}
                  {hoveredPoint && (
                    <line
                      x1={hoveredPoint.x}
                      y1={padTop}
                      x2={hoveredPoint.x}
                      y2={padTop + innerH}
                      stroke="#0284c7"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Data Points */}
                  {timelineCoords.map((pt, i) => {
                    const isHovered = hoveredPoint?.label === pt.label;
                    return (
                      <g key={i}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 3.5}
                          fill="#ffffff"
                          stroke="#0284c7"
                          strokeWidth={isHovered ? 3 : 2}
                          className="cursor-pointer transition-all duration-150"
                        />
                        {/* Transparent larger hitbox for easy hovering */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="14"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        {/* X-axis date labels */}
                        {(activeTimeline.length <= 14 || i % Math.ceil(activeTimeline.length / 10) === 0) && (
                          <text
                            x={pt.x}
                            y={padTop + innerH + 18}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="9.5"
                            fontWeight="500"
                            fontFamily="sans-serif"
                          >
                            {pt.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Interactive Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs backdrop-blur-sm transition-all duration-75"
                    style={{
                      left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                      top: `${(hoveredPoint.y / chartHeight) * 100 - 10}%`,
                    }}
                  >
                    <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 mb-1 flex items-center justify-between gap-4">
                      <span>{hoveredPoint.label}</span>
                      <span className="text-[10px] text-sky-400 font-semibold uppercase">Intake</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-300">
                      <span>Shipments:</span>
                      <strong className="text-white font-black">{hoveredPoint.count}</strong>
                    </div>
                    {hoveredPoint.codAmount > 0 && (
                      <div className="flex items-center justify-between gap-3 text-slate-300">
                        <span>Total COD:</span>
                        <strong className="text-emerald-400 font-bold">
                          Rs. {hoveredPoint.codAmount.toLocaleString()}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right 5 cols: Performance Donut & Status Distribution */}
        <div className="lg:col-span-5 bg-white border border-outline-variant rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                Network Status Distribution
              </h3>
              <p className="text-xs text-slate-400">Delivery completion vs pipeline status</p>
            </div>
            <Link
              href="/orders"
              className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
            {/* Donut SVG */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg
                width={donutSize}
                height={donutSize}
                viewBox={`0 0 ${donutSize} ${donutSize}`}
                className="transform -rotate-90 select-none overflow-visible"
              >
                {/* Background Ring */}
                <circle
                  cx={donutCenter}
                  cy={donutCenter}
                  r={donutRadius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth={donutStrokeWidth}
                />

                {/* Slices */}
                {totalVolume > 0 &&
                  computedDonutSlices.map((slice, idx) => {
                    if (slice.percentage <= 0) return null;
                    const isHovered = hoveredDonutKey === slice.key;
                    return (
                      <circle
                        key={idx}
                        cx={donutCenter}
                        cy={donutCenter}
                        r={donutRadius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={isHovered ? donutStrokeWidth + 4 : donutStrokeWidth}
                        strokeDasharray={`${slice.strokeLength} ${donutCircumference - slice.strokeLength}`}
                        strokeDashoffset={slice.strokeDashoffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredDonutKey(slice.key)}
                        onMouseLeave={() => setHoveredDonutKey(null)}
                        onClick={() => router.push(slice.href)}
                      />
                    );
                  })}
              </svg>

              {/* Donut Center KPI */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {deliverySuccessRate}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Delivery Rate
                </span>
              </div>
            </div>

            {/* Interactive Legend List */}
            <div className="w-full flex-1 space-y-2">
              {statusBreakdown.map((s) => {
                const isHovered = hoveredDonutKey === s.key;
                return (
                  <Link
                    key={s.key}
                    href={s.href}
                    onMouseEnter={() => setHoveredDonutKey(s.key)}
                    onMouseLeave={() => setHoveredDonutKey(null)}
                    className={`flex items-center justify-between text-xs px-2.5 py-1 rounded-xl transition-all group ${
                      isHovered ? 'bg-slate-100 scale-102 shadow-2xs' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-semibold text-slate-700 group-hover:text-slate-900 truncate">
                        {s.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-bold tabular-nums shrink-0">
                      <span className="text-slate-900">{s.count.toLocaleString()}</span>
                      <span className="text-slate-400 text-[11px] font-normal w-9 text-right">
                        {s.percentage}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Logistics Pipeline Flow Funnel + COD Financial Liquidity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 cols: Operations Pipeline Funnel */}
        <div className="lg:col-span-6 bg-white border border-outline-variant rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Shipment Pipeline Progression</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  5 Stage Journey
                </span>
              </h3>
              <p className="text-xs text-slate-400">Stage-by-stage physical movement through courier network</p>
            </div>
          </div>

          <div className="space-y-3.5 my-auto">
            {pipelineSteps.map((step, idx) => (
              <Link
                key={step.id}
                href={step.href}
                className="block group bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 p-3 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs group-hover:border-primary group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">
                        {idx + 1}. {step.title}
                      </span>
                      <span className="ml-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {step.badge}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{step.count.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-slate-400 w-10 text-right">
                      {step.percentage}%
                    </span>
                  </div>
                </div>

                {/* Flow Bar */}
                <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${step.color} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min(step.percentage, 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Stage conversion rate based on live scanned parcels</span>
            <Link href="/operations/arrivals" className="text-primary font-bold hover:underline flex items-center gap-1">
              <span>Arrivals Hub</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Right 6 cols: COD Financial Health & Liquidity */}
        <div className="lg:col-span-6 bg-white border border-outline-variant rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>COD Financial Liquidity & Remittances</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Cash Flow
                </span>
              </h3>
              <p className="text-xs text-slate-400">Cash-on-delivery tracking & courier revenue reconciliation</p>
            </div>
            <Link
              href="/orders"
              className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Reconcile</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Total Expected COD */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Total Booked COD</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">account_balance</span>
              </div>
              <p className="text-lg font-black text-slate-900 tabular-nums">
                Rs. {totalCodOverall.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Gross consignment value</p>
            </div>

            {/* Collected COD */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Collected (Delivered)</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">payments</span>
              </div>
              <p className="text-lg font-black text-emerald-900 tabular-nums">
                Rs. {totalCodDelivered.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                {totalCodOverall > 0
                  ? `${Math.round((totalCodDelivered / totalCodOverall) * 100)}% remittance ready`
                  : '0%'}
              </p>
            </div>

            {/* Floating In-Transit COD */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>In-Transit COD</span>
                <span className="material-symbols-outlined text-[16px] text-blue-600">local_shipping</span>
              </div>
              <p className="text-lg font-black text-blue-900 tabular-nums">
                Rs. {totalCodInTransit.toLocaleString()}
              </p>
              <p className="text-[10px] text-blue-700 mt-0.5">Floating with riders / linehaul</p>
            </div>

            {/* Returned COD */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Returned / Cancelled</span>
                <span className="material-symbols-outlined text-[16px] text-rose-600">assignment_return</span>
              </div>
              <p className="text-lg font-black text-rose-900 tabular-nums">
                Rs. {totalCodReturned.toLocaleString()}
              </p>
              <p className="text-[10px] text-rose-700 mt-0.5">Unrealized consignment value</p>
            </div>
          </div>

          {/* COD Recovery Rate Progress Bar */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-700">Cash Realization Efficiency:</span>
              <span className="font-extrabold text-emerald-700">
                {totalCodOverall > 0
                  ? `${((totalCodDelivered / totalCodOverall) * 100).toFixed(1)}% Collected`
                  : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${totalCodOverall > 0 ? (totalCodDelivered / totalCodOverall) * 100 : 0}%`,
                }}
                title="Delivered COD"
              />
              <div
                className="bg-blue-400 h-full transition-all duration-500"
                style={{
                  width: `${totalCodOverall > 0 ? (totalCodInTransit / totalCodOverall) * 100 : 0}%`,
                }}
                title="In-Transit COD"
              />
              <div
                className="bg-rose-400 h-full transition-all duration-500"
                style={{
                  width: `${totalCodOverall > 0 ? (totalCodReturned / totalCodOverall) * 100 : 0}%`,
                }}
                title="Returned COD"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Collected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> In Transit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Returned
              </span>
              <span className="font-bold text-slate-700">
                Freight Earned: Rs. {totalFreightCharges.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Destination Cities & Top Merchants by Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 cols: Top Destination Cities */}
        <div className="lg:col-span-6 bg-white border border-outline-variant rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Top Regional Hubs & Destinations</span>
                <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                  City Analytics
                </span>
              </h3>
              <p className="text-xs text-slate-400">Top delivery destinations ranked by parcel density</p>
            </div>
            <Link
              href="/customer-service/arrival-summary"
              className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Hubs Summary</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-3.5 my-auto">
            {topCities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No destination records found for this period
              </div>
            ) : (
              topCities.map((city, idx) => (
                <Link
                  key={idx}
                  href={`/orders?city=${encodeURIComponent(city.cityName)}`}
                  className="block group bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 p-3 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-800 group-hover:text-primary transition-colors">
                        {city.cityName}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {city.successRate}% Success
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-slate-900">{city.count.toLocaleString()} pkgs</span>
                      <span className="text-slate-400 font-medium text-[11px]">({city.percentage}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-out group-hover:bg-primary-hover"
                      style={{ width: `${Math.min(city.percentage * 2, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-medium">
                    <span>COD: Rs. {city.codAmount.toLocaleString()}</span>
                    <span>Delivered: {city.deliveredCount}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right 6 cols: Top Shippers / Merchants */}
        <div className="lg:col-span-6 bg-white border border-outline-variant rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Top Merchant Accounts by Volume</span>
                <span className="text-[10px] font-bold text-violet-800 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                  Shipper Accounts
                </span>
              </h3>
              <p className="text-xs text-slate-400">Highest volume business shippers on your courier network</p>
            </div>
            <Link
              href="/administration/employees?type=shipper"
              className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5"
            >
              <span>All Merchants</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-3.5 my-auto">
            {topShippers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No shipper booking records found for this period
              </div>
            ) : (
              topShippers.map((shipper, idx) => (
                <div
                  key={idx}
                  onClick={() => router.push('/orders')}
                  className="block group bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 p-3 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2.5 font-bold">
                      <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-800 text-[10px] flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-800 group-hover:text-primary transition-colors">
                        {shipper.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-slate-900">{shipper.count.toLocaleString()} orders</span>
                      <span className="text-slate-400 font-medium text-[11px]">({shipper.percentage}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-violet-600 h-full rounded-full transition-all duration-500 ease-out group-hover:bg-violet-700"
                      style={{ width: `${Math.min(shipper.percentage * 2, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-medium">
                    <span>Total Booked COD: Rs. {shipper.codAmount.toLocaleString()}</span>
                    <span className="text-primary font-bold group-hover:underline">View Consignments →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

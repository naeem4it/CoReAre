'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Package, 
  Clock, 
  Building2, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Undo2, 
  RefreshCw, 
  AlertTriangle, 
  Ban,
  Layers
} from 'lucide-react';

export interface ShipperMetricItem {
  key: string;
  label: string;
  value: number;
  percentage: number;
  codAmount: number;
  queryStatus?: string;
}

export interface ShipperStatsGridProps {
  metrics: {
    totalBooking: ShipperMetricItem;
    notArrived: ShipperMetricItem;
    pickedUpByRider: ShipperMetricItem;
    arrivedAtWarehouse: ShipperMetricItem;
    inTransit: ShipperMetricItem;
    arrivedAtDestination: ShipperMetricItem;
    outForDelivery: ShipperMetricItem;
    delivered: ShipperMetricItem;
    deliveryFailed: ShipperMetricItem;
    readyForReturn: ShipperMetricItem;
    returnedToShipper: ShipperMetricItem;
    lostDamage: ShipperMetricItem;
    cancelled: ShipperMetricItem;
  };
  isLoading?: boolean;
}

interface StatCardItem {
  icon: any;
  isPrimaryDark?: boolean;
  iconColor?: string;
  bottomBarColor?: string;
  href: string;
  key?: string;
  label: string;
  value: number;
  percentage?: number;
  codAmount?: number;
  queryStatus?: string;
}

export function ShipperStatsGrid({ metrics, isLoading = false }: ShipperStatsGridProps) {
  const formatRs = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US')}`;
  };

  const cards: StatCardItem[] = [
    // 1. TOTAL BOOKING
    {
      ...metrics.totalBooking,
      icon: Layers,
      isPrimaryDark: true,
      href: '/merchant/orders',
    },
    // 2. NOT ARRIVED
    {
      ...metrics.notArrived,
      icon: Clock,
      href: '/merchant/orders?status=Not+Arrived',
    },
    // 3. PICKED UP BY RIDER
    {
      ...metrics.pickedUpByRider,
      icon: Package,
      href: '/merchant/orders?status=Picked+up+by+rider',
    },
    // 4. ARRIVED AT WAREHOUSE
    {
      ...metrics.arrivedAtWarehouse,
      icon: Building2,
      href: '/merchant/orders?status=Arrived+at+warehouse+(Origin)',
    },
    // 5. IN TRANSIT
    {
      ...metrics.inTransit,
      icon: Truck,
      href: '/merchant/orders?status=In+Transit',
    },
    // 6. ARRIVED AT DESTINATION
    {
      ...metrics.arrivedAtDestination,
      icon: MapPin,
      href: '/merchant/orders?status=Arrived+at+warehouse+(Dest)',
    },
    // 7. OUT FOR DELIVERY
    {
      ...metrics.outForDelivery,
      icon: Truck,
      href: '/merchant/orders?status=Out+for+Delivery',
    },
    // 8. DELIVERED
    {
      ...metrics.delivered,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      bottomBarColor: 'bg-emerald-600',
      href: '/merchant/orders?status=Delivered',
    },
    // 9. DELIVERY FAILED
    {
      ...metrics.deliveryFailed,
      icon: XCircle,
      iconColor: 'text-rose-600',
      bottomBarColor: 'bg-rose-600',
      href: '/merchant/orders?status=Delivery+Failed',
    },
    // 10. READY FOR RETURN
    {
      ...metrics.readyForReturn,
      icon: Undo2,
      iconColor: 'text-amber-600',
      bottomBarColor: 'bg-amber-600',
      href: '/merchant/orders?status=Ready+for+Return',
    },
    // 11. RETURNED TO SHIPPER
    {
      ...metrics.returnedToShipper,
      icon: RefreshCw,
      href: '/merchant/orders?status=Return+to+Shipper',
    },
    // 12. LOST / DAMAGE
    {
      ...metrics.lostDamage,
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      href: '/merchant/orders?status=Lost+/+Damage',
    },
    // 13. CANCELLED
    {
      ...metrics.cancelled,
      icon: Ban,
      href: '/merchant/orders?status=Cancelled',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-6">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;

        if (card.isPrimaryDark) {
          return (
            <Link
              key={card.key || idx}
              href={card.href}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0c3832] via-[#092b26] to-[#041a17] text-white p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-emerald-950/40 flex flex-col justify-between min-h-[128px]"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-emerald-300">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-200/90 truncate">
                    {card.label}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-8 h-8 bg-white/20 animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs font-semibold text-emerald-100/90">
                {isLoading ? (
                  <span className="inline-block w-16 h-3 bg-white/10 animate-pulse rounded" />
                ) : (
                  formatRs(card.codAmount || 0)
                )}
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={card.key || idx}
            href={card.href}
            className="group relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-4 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between min-h-[128px]"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <IconComponent className={`w-3.5 h-3.5 shrink-0 ${card.iconColor || 'text-slate-400'}`} />
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate">
                    {card.label}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                  {isLoading ? '-%' : `${card.percentage}%`}
                </span>
              </div>

              <div className="text-3xl font-bold text-slate-800 tracking-tight mt-1">
                {isLoading ? (
                  <span className="inline-block w-6 h-7 bg-slate-200 animate-pulse rounded" />
                ) : (
                  <span className={card.value > 0 ? 'text-slate-900' : 'text-slate-400'}>
                    {card.value}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                {isLoading ? (
                  <span className="inline-block w-12 h-3 bg-slate-100 animate-pulse rounded" />
                ) : (
                  formatRs(card.codAmount || 0)
                )}
              </div>

              {card.bottomBarColor && card.value > 0 && (
                <div className={`h-1 ${card.bottomBarColor} rounded-full w-20 mt-2.5`} />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

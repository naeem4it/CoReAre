'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { normalizeShipmentStatus, SHIPMENT_STATUSES } from '@/shared/constants/shipment-statuses';

export interface LatestOrderRecord {
  id: string | number;
  trackingNumber: string;
  formattedDate: string;
  status: string;
  codAmount: number;
}

interface ShipperLatestOrdersProps {
  orders: LatestOrderRecord[];
}

export function ShipperLatestOrders({ orders }: ShipperLatestOrdersProps) {
  const getStatusBadge = (status: string) => {
    const norm = normalizeShipmentStatus(status);

    if (norm === SHIPMENT_STATUSES.DELIVERED) {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          Delivered
        </span>
      );
    }
    if (norm === SHIPMENT_STATUSES.DELIVERY_FAILED) {
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          Delivery failed
        </span>
      );
    }
    if (norm === SHIPMENT_STATUSES.READY_FOR_RETURN) {
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          Ready for return
        </span>
      );
    }
    if (norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY) {
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          Out for delivery
        </span>
      );
    }
    if (norm === SHIPMENT_STATUSES.IN_TRANSIT) {
      return (
        <span className="bg-cyan-50 text-cyan-700 border border-cyan-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          In transit
        </span>
      );
    }
    if (norm === SHIPMENT_STATUSES.RETURN_TO_SHIPPER) {
      return (
        <span className="bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          Returned
        </span>
      );
    }
    if (norm === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER) {
      return (
        <span className="bg-teal-50 text-teal-700 border border-teal-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          Picked up
        </span>
      );
    }

    return (
      <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs h-full flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-base text-slate-800 tracking-tight mb-4">
          Latest orders
        </h3>

        <div className="divide-y divide-slate-100">
          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent orders found
            </div>
          ) : (
            orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-1"
              >
                <div className="min-w-0">
                  <Link
                    href={`/orders?search=${encodeURIComponent(order.trackingNumber)}`}
                    className="font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-800 transition-colors block truncate"
                  >
                    {order.trackingNumber}
                  </Link>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {order.formattedDate}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div>{getStatusBadge(order.status)}</div>
                  <div className="text-right min-w-[70px]">
                    <span className="font-bold text-xs sm:text-sm text-slate-800">
                      Rs {order.codAmount.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 mt-2 text-center">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 transition-colors"
        >
          View all orders <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

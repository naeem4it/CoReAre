'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Package, Truck, Clock, BarChart3, Plus, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { apiClient } from '@/shared/api/api-client';

interface Parcel {
  id: number;
  tracking_number?: string;
  status?: string;
  cod_amount?: number | string;
  delivery_charges?: number | string;
  recipient_name?: string;
  recipient_address?: string;
  destination_city?: { name?: string; CityName?: string };
  createdAt?: string;
}

export default function CourierDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [parcels, setParcels] = React.useState<Parcel[]>([]);
  const [riderCount, setRiderCount] = React.useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [parcelsRes, ridersRes] = await Promise.allSettled([
        apiClient.get('/parcels?populate=*&pagination[limit]=1000&sort[0]=createdAt:desc'),
        apiClient.get('/users?populate=role_definition'),
      ]);

      if (parcelsRes.status === 'fulfilled') {
        const pData = parcelsRes.value.data?.data || parcelsRes.value.data || [];
        setParcels(Array.isArray(pData) ? pData : []);
      }

      if (ridersRes.status === 'fulfilled') {
        const uData = ridersRes.value.data || [];
        if (Array.isArray(uData)) {
          const riders = uData.filter((u: any) => 
            u.role_definition?.some((r: any) => (r.role_name || '').toLowerCase().includes('rider')) ||
            (u.role?.name || '').toLowerCase().includes('rider')
          );
          setRiderCount(riders.length);
        }
      }
    } catch (err) {
      console.warn('Failed to load courier dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const metrics = React.useMemo(() => {
    const total = parcels.length;
    const delivered = parcels.filter(p => (p.status || '').toLowerCase() === 'delivered').length;
    const pending = parcels.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'not arrived' || s === 'booked' || s === 'total booking' || !s;
    }).length;
    const inTransit = parcels.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'arrived' || s === 'arrived at destination' || s === 'out for delivery';
    }).length;
    const returned = parcels.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s.includes('return') || s.includes('failed');
    }).length;
    const active = total - delivered - returned;

    const totalCOD = parcels.reduce((sum, p) => sum + (Number(p.cod_amount) || 0), 0);

    return {
      total,
      active: Math.max(0, active),
      delivered,
      pending,
      inTransit,
      returned,
      totalCOD,
    };
  }, [parcels]);

  const stats = [
    { 
      label: 'Active Shipments', 
      value: loading ? '-' : metrics.active.toLocaleString(), 
      subtext: `${metrics.total.toLocaleString()} total logged`,
      icon: Package, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Riders in Fleet', 
      value: loading ? '-' : riderCount.toLocaleString(), 
      subtext: 'Operational dispatch',
      icon: Truck, 
      color: 'text-emerald-600' 
    },
    { 
      label: 'Pending Pickups', 
      value: loading ? '-' : metrics.pending.toLocaleString(), 
      subtext: 'Awaiting arrival at hub',
      icon: Clock, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Total COD Value', 
      value: loading ? '-' : `Rs. ${metrics.totalCOD.toLocaleString()}`, 
      subtext: 'Under management',
      icon: BarChart3, 
      color: 'text-amber-600' 
    },
  ];

  const recentParcels = React.useMemo(() => parcels.slice(0, 5), [parcels]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Courier Operations Dashboard
            {loading && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
          </h1>
          <p className="text-slate-500">Live operational monitoring of shipments, fleet, and status distribution.</p>
        </div>
        <Link href="/courier/shipments/book">
          <Button className="rounded-xl shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <Plus className="h-5 w-5 mr-2" /> Book Shipment
          </Button>
        </Link>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} hoverEffect className="border border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {loading ? <span className="inline-block w-16 h-7 bg-slate-100 animate-pulse rounded" /> : stat.value}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {stat.subtext}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Status Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="min-h-[300px] border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Delivery Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                <span className="text-xs font-medium">Loading distribution...</span>
              </div>
            ) : metrics.total === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm italic">
                No shipments logged yet. Book your first parcel above.
              </div>
            ) : (
              <>
                {/* Delivered */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered ({metrics.delivered})
                    </span>
                    <span className="text-slate-500 font-medium">
                      {((metrics.delivered / metrics.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${(metrics.delivered / metrics.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* In Transit */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" /> In Transit / Arrived ({metrics.inTransit})
                    </span>
                    <span className="text-slate-500 font-medium">
                      {((metrics.inTransit / metrics.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${(metrics.inTransit / metrics.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pending */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Pickup / Not Arrived ({metrics.pending})
                    </span>
                    <span className="text-slate-500 font-medium">
                      {((metrics.pending / metrics.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                      style={{ width: `${(metrics.pending / metrics.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Returns */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-rose-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-rose-600" /> Returns / Failed ({metrics.returned})
                    </span>
                    <span className="text-slate-500 font-medium">
                      {((metrics.returned / metrics.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                      style={{ width: `${(metrics.returned / metrics.total) * 100}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Shipments Feed */}
        <Card className="min-h-[300px] border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" /> Recent Bookings
            </CardTitle>
            <Link 
              href="/courier/shipments/book"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                <span className="text-xs font-medium">Loading shipments...</span>
              </div>
            ) : recentParcels.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm italic">
                No recent shipments found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentParcels.map((p) => {
                  const s = p.status || 'Booked';
                  const isDelivered = s.toLowerCase() === 'delivered';
                  const isTransit = ['arrived', 'out for delivery'].some(t => s.toLowerCase().includes(t));
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          #{p.tracking_number || `DBA-${p.id}`}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.recipient_name || p.destination_city?.name || 'Local Destination'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isDelivered 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isTransit 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {s}
                        </span>
                        <div className="text-xs font-bold text-slate-700 mt-1">
                          Rs. {Number(p.cod_amount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

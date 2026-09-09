'use client';

import * as React from 'react';
import { 
  Search, 
  BarChart3, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Package, 
  ArrowLeftRight,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';

interface ParcelItem {
  id: number;
  tracking_number?: string;
  status?: string;
  cod_amount?: number | string;
  delivery_charges?: number | string;
  createdAt?: string;
  destination_city?: { id: number; name?: string; CityName?: string };
  recipient_address?: string;
}

export default function MerchantDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [allParcels, setAllParcels] = React.useState<ParcelItem[]>([]);
  const [availableCities, setAvailableCities] = React.useState<string[]>([]);
  
  // Filters
  const [fromDate, setFromDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCity, setSelectedCity] = React.useState('All');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/parcels?populate=*&pagination[limit]=1000');
      const data = res.data?.data || res.data || [];
      const parcels: ParcelItem[] = Array.isArray(data) ? data : [];
      setAllParcels(parcels);

      // Extract unique destination cities
      const citiesSet = new Set<string>();
      parcels.forEach((p) => {
        const cName = p.destination_city?.name || p.destination_city?.CityName;
        if (cName && typeof cName === 'string') {
          citiesSet.add(cName.trim());
        }
      });
      setAvailableCities(Array.from(citiesSet).sort());
    } catch (err) {
      console.warn('Could not fetch live dashboard parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter parcels based on date range and selected city
  const filteredParcels = React.useMemo(() => {
    return allParcels.filter((p) => {
      // Date filter
      if (p.createdAt) {
        const itemDate = p.createdAt.split('T')[0];
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }

      // City filter
      if (selectedCity !== 'All') {
        const cName = p.destination_city?.name || p.destination_city?.CityName || '';
        if (cName.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allParcels, fromDate, toDate, selectedCity]);

  // Compute metrics dynamically
  const metrics = React.useMemo(() => {
    const calc = (predicate: (p: ParcelItem) => boolean) => {
      const matched = filteredParcels.filter(predicate);
      const count = matched.length;
      const codSum = matched.reduce((acc, p) => acc + (Number(p.cod_amount) || 0), 0);
      return {
        count: count.toLocaleString(),
        codText: `(Rs. ${codSum.toLocaleString()})`,
      };
    };

    const normalizeStatus = (status?: string) => (status || '').trim().toLowerCase();

    return {
      total: calc(() => true),
      notArrived: calc((p) => {
        const s = normalizeStatus(p.status);
        return s === 'not arrived' || s === 'booked' || s === 'total booking' || !s;
      }),
      arrived: calc((p) => normalizeStatus(p.status) === 'arrived'),
      arrivedAtDest: calc((p) => normalizeStatus(p.status) === 'arrived at destination'),
      outForDelivery: calc((p) => normalizeStatus(p.status) === 'out for delivery'),
      delivered: calc((p) => normalizeStatus(p.status) === 'delivered'),
      failedAttempt: calc((p) => normalizeStatus(p.status) === 'failed attempt'),
      readyToReturn: calc((p) => normalizeStatus(p.status) === 'ready to return'),
      returnDispatched: calc((p) => normalizeStatus(p.status) === 'return dispatched'),
      returnToShipper: calc((p) => {
        const s = normalizeStatus(p.status);
        return s === 'return to shipper' || s === 'returned';
      }),
    };
  }, [filteredParcels]);

  const statCards = [
    { label: 'Total Shipments', value: metrics.total.count, subtext: metrics.total.codText, icon: BarChart3, color: 'text-blue-600' },
    { label: 'Not Arrived', value: metrics.notArrived.count, subtext: metrics.notArrived.codText, icon: Package, color: 'text-amber-600' },
    { label: 'Arrived', value: metrics.arrived.count, subtext: metrics.arrived.codText, icon: MapPin, color: 'text-indigo-600' },
    { label: 'Arrived At Destination', value: metrics.arrivedAtDest.count, subtext: metrics.arrivedAtDest.codText, icon: CheckCircle2, color: 'text-cyan-600' },
    { label: 'Out For Delivery', value: metrics.outForDelivery.count, subtext: metrics.outForDelivery.codText, icon: Truck, color: 'text-orange-600' },
    { label: 'Delivered', value: metrics.delivered.count, subtext: metrics.delivered.codText, icon: Package, color: 'text-emerald-600' },
    { label: 'Failed Attempt', value: metrics.failedAttempt.count, subtext: metrics.failedAttempt.codText, icon: XCircle, color: 'text-rose-600' },
    { label: 'Ready To Return', value: metrics.readyToReturn.count, subtext: metrics.readyToReturn.codText, icon: RefreshCcw, color: 'text-purple-600' },
    { label: 'Return Dispatched', value: metrics.returnDispatched.count, subtext: metrics.returnDispatched.codText, icon: ArrowLeftRight, color: 'text-pink-600' },
    { label: 'Return To Shipper', value: metrics.returnToShipper.count, subtext: metrics.returnToShipper.codText, icon: ArrowLeftRight, color: 'text-red-700' },
  ];

  const shipperBusinessName = user?.fullName || user?.username || 'Fly International';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
          <div className="border-b border-slate-200 bg-[#191f60] px-6 py-4 text-white flex items-center justify-between">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Merchant Dashboard
            </h1>
            {loading && (
              <span className="text-xs flex items-center gap-1.5 text-blue-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live syncing data...
              </span>
            )}
          </div>

          <div className="px-6 py-8 sm:px-10">
            {/* Header and Filter Controls */}
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Welcome to</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {shipperBusinessName} <span className="font-black">- Logistics Portal</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Viewing live shipment performance & COD collections from your database.
                </p>
              </div>

              <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(0,180px)_minmax(0,180px)_auto]">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">From Date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">To Date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </label>
                <button 
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="inline-flex h-11 self-end items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Refresh
                </button>
              </div>
            </div>

            {/* City Dropdown Filter */}
            <div className="mb-8 flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" /> Filter by City:
              </div>
              <div className="w-full sm:w-[240px]">
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-semibold cursor-pointer"
                >
                  <option value="All">All Cities ({allParcels.length} total parcels)</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ml-auto text-xs font-medium text-slate-500">
                Displaying <span className="font-bold text-slate-900">{filteredParcels.length}</span> matching shipments
              </div>
            </div>

            {/* Metric KPI Tiles */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={item.label} 
                    className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
                  >
                    <div className="h-2 bg-[#191f60]" />
                    <div className="px-5 py-6 sm:px-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#191f60] shadow-xs">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-slate-900 tracking-tight">
                            {loading ? (
                              <span className="inline-block w-12 h-8 bg-slate-200 animate-pulse rounded" />
                            ) : (
                              item.value
                            )}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {loading ? (
                              <span className="inline-block w-20 h-4 bg-slate-100 animate-pulse rounded mt-1" />
                            ) : (
                              item.subtext
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';

type OrderRow = {
  id: number | string;
  trackingNumber: string;
  customerName: string;
  avatar: string;
  origin: string;
  destination: string;
  address: string;
  status: 'Total Booking' | 'Not Arrived' | 'Arrived' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper' | 'booked' | string;
  eta: string;
};

const FALLBACK_ROWS: OrderRow[] = [
  {
    id: 1,
    trackingNumber: 'FL-9283-XK',
    customerName: 'Jameson Distilleries',
    avatar: 'JD',
    origin: 'Seattle',
    destination: 'WA',
    address: '482 Industrial Way, Port of Seattle, WA 98134',
    status: 'Out For delivery',
    eta: 'Today, 18:45',
  },
  {
    id: 2,
    trackingNumber: 'FL-1104-ZA',
    customerName: 'TechCorp Logistics',
    avatar: 'TC',
    origin: 'Palo Alto',
    destination: 'CA',
    address: '92 Innovation Blvd, Palo Alto, CA 94304',
    status: 'Delivered',
    eta: 'May 14, 09:20',
  },
  {
    id: 3,
    trackingNumber: 'FL-8742-MM',
    customerName: 'Global Solar Inc.',
    avatar: 'GS',
    origin: 'Phoenix',
    destination: 'AZ',
    address: '11 Energy Park, Phoenix, AZ 85001',
    status: 'booked',
    eta: 'Tomorrow, 14:00',
  },
];

export default function OrderList() {
  const [data, setData] = React.useState<OrderRow[]>(FALLBACK_ROWS);
  const [filteredData, setFilteredData] = React.useState<OrderRow[]>(FALLBACK_ROWS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchParcels = async () => {
      try {
        const response = await apiClient.get<StrapiCollectionResponse<Parcel>>('/parcels?populate=*');
        const parcels = response.data?.data || [];
        
        if (parcels.length > 0) {
          const mapped: OrderRow[] = parcels.map((item: Parcel) => {
            const customerName = item.recipient_name || 'Unknown';
            const initials = customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'UN';
            const destination = item.recipient_address?.split(',').pop()?.trim() || 'Unknown';
            
            let uiStatus = item.status || 'booked';
            if (uiStatus === 'Total Booking') uiStatus = 'booked';
            
            return {
              id: item.id,
              trackingNumber: `${item.tracking_number}`,
              customerName,
              avatar: initials,
              origin: 'Karachi',
              destination,
              address: item.recipient_address || 'No address provided',
              status: uiStatus,
              eta: new Date(item.createdAt).toLocaleDateString(),
            };
          });
          setData(mapped);
          setFilteredData(mapped);
        }
      } catch (error) {
        console.warn('Could not fetch orders, using fallback data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParcels();
  }, []);

  React.useEffect(() => {
    if (!searchQuery) {
      setFilteredData(data);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = data.filter(
        (row) =>
          row.trackingNumber.toLowerCase().includes(lower) ||
          row.customerName.toLowerCase().includes(lower) ||
          row.address.toLowerCase().includes(lower) ||
          row.status.toLowerCase().includes(lower)
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, data]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('out') || s.includes('transit')) {
      return (
        <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-700 animate-pulse"></span>
          In Transit
        </span>
      );
    }
    if (s.includes('delivered') || s.includes('arrived')) {
      return (
        <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-green-100 text-green-700 font-bold text-[10px] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-700"></span>
          Delivered
        </span>
      );
    }
    if (s.includes('fail') || s.includes('return') || s.includes('delay')) {
      return (
        <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-error-container text-on-error-container font-bold text-[10px] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-700"></span>
        {status}
      </span>
    );
  };

  return (
    <PortalLayout>
      <div className="p-lg max-w-[1400px] mx-auto w-full space-y-lg">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <div className="flex items-center gap-xs text-secondary mb-xs">
              <span className="font-label-md text-label-md">Main Fleet</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-label-md text-label-md text-primary font-bold">Order Management</span>
            </div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Order Management</h2>
            <p className="font-body-md text-body-md text-secondary mt-xs">Real-time oversight of all active and historical logistical movements.</p>
          </div>
          <div className="flex items-center gap-sm">
            <button className="flex items-center gap-xs px-md py-sm bg-surface-container-highest text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-dim transition-colors active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined">print</span>
              Batch Print
            </button>
            <button className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:brightness-110 shadow-sm transition-all active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined">ios_share</span>
              Export Data
            </button>
          </div>
        </div>

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <div>
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">In Transit</p>
              <p className="font-display-lg text-display-lg mt-xs">{isLoading ? '-' : data.filter(d => d.status.toLowerCase().includes('out')).length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <div>
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Processing</p>
              <p className="font-display-lg text-display-lg mt-xs">{isLoading ? '-' : data.filter(d => d.status.toLowerCase().includes('booked')).length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined">sync</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <div>
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Delivered</p>
              <p className="font-display-lg text-display-lg mt-xs">{isLoading ? '-' : data.filter(d => d.status.toLowerCase().includes('delivered')).length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <div>
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Issues</p>
              <p className="font-display-lg text-display-lg mt-xs text-error">{isLoading ? '-' : data.filter(d => d.status.toLowerCase().includes('fail') || d.status.toLowerCase().includes('return')).length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-on-error-container">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div className="p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest">
            <div className="flex items-center gap-md">
              <div className="flex border border-outline-variant rounded-lg overflow-hidden">
                <button className="px-md py-xs bg-surface-container-high font-label-md text-label-md font-bold cursor-pointer">Active</button>
                <button className="px-md py-xs hover:bg-surface-container-low font-label-md text-label-md text-secondary transition-colors cursor-pointer">Pending</button>
                <button className="px-md py-xs hover:bg-surface-container-low font-label-md text-label-md text-secondary transition-colors cursor-pointer">Archived</button>
              </div>
              <div className="relative">
                <select className="appearance-none bg-surface-container-low border border-outline-variant rounded-lg pl-sm pr-xl py-xs font-label-md text-label-md focus:ring-primary-container outline-none cursor-pointer">
                  <option>Sort by: Newest</option>
                  <option>Sort by: Oldest</option>
                  <option>Status</option>
                </select>
                <span className="material-symbols-outlined absolute right-xs top-1/2 -translate-y-1/2 pointer-events-none text-outline text-[16px]">expand_more</span>
              </div>
            </div>
            <div className="text-secondary font-body-md text-body-md flex items-center gap-sm">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-sm border border-outline-variant rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
              </div>
              <div>
                Showing <span className="text-on-surface font-bold">1 - {filteredData.length}</span> of {data.length} orders
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low font-label-md text-label-md text-secondary uppercase tracking-tighter">
                <tr>
                  <th className="px-md py-sm font-semibold w-12">
                    <input className="rounded-sm border-outline text-primary focus:ring-primary-container cursor-pointer" type="checkbox" />
                  </th>
                  <th className="px-md py-sm font-semibold">Booking #</th>
                  <th className="px-md py-sm font-semibold">Name</th>
                  <th className="px-md py-sm font-semibold">Consignee Address</th>
                  <th className="px-md py-sm font-semibold">Status</th>
                  <th className="px-md py-sm font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-tabular-nums text-tabular-nums divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-md py-xl text-center text-secondary">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-md py-xl text-center text-secondary">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-md py-md">
                        <input className="rounded-sm border-outline text-primary focus:ring-primary-container cursor-pointer" type="checkbox" />
                      </td>
                      <td className="px-md py-md">
                        <span className="font-bold text-primary hover:underline cursor-pointer">{row.trackingNumber}</span>
                      </td>
                      <td className="px-md py-md">
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">{row.avatar}</div>
                          <span>{row.customerName}</span>
                        </div>
                      </td>
                      <td className="px-md py-md text-secondary max-w-xs truncate">
                        {row.address}
                      </td>
                      <td className="px-md py-md">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="px-md py-md text-right">
                        <div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline cursor-pointer">visibility</button>
                          <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline cursor-pointer">edit</button>
                          <button className="material-symbols-outlined p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline cursor-pointer">more_vert</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-md flex items-center justify-between bg-surface-container-low border-t border-outline-variant">
            <button className="flex items-center gap-xs px-md py-xs hover:bg-surface-container-highest rounded transition-colors text-secondary font-label-md text-label-md cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              Previous
            </button>
            <div className="flex items-center gap-xs">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-bold text-[12px] cursor-pointer">1</button>
            </div>
            <button className="flex items-center gap-xs px-md py-xs hover:bg-surface-container-highest rounded transition-colors text-secondary font-label-md text-label-md cursor-pointer">
              Next
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Operational Insights (Asymmetric Layout) */}
        <div className="flex flex-col xl:flex-row gap-lg">
          <div className="flex-grow bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
            <h3 className="font-headline-md text-headline-md mb-md">Delivery Performance Trends</h3>
            <div className="h-48 flex items-end justify-between gap-sm px-md">
              <div className="w-full bg-primary/20 rounded-t h-3/4 hover:bg-primary transition-colors cursor-help group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Mon: 84%</div>
              </div>
              <div className="w-full bg-primary/20 rounded-t h-4/5 hover:bg-primary transition-colors cursor-help group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Tue: 91%</div>
              </div>
              <div className="w-full bg-primary/20 rounded-t h-2/3 hover:bg-primary transition-colors cursor-help group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Wed: 78%</div>
              </div>
              <div className="w-full bg-primary/20 rounded-t h-5/6 hover:bg-primary transition-colors cursor-help group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Thu: 94%</div>
              </div>
              <div className="w-full bg-primary/20 rounded-t h-full hover:bg-primary transition-colors cursor-help group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Fri: 98%</div>
              </div>
            </div>
            <div className="flex justify-between mt-sm font-label-md text-label-md text-secondary">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
            </div>
          </div>
          <div className="xl:w-80 bg-primary-container text-on-primary-container rounded-xl p-md flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="font-label-md text-label-md uppercase font-bold">AI Logistics Tip</span>
              </div>
              <p className="font-body-md text-body-md opacity-90">Based on historical traffic and weather patterns, shifting departures for Chicago by <span className="font-bold underline">45 minutes</span> could improve delivery reliability by 12% today.</p>
            </div>
            <button className="mt-md w-full bg-white/20 hover:bg-white/30 py-sm rounded-lg font-bold text-tabular-nums text-tabular-nums transition-colors cursor-pointer">Apply Route Optimization</button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

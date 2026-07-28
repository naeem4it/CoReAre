'use client';

import * as React from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';
import { useAuth } from '@/components/AuthProvider';
import { Printer, Search, X, Package, Check, Layers, ChevronRight, Eye, Edit2, Plus } from 'lucide-react';

type OrderRow = {
  id: number | string;
  trackingNumber: string;
  customerName: string;
  avatar: string;
  phone: string;
  origin: string;
  destination: string;
  address: string;
  shipperName: string;
  shipperAddress: string;
  codAmount: number;
  weightKg: number;
  status: string;
  dateCreated: string;
};

export default function OrderList() {
  const { user, activeBusinessId } = useAuth();
  const [data, setData] = React.useState<OrderRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Individual Order Label Print Modal State
  const [printOrder, setPrintOrder] = React.useState<OrderRow | null>(null);

  const isShipper = React.useMemo(() => {
    if (!user) return false;
    const hasShipperRelation = !!(user.shipper && (Array.isArray(user.shipper) ? user.shipper.length > 0 : true));
    const hasShipperRoles = Array.isArray(user.shipper_roles) && user.shipper_roles.length > 0;
    return hasShipperRelation || hasShipperRoles;
  }, [user]);

  const shipperId = React.useMemo(() => {
    if (activeBusinessId) return activeBusinessId;
    if (user?.shipper) {
      if (Array.isArray(user.shipper) && user.shipper.length > 0) {
        return user.shipper[0].id;
      } else if (typeof user.shipper === 'object' && user.shipper.id) {
        return user.shipper.id;
      }
    }
    return null;
  }, [user, activeBusinessId]);

  React.useEffect(() => {
    const fetchParcels = async () => {
      try {
        setIsLoading(true);
        let parcelsUrl = '/parcels?populate=*';
        if (isShipper && shipperId) {
          parcelsUrl += `&filters[$or][0][shipper][id][$eq]=${shipperId}&filters[$or][1][pickup_location][shipper][id][$eq]=${shipperId}`;
        }
        const response = await apiClient.get<StrapiCollectionResponse<Parcel>>(parcelsUrl);
        const parcels = response.data?.data || [];
        
        if (parcels.length > 0) {
          const mapped: OrderRow[] = parcels.map((item: any) => {
            const customerName = item.recipient_name || 'Customer';
            const initials = customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';
            const destination = item.destination_city?.name || item.recipient_address?.split(',').pop()?.trim() || 'Pakistan';
            const origin = item.source_city?.name || 'Karachi';
            
            return {
              id: item.id,
              trackingNumber: `${item.tracking_number}`,
              customerName,
              avatar: initials,
              phone: item.recipient_phone || 'N/A',
              origin,
              destination,
              address: item.recipient_address || 'No address provided',
              shipperName: item.shipper?.name || item.pickup_location?.shipper?.name || 'Shipper Account',
              shipperAddress: item.pickup_location?.address || 'Pickup Warehouse',
              codAmount: item.cod_amount || 0,
              weightKg: item.weight || 1.0,
              status: item.status || 'booked',
              dateCreated: item.createdAt || new Date().toISOString(),
            };
          });
          setData(mapped);
        } else {
          setData([]);
        }
      } catch (error) {
        console.warn('Could not fetch orders:', error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParcels();
  }, [isShipper, shipperId]);

  const filteredData = data.filter((row) => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return (
      row.trackingNumber.toLowerCase().includes(lower) ||
      row.customerName.toLowerCase().includes(lower) ||
      row.address.toLowerCase().includes(lower) ||
      row.status.toLowerCase().includes(lower)
    );
  });

  const handlePrintIndividualOrder = (row: OrderRow) => {
    setPrintOrder(row);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <PortalLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-label-area, #print-label-area * {
            visibility: visible !important;
          }
          #print-label-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="p-lg max-w-[1920px] w-full mx-auto space-y-lg no-print">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <div className="flex items-center gap-xs text-secondary mb-xs">
              <span className="font-label-md text-label-md">Booking Order</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-label-md text-label-md text-primary font-bold">Booked Order List</span>
            </div>
            <h2 className="font-display-lg text-display-lg text-on-surface font-bold">Booking Order Management</h2>
            <p className="font-body-md text-body-md text-secondary mt-xs">
              Review all booked orders and print individual shipping labels to paste on singular parcels.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search Booked Orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs font-medium border border-outline-variant bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>
            <Link
              href="/shipments/book"
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Order
            </Link>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50">
            <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Booked Orders Listing
            </h4>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredData.length} booked order{filteredData.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3">Booking # / Tracking ID</th>
                  <th className="px-4 py-3">Consignee Details</th>
                  <th className="px-4 py-3">Consignee Address</th>
                  <th className="px-4 py-3">Shipper Account</th>
                  <th className="px-4 py-3">COD Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Individual Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-xs font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-secondary">
                      Loading booked orders...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-secondary">
                      No booked orders found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-4 font-mono font-bold text-primary text-sm">
                        {row.trackingNumber}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                            {row.avatar}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{row.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{row.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 max-w-[240px] truncate">
                        {row.address}
                      </td>
                      <td className="px-4 py-4 text-slate-800 font-semibold">{row.shipperName}</td>
                      <td className="px-4 py-4 font-bold text-slate-900">PKR {row.codAmount?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {row.status === 'booked' ? 'Booked' : row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handlePrintIndividualOrder(row)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          title="Print singular order shipping label"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Label
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* INDIVIDUAL SINGULAR ORDER SHIPPING LABEL PRINT MODAL */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Singular Shipping Label Preview</h3>
                <p className="text-xs text-slate-500 font-mono">{printOrder.trackingNumber}</p>
              </div>
              <button onClick={() => setPrintOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Label Sticker Graphic Preview */}
            <div className="border-2 border-slate-900 rounded-xl p-4 bg-white font-mono text-slate-900 text-xs flex flex-col gap-3 shadow-inner">
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                <span className="font-bold text-base tracking-tight text-primary">DBArc Express</span>
                <span className="text-[10px] font-bold border border-slate-900 px-1.5 py-0.5 rounded">STANDARD COD</span>
              </div>

              {/* Barcode Graphic */}
              <div className="flex flex-col items-center justify-center py-2 bg-slate-50 border border-dashed border-slate-300 rounded">
                <div className="flex items-center gap-0.5 h-10">
                  {[4,2,6,1,3,5,2,4,1,6,3,2,5,1,4,2,6,3,1,5,2,4,6,1,3,2,5,1,4].map((w, idx) => (
                    <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }}></div>
                  ))}
                </div>
                <span className="text-sm font-bold tracking-widest mt-1">{printOrder.trackingNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-slate-900 py-2">
                <div>
                  <span className="font-bold block uppercase text-slate-500">Shipper (From):</span>
                  <span className="font-bold">{printOrder.shipperName}</span>
                  <p className="text-slate-600 line-clamp-2">{printOrder.shipperAddress}</p>
                </div>
                <div>
                  <span className="font-bold block uppercase text-slate-500">Consignee (To):</span>
                  <span className="font-bold">{printOrder.customerName}</span>
                  <p className="text-slate-600">{printOrder.phone}</p>
                  <p className="text-slate-800 font-semibold line-clamp-2">{printOrder.address}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 font-sans">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block">WEIGHT: {printOrder.weightKg} KG</span>
                  <span className="text-[9px] font-bold text-slate-500 block">DEST: {printOrder.destination.toUpperCase()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-500 block">COD AMOUNT</span>
                  <span className="text-base font-bold text-slate-900">PKR {printOrder.codAmount?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Print Singular Order Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISOLATED PRINT STICKER AREA FOR BROWSER PRINT */}
      {printOrder && (
        <div id="print-label-area" className="hidden">
          <div style={{ width: '4in', height: '6in', border: '3px solid black', padding: '16px', fontFamily: 'monospace', color: 'black', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>DBArc Express</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>COD ORDER</span>
            </div>
            
            <div style={{ textAlign: 'center', margin: '16px 0', padding: '12px', border: '1px solid black' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '4px' }}>||| | ||| || ||| |||</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px' }}>{printOrder.trackingNumber}</div>
            </div>

            <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', padding: '12px 0', fontSize: '12px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>SHIPPER:</strong> {printOrder.shipperName}<br />
                {printOrder.shipperAddress}
              </div>
              <div>
                <strong>CONSIGNEE:</strong> {printOrder.customerName} ({printOrder.phone})<br />
                <strong>ADDRESS:</strong> {printOrder.address}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '14px' }}>
              <div>
                <strong>WEIGHT:</strong> {printOrder.weightKg} KG<br />
                <strong>DESTINATION:</strong> {printOrder.destination.toUpperCase()}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>COD AMOUNT:</strong><br />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>PKR {printOrder.codAmount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </PortalLayout>
  );
}

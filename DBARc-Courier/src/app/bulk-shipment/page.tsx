'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { 
  Upload, 
  Plus, 
  Printer, 
  Layers, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Search, 
  Barcode as BarcodeIcon, 
  Truck, 
  Building2, 
  User, 
  X,
  FileSpreadsheet,
  Check,
  HelpCircle
} from 'lucide-react';

interface BulkOrderItem {
  itemId: string;
  itemName: string;
  codAmount: number;
}

interface GroupedBulkOrder {
  orderId: string;
  consigneeName: string;
  consigneePhone: string;
  consigneeAddress: string;
  shipperName: string;
  shipperAddress: string;
  shippingType: 'In-House' | '3PL';
  primaryBarcode: string;
  secondary3PLBarcode?: string;
  items: BulkOrderItem[];
  totalCod: number;
  createdAt: string;
}

const DEMO_BULK_ORDERS: GroupedBulkOrder[] = [
  {
    orderId: 'ORD-88210',
    consigneeName: 'Zeeshan Ahmed',
    consigneePhone: '+92 300 1234567',
    consigneeAddress: 'Flat 402, Al-Rehman Heights, Gulshan-e-Iqbal, Karachi',
    shipperName: 'Metro Fashion Store',
    shipperAddress: 'Shop 12, Liberty Market, Gulberg III, Lahore',
    shippingType: 'In-House', // 1 Barcode
    primaryBarcode: 'DBA-88210-IH',
    items: [
      { itemId: 'ITM-01', itemName: 'Denim Jacket (Blue, L)', codAmount: 2500 },
      { itemId: 'ITM-02', itemName: 'Cotton T-Shirt (White, M)', codAmount: 1500 }
    ],
    totalCod: 4000,
    createdAt: new Date().toISOString(),
  },
  {
    orderId: 'ORD-88211',
    consigneeName: 'Mariam Khan',
    consigneePhone: '+92 321 9876543',
    consigneeAddress: 'House 42, Street 5, DHA Phase 6, Karachi',
    shipperName: 'Silk Threads Pakistan',
    shipperAddress: 'Plot 88, Industrial Area, Faisalabad',
    shippingType: '3PL', // 2 Barcodes
    primaryBarcode: 'DBA-88211-3P',
    secondary3PLBarcode: 'TCS-99482103-PK', // 2nd barcode for 3PL
    items: [
      { itemId: 'ITM-01', itemName: 'Embroidered Lawn Suit (Unstitched 3pc)', codAmount: 5500 }
    ],
    totalCod: 5500,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    orderId: 'ORD-88212',
    consigneeName: 'Dr. Faisal Qureshi',
    consigneePhone: '+92 333 4567890',
    consigneeAddress: 'Aga Khan University Hospital, Stadium Road, Karachi',
    shipperName: 'MedTech Supplies Ltd',
    shipperAddress: 'Suite 404, Business Plaza, I.I. Chundrigar Road, Karachi',
    shippingType: 'In-House', // 1 Barcode
    primaryBarcode: 'DBA-88212-IH',
    items: [
      { itemId: 'ITM-01', itemName: 'Digital Stethoscope', codAmount: 8500 },
      { itemId: 'ITM-02', itemName: 'Pulse Oximeter Pack', codAmount: 2200 },
      { itemId: 'ITM-03', itemName: 'N95 Respirator Masks Box', codAmount: 1800 }
    ],
    totalCod: 12500,
    createdAt: new Date().toISOString(),
  }
];

export default function BulkBookingPage() {
  const [orders, setOrders] = React.useState<GroupedBulkOrder[]>(DEMO_BULK_ORDERS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'All' | 'In-House' | '3PL'>('All');

  // Modal for new bulk upload / singular order entry
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [rawCsvText, setRawCsvText] = React.useState('');

  // Label Print Modal State
  const [selectedOrderForLabel, setSelectedOrderForLabel] = React.useState<GroupedBulkOrder | null>(null);

  // Parse raw sheet entries with order_id grouping logic
  const handleProcessBulkSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCsvText.trim()) return;

    const lines = rawCsvText.trim().split('\n');
    const orderMap: { [orderId: string]: GroupedBulkOrder } = {};

    lines.forEach((line, idx) => {
      // Expected CSV format: order_id, consignee_name, consignee_phone, consignee_address, shipper_name, shipper_address, item_name, cod_amount, shipping_type, 3pl_barcode
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 8) return;

      const orderId = parts[0] || `ORD-${Date.now()}-${idx}`;
      const consigneeName = parts[1] || 'Unknown Consignee';
      const consigneePhone = parts[2] || '+92 300 0000000';
      const consigneeAddress = parts[3] || 'No Address Provided';
      const shipperName = parts[4] || 'Shipper Business';
      const shipperAddress = parts[5] || 'Warehouse Center';
      const itemName = parts[6] || 'Item Product';
      const codAmount = Number(parts[7]) || 0;
      const shippingType = (parts[8]?.toUpperCase() === '3PL' ? '3PL' : 'In-House') as 'In-House' | '3PL';
      const secondary3PLBarcode = parts[9] || (shippingType === '3PL' ? `3PL-${Math.floor(100000 + Math.random() * 900000)}` : undefined);

      if (!orderMap[orderId]) {
        orderMap[orderId] = {
          orderId,
          consigneeName,
          consigneePhone,
          consigneeAddress,
          shipperName,
          shipperAddress,
          shippingType,
          primaryBarcode: `DBA-${orderId}`,
          secondary3PLBarcode,
          items: [],
          totalCod: 0,
          createdAt: new Date().toISOString(),
        };
      }

      // Append item under the same order_id
      orderMap[orderId].items.push({
        itemId: `ITM-${orderMap[orderId].items.length + 1}`,
        itemName,
        codAmount
      });
      orderMap[orderId].totalCod += codAmount;
    });

    const parsedOrders = Object.values(orderMap);
    if (parsedOrders.length > 0) {
      setOrders(prev => [...parsedOrders, ...prev]);
      setShowUploadModal(false);
      setRawCsvText('');
      alert(`Successfully processed ${parsedOrders.length} unique orders from sheet!`);
    } else {
      alert('Could not parse valid orders. Please check CSV format.');
    }
  };

  const filteredOrders = orders.filter(ord => {
    const matchesSearch = !searchQuery || (
      ord.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.consigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.consigneePhone.includes(searchQuery)
    );
    const matchesType = typeFilter === 'All' || ord.shippingType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleTriggerPrint = () => {
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
          #bulk-label-print-area, #bulk-label-print-area * {
            visibility: visible !important;
          }
          #bulk-label-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="p-lg max-w-[1920px] w-full mx-auto flex flex-col gap-lg no-print">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Order Processing</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Bulk Booking & Singular Booking</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Import bulk booking sheets. Each order shares one unique <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">order_id</code>. Generates 1 Barcode for In-House shipping and 2 Barcodes for 3PL courier partners.
            </p>
          </div>

          <div className="flex items-center gap-sm">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-primary text-white h-11 px-5 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Upload className="w-4 h-4" /> Import Booking Sheet
            </button>
          </div>
        </div>

        {/* 3PL Confirmation Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900 shadow-sm">
          <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-sm block">System Logistics Rule: Barcode Routing</span>
            <p className="mt-0.5 text-blue-800">
              • <strong>1 Barcode (In-House Shipping)</strong>: Used for DBArc direct courier network fulfillment.<br />
              • <strong>2 Barcodes (3PL Partner Shipping)</strong>: Rendered when routed through third-party logistics (e.g. Barcode 1 = DBArc Primary Order ID, Barcode 2 = 3PL Courier Tracking ID). <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">[Need to confirm: 3PL Partner Metadata]</span>
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-outline-variant rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Search Order ID / Consignee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                type="text"
                placeholder="Search order_id or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Fulfillment Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTypeFilter('All')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-outline-variant hover:bg-slate-100'
                }`}
              >
                All Orders
              </button>
              <button
                onClick={() => setTypeFilter('In-House')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'In-House' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-700 border-outline-variant hover:bg-slate-100'
                }`}
              >
                1 Barcode (In-House)
              </button>
              <button
                onClick={() => setTypeFilter('3PL')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === '3PL' ? 'bg-purple-700 text-white border-purple-700' : 'bg-slate-50 text-slate-700 border-outline-variant hover:bg-slate-100'
                }`}
              >
                2 Barcodes (3PL)
              </button>
            </div>
          </div>

          <div className="flex justify-end text-xs text-slate-500 font-semibold">
            Total Grouped Orders: {filteredOrders.length}
          </div>
        </div>

        {/* Grouped Bulk Booking Orders Table */}
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50">
            <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" /> Grouped Bulk Booking Entries
            </h4>
            <span className="text-xs font-semibold text-outline">
              All items belonging to 1 order share the same <code className="text-primary font-bold">order_id</code>
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Items Count</th>
                  <th className="px-4 py-3">Consignee Detail</th>
                  <th className="px-4 py-3">Shipper Detail</th>
                  <th className="px-4 py-3">Fulfillment & Barcodes</th>
                  <th className="px-4 py-3">Total COD</th>
                  <th className="px-4 py-3 text-right">Label Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-xs font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No bulk booking orders found. Import a booking sheet to add entries.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-primary text-sm">
                        {ord.orderId}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded-lg border border-slate-200">
                          <Package className="w-3.5 h-3.5 text-primary" /> {ord.items.length} Item{ord.items.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{ord.consigneeName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{ord.consigneePhone}</span>
                          <span className="text-[10px] text-slate-600 truncate max-w-[200px]">{ord.consigneeAddress}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{ord.shipperName}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{ord.shipperAddress}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {ord.shippingType === 'In-House' ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px] w-fit">
                              <BarcodeIcon className="w-3 h-3" /> 1 Barcode (In-House)
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">{ord.primaryBarcode}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px] w-fit">
                              <BarcodeIcon className="w-3 h-3" /> 2 Barcodes (3PL Partner)
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">1: {ord.primaryBarcode}</span>
                            <span className="text-[10px] font-mono text-purple-700 font-bold">2: {ord.secondary3PLBarcode}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900 text-sm">
                        PKR {ord.totalCod?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrderForLabel(ord)}
                          className="px-3.5 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Labels
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

      {/* IMPORT BULK BOOKING SHEET MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Import Bulk Booking Sheet
                </h3>
                <p className="text-xs text-slate-500">Paste sheet data. Items sharing the same order_id will be grouped under 1 order.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessBulkSheet} className="flex flex-col gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed font-mono">
                <strong>Expected CSV Line Format:</strong><br />
                <code>order_id, consignee_name, consignee_phone, consignee_address, shipper_name, shipper_address, item_name, cod_amount, shipping_type(In-House/3PL), 3pl_barcode</code>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Paste Sheet Lines</label>
                <textarea
                  rows={8}
                  placeholder={`ORD-901, Ali Khan, +92 300 1112233, Gulberg II Lahore, Threads Store, Factory Road, Silk Shirt, 2500, In-House
ORD-901, Ali Khan, +92 300 1112233, Gulberg II Lahore, Threads Store, Factory Road, Denim Trousers, 3000, In-House
ORD-902, Sara Malik, +92 321 4445566, Clifton Karachi, Accessories Co, Tech Park, Smart Watch, 6500, 3PL, TCS-998801`}
                  className="w-full p-3 border border-outline-variant rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  value={rawCsvText}
                  onChange={(e) => setRawCsvText(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" /> Process & Group Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT BARCODE LABELS MODAL (1 Barcode vs 2 Barcodes) */}
      {selectedOrderForLabel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  Label Sticker Preview: <span className="font-mono text-primary">{selectedOrderForLabel.orderId}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedOrderForLabel.shippingType === 'In-House' ? '1 Barcode (In-House Shipping)' : '2 Barcodes (3PL Partner Shipping)'}
                </p>
              </div>
              <button onClick={() => setSelectedOrderForLabel(null)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Label Cards Container */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
              {selectedOrderForLabel.items.map((item, index) => (
                <div key={item.itemId} className="border-2 border-slate-900 rounded-2xl p-4 bg-white font-mono text-xs flex flex-col gap-3 shadow-sm">
                  {/* Top Barcode Header */}
                  <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                    <span className="font-bold text-sm text-primary">DBArc Express Shipping</span>
                    <span className="text-[10px] font-bold border border-slate-900 px-2 py-0.5 rounded bg-slate-50">
                      Piece {index + 1} of {selectedOrderForLabel.items.length}
                    </span>
                  </div>

                  {/* Consignee & Shipper Info */}
                  <div className="grid grid-cols-2 gap-3 border-b border-slate-900 pb-2 text-[10px]">
                    <div>
                      <span className="font-bold text-slate-500 uppercase block">Consignee Detail (To):</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedOrderForLabel.consigneeName}</span>
                      <p className="text-slate-700">{selectedOrderForLabel.consigneePhone}</p>
                      <p className="text-slate-700 line-clamp-2">{selectedOrderForLabel.consigneeAddress}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block">Shipper Detail (From):</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedOrderForLabel.shipperName}</span>
                      <p className="text-slate-700 line-clamp-2">{selectedOrderForLabel.shipperAddress}</p>
                    </div>
                  </div>

                  {/* Item Description */}
                  <div className="bg-slate-50 p-2 border border-slate-200 rounded text-[10px]">
                    <span className="font-bold text-slate-600">ITEM CONTENT:</span> {item.itemName} (ID: {item.itemId})
                  </div>

                  {/* BARCODES SECTION: 1 Barcode vs 2 Barcodes */}
                  {selectedOrderForLabel.shippingType === 'In-House' ? (
                    /* 1 BARCODE: IN-HOUSE SHIPPING */
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-900 rounded">
                      <span className="text-[9px] font-bold text-slate-500 uppercase mb-1">In-House Primary Tracking Barcode</span>
                      <div className="flex items-center gap-0.5 h-10">
                        {[4,2,6,1,3,5,2,4,1,6,3,2,5,1,4,2,6,3,1,5,2,4,6,1,3,2,5,1,4].map((w, idx) => (
                          <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }}></div>
                        ))}
                      </div>
                      <span className="text-sm font-bold tracking-widest mt-1 text-slate-900">{selectedOrderForLabel.primaryBarcode}</span>
                    </div>
                  ) : (
                    /* 2 BARCODES: 3PL PARTNER SHIPPING */
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-900 rounded">
                        <span className="text-[8px] font-bold text-slate-500 uppercase mb-1">Barcode 1: DBArc Primary ID</span>
                        <div className="flex items-center gap-0.5 h-8">
                          {[3,1,4,2,5,1,3,4,2,1,5,2,3,4,1,5,2].map((w, idx) => (
                            <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }}></div>
                          ))}
                        </div>
                        <span className="text-xs font-bold tracking-wider mt-1 text-slate-900">{selectedOrderForLabel.primaryBarcode}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center p-2 bg-purple-50 border border-purple-900 rounded">
                        <span className="text-[8px] font-bold text-purple-700 uppercase mb-1">Barcode 2: 3PL Courier Partner ID</span>
                        <div className="flex items-center gap-0.5 h-8">
                          {[2,4,1,5,2,3,1,4,5,2,1,3,4,2,5,1,3].map((w, idx) => (
                            <div key={idx} className="bg-purple-950 h-full" style={{ width: `${w}px` }}></div>
                          ))}
                        </div>
                        <span className="text-xs font-bold tracking-wider mt-1 text-purple-950">{selectedOrderForLabel.secondary3PLBarcode}</span>
                      </div>
                    </div>
                  )}

                  {/* COD & Order Footer */}
                  <div className="flex justify-between items-center pt-1 font-sans">
                    <span className="text-[10px] font-bold text-slate-700">SHARED ORDER ID: {selectedOrderForLabel.orderId}</span>
                    <span className="text-sm font-bold text-slate-900">COD: PKR {item.codAmount?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-outline-variant pt-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForLabel(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Print Item Labels
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISOLATED PRINT AREA FOR BULK LABELS */}
      {selectedOrderForLabel && (
        <div id="bulk-label-print-area" className="hidden">
          {selectedOrderForLabel.items.map((item, index) => (
            <div key={item.itemId} style={{ width: '4in', height: '6in', border: '3px solid black', padding: '16px', fontFamily: 'monospace', color: 'black', background: 'white', pageBreakAfter: 'always', margin: '0 auto 20px auto' }}>
              <div style={{ display: 'flex', justify: 'space-between', borderBottom: '2px solid black', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>DBArc Express Shipping</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Piece {index + 1} of {selectedOrderForLabel.items.length}</span>
              </div>

              <div style={{ borderBottom: '1px solid black', padding: '10px 0', fontSize: '11px' }}>
                <div><strong>ORDER ID:</strong> {selectedOrderForLabel.orderId}</div>
                <div><strong>CONSIGNEE:</strong> {selectedOrderForLabel.consigneeName} ({selectedOrderForLabel.consigneePhone})</div>
                <div><strong>ADDRESS:</strong> {selectedOrderForLabel.consigneeAddress}</div>
                <div><strong>SHIPPER:</strong> {selectedOrderForLabel.shipperName}</div>
              </div>

              <div style={{ padding: '8px 0', fontSize: '11px', borderBottom: '1px solid black' }}>
                <strong>ITEM:</strong> {item.itemName}
              </div>

              {selectedOrderForLabel.shippingType === 'In-House' ? (
                <div style={{ textAlign: 'center', margin: '16px 0', padding: '12px', border: '1px solid black' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '3px' }}>||| | ||| || ||| |||</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '6px' }}>{selectedOrderForLabel.primaryBarcode}</div>
                  <div style={{ fontSize: '10px', marginTop: '4px' }}>1 BARCODE (IN-HOUSE FULFILLMENT)</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1px solid black' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>||| || | |||</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{selectedOrderForLabel.primaryBarcode}</div>
                    <div style={{ fontSize: '9px' }}>BARCODE 1 (DBARC)</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1px solid black' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>|| ||| | |||</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{selectedOrderForLabel.secondary3PLBarcode}</div>
                    <div style={{ fontSize: '9px' }}>BARCODE 2 (3PL PARTNER)</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '16px' }}>
                <span><strong>TYPE:</strong> {selectedOrderForLabel.shippingType}</span>
                <span><strong>COD:</strong> PKR {item.codAmount?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </PortalLayout>
  );
}

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { List, Save, Printer, RefreshCw, Barcode, Shield, MapPin, X, Download, FileSpreadsheet, Search, CheckCircle2 } from 'lucide-react';

interface ManifestItem {
  id: string;
  manifestNumber: number;
  date: string;
  manifestType: string;
  thirdParty: string;
  station: string;
  sealNo: string;
  cityCode: string;
}

interface ManifestShipment {
  id: string;
  shipmentNumber: string;
  bookingDate: string;
  trackPolyCn: string;
  shipperName: string;
  consigneeName: string;
  consigneeContact: string;
  consigneeAddress: string;
  cashCollect: number;
  status: string;
}

const PAST_MANIFESTS: ManifestItem[] = [
  { id: '1', manifestNumber: 3741, date: '2026-06-06 08:31:05', manifestType: 'Station', thirdParty: '-', station: 'Station 2', sealNo: 'SL-99481', cityCode: 'LHE' },
  { id: '2', manifestNumber: 3740, date: '2026-06-05 21:02:18', manifestType: 'Station', thirdParty: '-', station: 'Station 1', sealNo: 'SL-99480', cityCode: 'LHE' },
  { id: '3', manifestNumber: 3739, date: '2026-06-05 20:06:34', manifestType: '3PL Partner', thirdParty: 'Trax Logistics', station: 'Station 2', sealNo: 'SL-99475', cityCode: 'LHE' },
  { id: '4', manifestNumber: 3738, date: '2026-06-05 19:36:11', manifestType: 'Station', thirdParty: '-', station: 'Station 2', sealNo: 'SL-99470', cityCode: 'LHE' },
  { id: '5', manifestNumber: 3737, date: '2026-06-05 16:04:09', manifestType: 'Station', thirdParty: '-', station: 'Station 2', sealNo: 'SL-99462', cityCode: 'LYP' }
];

export default function OperationsManifestationPage() {
  const [manifestNumber, setManifestNumber] = React.useState<number>(3742);
  const [manifestType, setManifestType] = React.useState<string>('Station');
  const [selectedStation, setSelectedStation] = React.useState<string>('Lahore Hub');
  const [sealNo, setSealNo] = React.useState<string>('SL-99485');
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [fromDate, setFromDate] = React.useState<string>('2026-06-01');
  const [toDate, setToDate] = React.useState<string>('2026-06-06');

  // Modal State
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState('');

  const [shipments, setShipments] = React.useState<ManifestShipment[]>([
    {
      id: '1',
      shipmentNumber: '400122456',
      bookingDate: '2026-06-04',
      trackPolyCn: '15000910017700',
      shipperName: "Kashee's Cosmetics",
      consigneeName: 'Mahnoor Kaleem',
      consigneeContact: '03110360622',
      consigneeAddress: 'Rania Beauty Salon Multan Jinnah Town Gate Number 4 Multan',
      cashCollect: 7500,
      status: 'In Transit'
    }
  ]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddShipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const newItem: ManifestShipment = {
      id: Date.now().toString(),
      shipmentNumber: scanBarcode.trim(),
      bookingDate: new Date().toISOString().split('T')[0],
      trackPolyCn: `TRX-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      shipperName: 'Metro Fashion Store',
      consigneeName: 'Zainab Ahmed',
      consigneeContact: '03214567890',
      consigneeAddress: 'House 45, Main Boulevard, Gulberg III, Lahore',
      cashCollect: 3200,
      status: 'Manifested'
    };

    setShipments(prev => [newItem, ...prev]);
    setScanBarcode('');
    barcodeInputRef.current?.focus();
  };

  const handleSave = () => {
    if (shipments.length === 0) {
      alert('Please scan at least one shipment before creating manifest.');
      return;
    }
    alert(`Manifest #${manifestNumber} (Seal No: ${sealNo}) saved successfully with ${shipments.length} parcels!`);
  };

  const handleReset = () => {
    if (confirm('Reset manifestation form?')) {
      setManifestNumber(prev => prev + 1);
      setSealNo(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
      setShipments([]);
      setScanBarcode('');
    }
  };

  const filteredPastManifests = PAST_MANIFESTS.filter(m =>
    m.manifestNumber.toString().includes(modalSearch) ||
    m.station.toLowerCase().includes(modalSearch.toLowerCase()) ||
    m.sealNo.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / Manifestation</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => alert('Exporting manifest report...')}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => setIsListModalOpen(true)}
              className="bg-primary hover:bg-primary-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <List className="w-4 h-4" /> Manifest List
            </button>
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Form Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manifest #</label>
              <input
                type="number"
                value={manifestNumber}
                onChange={(e) => setManifestNumber(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manifest Type</label>
              <select
                value={manifestType}
                onChange={(e) => setManifestType(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Station">Station (Internal Courier Hub)</option>
                <option value="3PL Partner">3PL Partner Courier</option>
                <option value="Airport">Airport Express Cargo</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Station / Destination</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Lahore Hub">Lahore Hub (LHE)</option>
                <option value="Karachi Central">Karachi Central (KHI)</option>
                <option value="Rawalpindi Hub">Rawalpindi Hub (RWP)</option>
                <option value="Multan Hub">Multan Hub (MUX)</option>
                <option value="Faisalabad Hub">Faisalabad Hub (LYP)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" /> Seal No
              </label>
              <input
                type="text"
                value={sealNo}
                onChange={(e) => setSealNo(e.target.value)}
                placeholder="Bag Seal Serial #"
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Barcode Scan Input */}
          <form onSubmit={handleAddShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" /> Scan Shipments to Add in Manifest
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan CN or Tracking Number..."
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-semibold"
              />
              <span className="text-xs text-slate-500 font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-semibold"
              />
            </div>
          </form>

        </div>

        {/* Manifest Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Shipments List ({shipments.length})</span>
            <span className="text-xs text-amber-400 font-bold">Total Cash Collect: Rs. {shipments.reduce((acc, curr) => acc + curr.cashCollect, 0)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Shipment #</th>
                  <th className="px-4 py-3.5">Booking Date</th>
                  <th className="px-4 py-3.5">Track / Poly CN</th>
                  <th className="px-4 py-3.5">Shipper Name</th>
                  <th className="px-4 py-3.5">Consignee Name</th>
                  <th className="px-4 py-3.5">Consignee Address</th>
                  <th className="px-4 py-3.5 text-right">Cash Collect</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{s.shipmentNumber}</td>
                    <td className="px-4 py-3.5 text-slate-600">{s.bookingDate}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono">{s.trackPolyCn}</td>
                    <td className="px-4 py-3.5 text-slate-900">{s.shipperName}</td>
                    <td className="px-4 py-3.5 text-slate-900">{s.consigneeName}</td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate" title={s.consigneeAddress}>{s.consigneeAddress}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">Rs. {s.cashCollect}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MANIFEST LIST MODAL */}
        {isListModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
              
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <h2 className="text-base font-bold">Manifest List</h2>
                <button onClick={() => setIsListModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search manifest #, station, or seal..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">Showing {filteredPastManifests.length} manifests</span>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Manifest #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Manifest Type</th>
                      <th className="p-3">Third Party</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Seal No</th>
                      <th className="p-3 text-center">City Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {filteredPastManifests.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-primary">{m.manifestNumber}</td>
                        <td className="p-3 text-slate-600">{m.date}</td>
                        <td className="p-3">{m.manifestType}</td>
                        <td className="p-3 text-slate-500">{m.thirdParty}</td>
                        <td className="p-3 font-bold text-slate-900">{m.station}</td>
                        <td className="p-3 text-slate-600 font-mono">{m.sealNo}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{m.cityCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={() => setIsListModalOpen(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

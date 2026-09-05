'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { List, Save, Printer, RefreshCw, Barcode, Shield, MapPin, X, Download, FileSpreadsheet, Search, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

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


export default function OperationsManifestationPage() {
  const [manifestNumber, setManifestNumber] = React.useState<number>(() => Math.floor(1000 + Math.random() * 9000));
  const [manifestType, setManifestType] = React.useState<string>('Station');
  const [selectedStation, setSelectedStation] = React.useState<string>('');
  const [sealNo, setSealNo] = React.useState<string>(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Past manifests from backend
  const [pastManifests, setPastManifests] = React.useState<ManifestItem[]>([]);

  const fetchPastManifests = async () => {
    try {
      const res = await apiClient.get('/manifests?sort[0]=createdAt:desc&pagination[limit]=20');
      const items = (res.data?.data || []).map((m: any) => ({
        id: String(m.id),
        manifestNumber: m.manifest_number || m.id,
        date: m.date ? new Date(m.date).toLocaleString() : new Date(m.createdAt).toLocaleString(),
        manifestType: m.manifest_type || 'Station',
        thirdParty: m.third_party || '-',
        station: m.station || '',
        sealNo: m.seal_no || '',
        cityCode: m.city_code || '',
      }));
      setPastManifests(items);
    } catch (e) {
      console.warn('Could not load manifests:', e);
    }
  };

  // Modal State
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState('');

  const [shipments, setShipments] = React.useState<ManifestShipment[]>([]);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanBarcode.trim().toUpperCase();
    if (!code) return;

    if (shipments.some(s => s.shipmentNumber === code)) {
      triggerToast(`Shipment ${code} already in manifest.`, 'error');
      return;
    }

    try {
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(code)}&populate=*`);
      const parcel = res.data?.data?.[0];
      const newItem: ManifestShipment = {
        id: Date.now().toString(),
        shipmentNumber: code,
        bookingDate: parcel?.createdAt ? parcel.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        trackPolyCn: parcel?.poly_tracking || `TRX-${code}`,
        shipperName: parcel?.shipper?.name || parcel?.pickup_location?.shipper?.name || 'Unknown Shipper',
        consigneeName: parcel?.recipient_name || 'Unknown Consignee',
        consigneeContact: parcel?.recipient_phone || '',
        consigneeAddress: parcel?.recipient_address || '',
        cashCollect: Number(parcel?.cod_amount) || 0,
        status: 'Manifested',
      };
      setShipments(prev => [newItem, ...prev]);
    } catch {
      const newItem: ManifestShipment = {
        id: Date.now().toString(),
        shipmentNumber: code,
        bookingDate: new Date().toISOString().split('T')[0],
        trackPolyCn: `TRX-${code}`,
        shipperName: 'Unknown Shipper',
        consigneeName: 'Unknown Consignee',
        consigneeContact: '',
        consigneeAddress: '',
        cashCollect: 0,
        status: 'Manifested',
      };
      setShipments(prev => [newItem, ...prev]);
    }

    setScanBarcode('');
    barcodeInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please scan at least one shipment before creating manifest.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      // Mark each parcel as Manifested in Strapi
      for (const item of shipments) {
        try {
          const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
          const parcel = res.data?.data?.[0];
          if (parcel) {
            await apiClient.put(`/parcels/${parcel.id}`, { data: { status: 'Manifested' } });
          }
        } catch (e) {
          console.warn(`Could not update ${item.shipmentNumber}:`, e);
        }
      }

      // Persist Manifest record
      try {
        await apiClient.post('/manifests', {
          data: {
            manifest_number: manifestNumber,
            seal_no: sealNo,
            manifest_type: manifestType,
            station: selectedStation,
            total_parcels: shipments.length,
            total_cash: shipments.reduce((a, s) => a + s.cashCollect, 0),
            date: new Date().toISOString(),
          }
        });
      } catch (e) {
        console.warn('Manifest record notice:', e);
      }

      triggerToast(`Manifest #${manifestNumber} (Seal: ${sealNo}) saved with ${shipments.length} parcels!`, 'success');
      setManifestNumber(prev => prev + 1);
      setSealNo(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
      setShipments([]);
    } catch (err) {
      triggerToast('Failed to save manifest.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset manifestation form?')) {
      setManifestNumber(prev => prev + 1);
      setSealNo(`SL-${Math.floor(10000 + Math.random() * 90000)}`);
      setShipments([]);
      setScanBarcode('');
    }
  };

  const filteredPastManifests = pastManifests.filter(m =>
    m.manifestNumber.toString().includes(modalSearch) ||
    m.station.toLowerCase().includes(modalSearch.toLowerCase()) ||
    m.sealNo.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <PortalLayout>
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success'
            ? <div className="bg-emerald-500 rounded-full p-1 text-white"><CheckCircle2 className="w-4 h-4" /></div>
            : <div className="bg-red-500 rounded-full p-1 text-white"><Shield className="w-4 h-4" /></div>
          }
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
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
              onClick={() => { setIsListModalOpen(true); fetchPastManifests(); }}
              className="bg-primary hover:bg-primary-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <List className="w-4 h-4" /> Manifest List
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save'}
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

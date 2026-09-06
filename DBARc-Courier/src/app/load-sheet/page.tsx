'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import {
  Search,
  Printer,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Barcode,
  Package,
  Layers,
  ArrowRight,
  CheckSquare,
  Square,
  Truck,
  User,
  MapPin,
  RefreshCw,
  ScanLine,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// =========================================================================
// Code128 Barcode Generator (Pure SVG)
// =========================================================================
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

function Code128BarcodeSvg({ text, height = 50 }: { text: string; height?: number }) {
  if (!text) return null;
  const clean = text.trim();
  const START_B = 104;
  const STOP = 106;

  let checksum = START_B;
  const codes: number[] = [START_B];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  let patternStr = "";
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c] || "";
  }

  const rects: React.JSX.Element[] = [];
  let currentX = 10; // Quiet zone 10 modules
  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10);
    const isBar = i % 2 === 0;
    if (isBar) {
      rects.push(
        <rect
          key={i}
          x={currentX}
          y={0}
          width={width}
          height={height}
          fill="#000000"
        />
      );
    }
    currentX += width;
  }
  const totalWidth = currentX + 10;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="max-h-[50px] w-auto"
        preserveAspectRatio="none"
        style={{ height: `${height}px` }}
      >
        <rect x={0} y={0} width={totalWidth} height={height} fill="#ffffff" />
        {rects}
      </svg>
      <span className="font-mono text-[11px] font-bold tracking-widest text-slate-900 mt-1">
        {clean}
      </span>
    </div>
  );
}

export default function LoadSheetPage() {
  const { isShipperEmployee, user, activeBusinessId } = useAuth();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = React.useState<'create' | 'history'>('create');

  // Booked Unassigned Orders (for Load Sheet Generation)
  const [bookedParcels, setBookedParcels] = React.useState<any[]>([]);
  const [loadingParcels, setLoadingParcels] = React.useState(true);
  const [checkedParcelIds, setCheckedParcelIds] = React.useState<number[]>([]);

  // Generated Load Sheets History
  const [loadSheets, setLoadSheets] = React.useState<any[]>([]);
  const [loadingSheets, setLoadingSheets] = React.useState(true);

  // Date Range Filters for Booked Orders
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Date Range Filters for History
  const [historyStartDate, setHistoryStartDate] = React.useState('');
  const [historyEndDate, setHistoryEndDate] = React.useState('');

  // Barcode Scanner Input for Rider Dispatch
  const [scanBarcodeQuery, setScanBarcodeQuery] = React.useState('');
  const [isProcessingScan, setIsProcessingScan] = React.useState(false);

  // Detail / Print Modals
  const [selectedSheet, setSelectedSheet] = React.useState<any | null>(null);
  const [showPrintView, setShowPrintView] = React.useState<any | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Hubs metadata
  const [hubs, setHubs] = React.useState<any[]>([]);

  // Toast
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  // -------------------------------------------------------------------------
  // Fetch Booked Parcels (Status: 'Total Booking', Unassigned to Load Sheet)
  // -------------------------------------------------------------------------
  const fetchBookedParcels = async () => {
    try {
      setLoadingParcels(true);
      const filters: any = {
        load_sheet: { id: { $null: true } },
        status: { $eq: 'Total Booking' },
      };

      if (activeBusinessId) {
        filters.shipper = { id: { $eq: activeBusinessId } };
      }

      if (startDate) {
        filters.createdAt = {
          ...filters.createdAt,
          $gte: `${startDate}T00:00:00.000Z`,
        };
      }
      if (endDate) {
        filters.createdAt = {
          ...filters.createdAt,
          $lte: `${endDate}T23:59:59.999Z`,
        };
      }

      const response = await apiClient.get('/parcels', {
        params: {
          filters,
          populate: ['destination_city', 'source_city', 'shipper'],
          sort: ['createdAt:desc'],
          pagination: { pageSize: 150 },
        },
      });

      const list = response.data?.data || [];
      setBookedParcels(list);
    } catch (err) {
      console.error('Failed to fetch booked parcels:', err);
      triggerToast('Failed to load booked orders.', 'error');
    } finally {
      setLoadingParcels(false);
    }
  };

  // -------------------------------------------------------------------------
  // Fetch Load Sheets History
  // -------------------------------------------------------------------------
  const fetchLoadSheets = async () => {
    try {
      setLoadingSheets(true);
      const params: any = {
        populate: ['origin_hub', 'destination_hub', 'rider', 'parcels', 'parcels.destination_city'],
        sort: ['createdAt:desc'],
        pagination: { pageSize: 50 },
      };

      const filters: any = {};
      if (historyStartDate) {
        filters.date_created = { ...filters.date_created, $gte: `${historyStartDate}T00:00:00.000Z` };
      }
      if (historyEndDate) {
        filters.date_created = { ...filters.date_created, $lte: `${historyEndDate}T23:59:59.999Z` };
      }

      if (Object.keys(filters).length > 0) {
        params.filters = filters;
      }

      const response = await apiClient.get('/load-sheets', { params });
      setLoadSheets(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch load sheets:', error);
    } finally {
      setLoadingSheets(false);
    }
  };

  const fetchHubs = async () => {
    try {
      const res = await apiClient.get('/hubs');
      setHubs(res.data?.data || []);
    } catch (e) {
      console.warn('Could not fetch hubs:', e);
    }
  };

  React.useEffect(() => {
    fetchBookedParcels();
    fetchLoadSheets();
    fetchHubs();
  }, [startDate, endDate, activeBusinessId]);

  React.useEffect(() => {
    if (activeTab === 'history') {
      fetchLoadSheets();
    }
  }, [historyStartDate, historyEndDate, activeTab]);

  // -------------------------------------------------------------------------
  // Selection Logic
  // -------------------------------------------------------------------------
  const handleToggleParcel = (parcelId: number) => {
    setCheckedParcelIds(prev =>
      prev.includes(parcelId) ? prev.filter(id => id !== parcelId) : [...prev, parcelId]
    );
  };

  const handleSelectAllParcels = () => {
    if (checkedParcelIds.length === bookedParcels.length) {
      setCheckedParcelIds([]);
    } else {
      setCheckedParcelIds(bookedParcels.map(p => p.id));
    }
  };

  // Selected summaries
  const selectedParcels = bookedParcels.filter(p => checkedParcelIds.includes(p.id));
  const totalSelectedPieces = selectedParcels.reduce((sum, p) => sum + (p.pieces || 1), 0);
  const totalSelectedWeight = selectedParcels.reduce((sum, p) => sum + (Number(p.weight) || 0.5), 0);
  const totalSelectedCod = selectedParcels.reduce((sum, p) => sum + (Number(p.cod_amount) || 0), 0);

  // -------------------------------------------------------------------------
  // Generate Load Sheet
  // -------------------------------------------------------------------------
  const handleGenerateLoadSheet = async () => {
    if (checkedParcelIds.length === 0) {
      triggerToast('Please select at least one booked order to generate a load sheet.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const now = new Date();
      const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      const generatedSheetId = `LS-${dateCode}-${rand}`;

      // Pick default origin hub if available
      const defaultHubId = hubs.length > 0 ? hubs[0].id : null;

      // 1. Create Load Sheet record
      const sheetPayload: any = {
        sheet_id: generatedSheetId,
        date_created: now.toISOString(),
        status: 'Pending',
        parcels: checkedParcelIds,
      };
      if (defaultHubId) {
        sheetPayload.origin_hub = defaultHubId;
      }

      const createRes = await apiClient.post('/load-sheets', { data: sheetPayload });
      const createdSheet = createRes.data?.data;

      // 2. Link each parcel's load_sheet relation
      await Promise.all(
        checkedParcelIds.map(id => {
          const parcelObj = bookedParcels.find(p => p.id === id);
          const pDocId = parcelObj?.documentId || id;
          return apiClient.put(`/parcels/${pDocId}`, {
            data: {
              load_sheet: createdSheet?.documentId || createdSheet?.id,
            },
          }).catch(() => null);
        })
      );

      triggerToast(`Load Sheet ${generatedSheetId} generated with ${checkedParcelIds.length} orders!`, 'success');

      // 3. Prepare printable sheet object and immediately show PDF/Print view
      const printableObj = {
        id: createdSheet?.id,
        documentId: createdSheet?.documentId,
        sheet_id: generatedSheetId,
        date_created: now.toISOString(),
        status: 'Pending',
        origin_hub: hubs.find(h => h.id === defaultHubId) || { name: 'Main City Facility' },
        parcels: selectedParcels,
        shipperName: user?.shipper?.[0]?.name || user?.name || 'Shipper Store',
      };

      setShowPrintView(printableObj);
      setCheckedParcelIds([]);
      fetchBookedParcels();
      fetchLoadSheets();
    } catch (err: any) {
      console.error('Failed to generate load sheet:', err);
      triggerToast(err.response?.data?.error?.message || 'Failed to generate load sheet.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Dispatch Load Sheet (Sets Load Sheet to 'Dispatched' & Parcels to 'Not Arrived')
  // -------------------------------------------------------------------------
  const dispatchLoadSheetAction = async (sheet: any) => {
    try {
      const sheetDocId = sheet.documentId || sheet.id;
      // 1. Update load sheet to Dispatched
      await apiClient.put(`/load-sheets/${sheetDocId}`, {
        data: { status: 'Dispatched' },
      });

      // 2. Update all linked parcels to 'Not Arrived'
      const parcelsList = sheet.parcels || [];
      if (parcelsList.length > 0) {
        await Promise.all(
          parcelsList.map((p: any) => {
            const pDocId = p.documentId || p.id;
            return apiClient.put(`/parcels/${pDocId}`, {
              data: { status: 'Not Arrived' },
            }).catch(e => console.warn(`Could not update parcel ${pDocId}:`, e));
          })
        );
      }

      triggerToast(
        `Load Sheet ${sheet.sheet_id} Dispatched! ${parcelsList.length} parcel(s) transitioned to 'Not Arrived'.`,
        'success'
      );

      fetchLoadSheets();
      fetchBookedParcels();
      if (selectedSheet?.id === sheet.id) {
        setSelectedSheet({ ...selectedSheet, status: 'Dispatched' });
      }
    } catch (err: any) {
      console.error('Failed to dispatch load sheet:', err);
      triggerToast('Failed to dispatch load sheet.', 'error');
    }
  };

  // Barcode scan handler
  const handleBarcodeScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanBarcodeQuery.trim();
    if (!query) return;

    setIsProcessingScan(true);
    try {
      // Find matching load sheet by sheet_id
      const res = await apiClient.get('/load-sheets', {
        params: {
          filters: {
            sheet_id: { $eq: query },
          },
          populate: ['parcels'],
        },
      });

      const sheets = res.data?.data || [];
      if (sheets.length === 0) {
        triggerToast(`No load sheet found matching barcode "${query}". Please check the ID.`, 'error');
        return;
      }

      const sheet = sheets[0];
      if (sheet.status === 'Dispatched') {
        triggerToast(`Load Sheet ${sheet.sheet_id} is ALREADY marked as Dispatched.`, 'error');
        setScanBarcodeQuery('');
        return;
      }

      await dispatchLoadSheetAction(sheet);
      setScanBarcodeQuery('');
    } catch (err) {
      console.error('Barcode scan dispatch error:', err);
      triggerToast('Error processing barcode scan dispatch.', 'error');
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Delete Load Sheet
  const handleDeleteLoadSheet = async (sheetId: number, sheetCode: string) => {
    if (!confirm(`Are you sure you want to delete Load Sheet ${sheetCode}? Linked orders will be released back to the booked pool.`)) {
      return;
    }

    try {
      const sheetObj = loadSheets.find(s => s.id === sheetId);
      const sheetDocId = sheetObj?.documentId || sheetId;
      await apiClient.delete(`/load-sheets/${sheetDocId}`);
      triggerToast(`Load Sheet ${sheetCode} deleted successfully.`);
      if (selectedSheet?.id === sheetId) setSelectedSheet(null);
      fetchLoadSheets();
      fetchBookedParcels();
    } catch (err: any) {
      console.error('Failed to delete load sheet:', err);
      triggerToast(err.response?.data?.error?.message || 'Failed to delete load sheet.', 'error');
    }
  };

  const getStatusBadgeColors = (status?: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Dispatched':
        return 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'On-Route':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <PortalLayout>
      {/* Print stylesheet for A4 Sheet Format */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="p-lg max-w-[1920px] mx-auto w-full flex flex-col gap-lg no-print">
        
        {/* Floating Success / Error Notification */}
        {toast.show && (
          <div className={`fixed bottom-6 right-6 z-50 py-3.5 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border ${
            toast.type === 'success' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-red-950 border-red-800 text-red-200'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500 rounded-full p-1 text-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="bg-red-500 rounded-full p-1 text-white">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        )}

        {/* Header with Title & Barcode Scanner Quick Dispatch */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-white p-5 rounded-2xl border border-outline-variant shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                Official Manifest Lifecycle
              </span>
              <span className="text-xs text-slate-400 font-semibold">• DBARC Logistics Suite</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Load Sheet & Manifest Management
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Select date range, generate official cargo handover load sheets with barcodes, and dispatch to courier.
            </p>
          </div>

          {/* Rider Barcode Scanner / Dispatch Quick Action */}
          <form onSubmit={handleBarcodeScanSubmit} className="flex items-center gap-2 bg-slate-50 border border-slate-300 p-2 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-all max-w-md w-full">
            <ScanLine className="w-5 h-5 text-primary shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Scan / Enter Load Sheet Barcode (LS-...)"
              value={scanBarcodeQuery}
              onChange={(e) => setScanBarcodeQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isProcessingScan || !scanBarcodeQuery.trim()}
              className="bg-primary hover:bg-primary-container text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
            >
              {isProcessingScan ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Scan & Dispatch</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Generate New Load Sheet ({bookedParcels.length} Booked Orders)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Load Sheets History ({loadSheets.length} Manifests)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GENERATE LOAD SHEET (Booked Orders Grid with Date Range Filter)    */}
        {/* ========================================================================= */}
        {activeTab === 'create' && (
          <div className="flex flex-col gap-5">
            
            {/* Date Range Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 border border-outline-variant rounded-2xl shadow-xs items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Booked Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Booked End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBookedParcels}
                  className="flex-1 h-[38px] bg-primary text-white font-semibold text-xs rounded-xl hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Filter Date Range</span>
                </button>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="h-[38px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Generate Load Sheet CTA Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateLoadSheet}
                  disabled={isGenerating || checkedParcelIds.length === 0}
                  className="w-full h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Generate Load Sheet ({checkedParcelIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Orders</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {checkedParcelIds.length} <span className="text-xs text-slate-500 font-normal">/ {bookedParcels.length}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pieces</span>
                <span className="text-base font-black text-slate-900 font-mono">{totalSelectedPieces} pcs</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Weight</span>
                <span className="text-base font-black text-slate-900 font-mono">{totalSelectedWeight.toFixed(2)} kg</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total COD Value</span>
                <span className="text-base font-black text-emerald-700 font-mono">PKR {totalSelectedCod.toLocaleString()}</span>
              </div>
            </div>

            {/* Booked Orders Grid */}
            <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAllParcels}
                    className="flex items-center gap-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {checkedParcelIds.length === bookedParcels.length && bookedParcels.length > 0 ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-primary" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-slate-400" />
                        <span>Select All ({bookedParcels.length})</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Orders with status <strong className="text-slate-800">"Total Booking"</strong> awaiting courier pickup
                  </span>
                </div>

                <span className="text-xs font-semibold text-slate-500">
                  {bookedParcels.length} unassigned order{bookedParcels.length !== 1 ? 's' : ''} found
                </span>
              </div>

              <div className="overflow-x-auto min-h-[300px]">
                {loadingParcels ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                    <RefreshCw className="animate-spin text-primary w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">Loading booked orders...</p>
                  </div>
                ) : bookedParcels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-outline p-6 text-center">
                    <Package className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-base font-bold text-slate-800">No unassigned booked orders found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {startDate || endDate
                        ? 'No orders booked in the selected date range. Try clearing or expanding the date filter.'
                        : 'All booked orders have already been assigned to load sheets or dispatched.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-outline-variant font-bold text-slate-600 uppercase">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={checkedParcelIds.length === bookedParcels.length && bookedParcels.length > 0}
                            onChange={handleSelectAllParcels}
                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Tracking Number</th>
                        <th className="p-3">Consignee</th>
                        <th className="p-3">Destination City</th>
                        <th className="p-3 text-center">Pcs</th>
                        <th className="p-3 text-center">Weight</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3 text-right">COD Amount</th>
                        <th className="p-3">Booked Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {bookedParcels.map((p) => {
                        const isChecked = checkedParcelIds.includes(p.id);
                        return (
                          <tr
                            key={p.id}
                            onClick={() => handleToggleParcel(p.id)}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              isChecked ? 'bg-primary/5 font-medium' : ''
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleParcel(p.id)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-primary">
                              {p.tracking_number}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{p.recipient_name}</div>
                              <div className="text-[11px] text-slate-500">{p.recipient_phone}</div>
                            </td>
                            <td className="p-3 font-medium text-slate-700">
                              {p.destination_city?.name || p.recipient_address || 'Local City'}
                            </td>
                            <td className="p-3 text-center font-mono font-bold">{p.pieces || 1}</td>
                            <td className="p-3 text-center font-mono">{p.weight || 0.5} kg</td>
                            <td className="p-3">
                              {p.payment_type === 'PAID' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  PAID
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                  COD
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              PKR {Number(p.cod_amount || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LOAD SHEETS HISTORY & DISPATCH                                     */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-5">
            
            {/* History Date Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 border border-outline-variant rounded-2xl shadow-xs items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLoadSheets}
                  className="flex-1 h-[38px] bg-primary text-white font-semibold text-xs rounded-xl hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Filter Manifests</span>
                </button>
                {(historyStartDate || historyEndDate) && (
                  <button
                    onClick={() => {
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="h-[38px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
                <h4 className="font-bold text-sm text-slate-900">Generated Load Sheets & Manifests</h4>
                <span className="text-xs font-semibold text-slate-500">
                  Total {loadSheets.length} sheet{loadSheets.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="overflow-x-auto min-h-[300px]">
                {loadingSheets ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                    <RefreshCw className="animate-spin text-primary w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">Loading load sheets...</p>
                  </div>
                ) : loadSheets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-outline p-6 text-center">
                    <FileCheck2 className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-base font-bold text-slate-800">No load sheets found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Generate your first load sheet from the "Generate New Load Sheet" tab.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-outline-variant font-bold text-slate-600 uppercase">
                        <th className="p-3">Sheet ID / Barcode</th>
                        <th className="p-3">Date Created</th>
                        <th className="p-3">Origin Hub</th>
                        <th className="p-3 text-center">Parcels</th>
                        <th className="p-3 text-right">Total COD</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {loadSheets.map((sheet) => {
                        const parcelsList = sheet.parcels || [];
                        const sheetCodTotal = parcelsList.reduce((acc: number, p: any) => acc + (Number(p.cod_amount) || 0), 0);
                        const isDispatched = sheet.status === 'Dispatched' || sheet.status === 'Delivered';

                        return (
                          <tr key={sheet.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-sm text-primary block">{sheet.sheet_id}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Barcode Encoded</span>
                            </td>
                            <td className="p-3 text-slate-700">
                              {sheet.date_created ? new Date(sheet.date_created).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="p-3 text-slate-700 font-medium">
                              {sheet.origin_hub?.name || 'Main Courier Hub'}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-900">
                              {parcelsList.length} <span className="font-normal text-slate-400 text-[10px]">orders</span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                              PKR {sheetCodTotal.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeColors(sheet.status)}`}>
                                {sheet.status || 'Pending'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setShowPrintView(sheet)}
                                  title="Print / Save PDF Sheet"
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Print PDF</span>
                                </button>

                                <button
                                  onClick={() => setSelectedSheet(sheet)}
                                  title="View Sheet Details"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {!isDispatched && (
                                  <button
                                    onClick={() => dispatchLoadSheetAction(sheet)}
                                    title="Dispatch to Courier (Sets parcels to 'Not Arrived')"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Dispatch</span>
                                  </button>
                                )}

                                {!isShipperEmployee && !isDispatched && (
                                  <button
                                    onClick={() => handleDeleteLoadSheet(sheet.id, sheet.sheet_id)}
                                    title="Delete Load Sheet"
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* DETAIL MODAL                                                              */}
      {/* ========================================================================= */}
      {selectedSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-mono">
                  Load Sheet {selectedSheet.sheet_id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Manifest details and itemized order breakdown.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowPrintView(selectedSheet);
                    setSelectedSheet(null);
                  }}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open PDF Print View</span>
                </button>
                <button onClick={() => setSelectedSheet(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border mt-0.5 ${getStatusBadgeColors(selectedSheet.status)}`}>
                    {selectedSheet.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Date Created</span>
                  <span className="font-bold text-slate-800">{new Date(selectedSheet.date_created || Date.now()).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Origin Station</span>
                  <span className="font-bold text-slate-800">{selectedSheet.origin_hub?.name || 'Main Courier Hub'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Total Orders</span>
                  <span className="font-mono font-bold text-slate-900">{selectedSheet.parcels?.length || 0}</span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                <Code128BarcodeSvg text={selectedSheet.sheet_id} height={50} />
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Tracking Number</th>
                      <th className="p-2.5">Recipient</th>
                      <th className="p-2.5">Destination</th>
                      <th className="p-2.5 text-center">Pcs</th>
                      <th className="p-2.5 text-center">Weight</th>
                      <th className="p-2.5 text-right">COD (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSheet.parcels?.map((p: any, idx: number) => (
                      <tr key={p.id || idx}>
                        <td className="p-2.5 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-primary">{p.tracking_number}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{p.recipient_name}</td>
                        <td className="p-2.5 text-slate-600">{p.destination_city?.name || p.recipient_address || 'Local'}</td>
                        <td className="p-2.5 text-center font-mono">{p.pieces || 1}</td>
                        <td className="p-2.5 text-center font-mono">{p.weight || 0.5} kg</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">PKR {Number(p.cod_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Manual Dispatch CTA */}
              {selectedSheet.status !== 'Dispatched' && selectedSheet.status !== 'Delivered' && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-4 bg-emerald-50/50 p-4 rounded-xl border">
                  <div>
                    <h5 className="font-bold text-xs text-emerald-950">Dispatch to Courier (Sets parcels to 'Not Arrived')</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">Click to confirm physical handover to the courier pickup rider.</p>
                  </div>
                  <button
                    onClick={() => dispatchLoadSheetAction(selectedSheet)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Confirm & Mark Dispatched</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE / DOWNLOADABLE PDF SHEET MODAL (#print-area)                   */}
      {/* ========================================================================= */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header with Print CTA */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" />
                  Official Load Sheet Manifest (PDF Print Preview)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click "Print / Save PDF" to open the browser print dialog and save or print this official handover sheet.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintView(null)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Scrollable Document Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              
              {/* Target printable sheet (A4 dimensions style) */}
              <div id="print-area" className="bg-white w-full max-w-[850px] p-8 border border-slate-300 shadow-lg text-slate-900 font-sans flex flex-col gap-6">
                
                {/* Header with DBARC Branding & Load Sheet Barcode */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 tracking-tight">DBARC</span>
                      <span className="text-xs font-semibold text-slate-600">
                        [Digital Business Automation for Routing & Courier]
                      </span>
                    </div>
                    <h1 className="text-base font-black text-slate-900 mt-1 uppercase tracking-tight">
                      OFFICIAL COURIER LOAD SHEET & PICKUP MANIFEST
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Physical custody handover & verified cargo distribution dispatch document
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <Code128BarcodeSvg text={showPrintView.sheet_id} height={42} />
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-500 block font-bold text-[9px] uppercase">Manifest ID</span>
                    <span className="font-mono font-bold text-slate-900">{showPrintView.sheet_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold text-[9px] uppercase">Date & Time</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(showPrintView.date_created || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold text-[9px] uppercase">Origin Facility</span>
                    <span className="font-semibold text-slate-800">{showPrintView.origin_hub?.name || 'Main Courier Hub'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold text-[9px] uppercase">Shipper Business</span>
                    <span className="font-semibold text-slate-800">{showPrintView.shipperName || user?.shipper?.[0]?.name || user?.name || 'Shipper'}</span>
                  </div>
                </div>

                {/* Itemized Orders Table */}
                <table className="w-full text-left border-collapse text-[10px] mt-1">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800 font-bold uppercase text-[9px]">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-2">Tracking Number</th>
                      <th className="py-2 px-2">Recipient Name & Contact</th>
                      <th className="py-2 px-2">Delivery Destination</th>
                      <th className="py-2 px-2 text-center w-10">Pcs</th>
                      <th className="py-2 px-2 text-center w-14">Weight</th>
                      <th className="py-2 px-2 text-center w-16">Payment</th>
                      <th className="py-2 px-2 text-right w-24">COD Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {showPrintView.parcels?.map((parcel: any, idx: number) => (
                      <tr key={parcel.id || idx} className="align-top py-1.5">
                        <td className="py-2 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">{parcel.tracking_number}</td>
                        <td className="py-2 px-2">
                          <div className="font-bold text-slate-900">{parcel.recipient_name}</div>
                          <div className="text-[9px] text-slate-500">{parcel.recipient_phone}</div>
                        </td>
                        <td className="py-2 px-2 text-slate-700 leading-tight">
                          <div className="font-semibold">{parcel.destination_city?.name || 'Local'}</div>
                          <div className="text-[9px] text-slate-500 truncate max-w-[200px]">{parcel.recipient_address}</div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{parcel.pieces || 1}</td>
                        <td className="py-2 px-2 text-center font-mono">{parcel.weight || 0.5} kg</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                            parcel.payment_type === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {parcel.payment_type || 'COD'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          PKR {Number(parcel.cod_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-[11px] bg-slate-50">
                      <td colSpan={4} className="py-2.5 px-2">Total Manifest Summary</td>
                      <td className="py-2.5 px-2 text-center font-mono font-black">
                        {showPrintView.parcels?.reduce((acc: number, p: any) => acc + (p.pieces || 1), 0)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black">
                        {showPrintView.parcels?.reduce((acc: number, p: any) => acc + (Number(p.weight) || 0.5), 0).toFixed(2)} kg
                      </td>
                      <td className="py-2.5 px-2"></td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-800">
                        PKR {showPrintView.parcels?.reduce((acc: number, p: any) => acc + (Number(p.cod_amount) || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Bottom Section: Scannable Barcode & Receiving Signatures */}
                <div className="border-t-2 border-slate-900 pt-6 mt-4 flex flex-col gap-6">
                  
                  {/* Scannable Barcode */}
                  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-300 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-500 uppercase mb-1">
                      Courier Pickup Verification Barcode (Scan to Dispatch)
                    </span>
                    <Code128BarcodeSvg text={showPrintView.sheet_id} height={55} />
                  </div>

                  {/* Dual Signatures & Stamp Blocks */}
                  <div className="grid grid-cols-2 gap-8 text-[10px]">
                    <div className="border border-slate-300 rounded-lg p-4 flex flex-col justify-between h-32">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">
                        Courier Rider Verification & Receiving
                      </span>
                      <div className="border-b border-slate-400 w-full mb-1" />
                      <div className="flex justify-between text-slate-400 text-[9px]">
                        <span>Rider Name / Phone / Vehicle No</span>
                        <span>Signature & Stamp</span>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-4 flex flex-col justify-between h-32">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">
                        Shipper Store Handover Confirmation
                      </span>
                      <div className="border-b border-slate-400 w-full mb-1" />
                      <div className="flex justify-between text-slate-400 text-[9px]">
                        <span>Authorized Signatory</span>
                        <span>Date & Stamp</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="text-[9px] text-slate-400 text-center font-medium">
                    This load sheet serves as legal custody handover between Shipper and DBARC Courier.
                    Upon rider optical scan of the barcode above, all listed orders automatically transition to "Not Arrived" (In Handover Transit).
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </PortalLayout>
  );
}

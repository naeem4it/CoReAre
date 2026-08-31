'use client';

import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';
import {
  FileSpreadsheet,
  Printer,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
  Truck,
} from 'lucide-react';

interface Parcel {
  id: number;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  destination_city?: { name: string };
  weight: number;
  pieces: number;
  cod_amount: number;
  service_type: string;
  status: string;
  createdAt: string;
}

interface LoadSheet {
  id: number;
  sheet_number?: string;
  load_sheet_number?: string;
  createdAt: string;
  parcels?: Parcel[];
  status?: string;
}

export default function MerchantLoadSheetPage() {
  const { user } = useAuthStore();
  const [unassignedParcels, setUnassignedParcels] = React.useState<Parcel[]>([]);
  const [loadSheetsHistory, setLoadSheetsHistory] = React.useState<LoadSheet[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'create' | 'history'>('create');

  // Print Preview Modal
  const [printSheet, setPrintSheet] = React.useState<any | null>(null);

  // Toast
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch unassigned booked parcels
      const parcelRes = await apiClient.get('/parcels', {
        params: {
          'filters[load_sheet][$null]': 'true',
          'filters[status][$in]': ['Total Booking', 'Not Arrived'],
          populate: ['destination_city'],
          sort: ['createdAt:desc'],
        },
      });
      setUnassignedParcels(parcelRes.data?.data || []);

      // 2. Fetch load sheets history
      const historyRes = await apiClient.get('/load-sheets', {
        params: {
          populate: ['parcels', 'parcels.destination_city'],
          sort: ['createdAt:desc'],
        },
      });
      setLoadSheetsHistory(historyRes.data?.data || []);
    } catch (err) {
      console.warn('Could not fetch load sheet data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleToggleParcel = (id: number) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedParcelIds.length === unassignedParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(unassignedParcels.map((p) => p.id));
    }
  };

  const filteredParcels = React.useMemo(() => {
    if (!searchQuery.trim()) return unassignedParcels;
    const q = searchQuery.toLowerCase().trim();
    return unassignedParcels.filter(
      (p) =>
        p.tracking_number.toLowerCase().includes(q) ||
        p.recipient_name.toLowerCase().includes(q) ||
        p.recipient_phone.toLowerCase().includes(q) ||
        p.destination_city?.name.toLowerCase().includes(q)
    );
  }, [unassignedParcels, searchQuery]);

  // Selected totals
  const selectedParcels = unassignedParcels.filter((p) => selectedParcelIds.includes(p.id));
  const totalSelectedPieces = selectedParcels.reduce((acc, p) => acc + (p.pieces || 1), 0);
  const totalSelectedWeight = selectedParcels.reduce((acc, p) => acc + (Number(p.weight) || 0.5), 0);
  const totalSelectedCod = selectedParcels.reduce((acc, p) => acc + (Number(p.cod_amount) || 0), 0);

  const handleGenerateLoadSheet = async () => {
    if (selectedParcelIds.length === 0) {
      showToast('Please select at least one parcel for the load sheet.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const sheetNum = `LS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Load Sheet in Strapi
      const loadSheetRes = await apiClient.post('/load-sheets', {
        data: {
          load_sheet_number: sheetNum,
          sheet_number: sheetNum,
          parcels: selectedParcelIds,
          status: 'Pending',
        },
      });

      const createdSheet = loadSheetRes.data?.data;

      // 2. Link each parcel to this load sheet
      for (const id of selectedParcelIds) {
        try {
          await apiClient.put(`/parcels/${id}`, {
            data: {
              load_sheet: createdSheet?.id,
            },
          });
        } catch (e) {
          // Continue
        }
      }

      showToast(`Load Sheet ${sheetNum} created with ${selectedParcelIds.length} parcels!`, 'success');

      // Set print modal
      setPrintSheet({
        sheet_number: sheetNum,
        createdAt: new Date().toISOString(),
        parcels: selectedParcels,
        totalPieces: totalSelectedPieces,
        totalWeight: totalSelectedWeight,
        totalCod: totalSelectedCod,
      });

      setSelectedParcelIds([]);
      fetchData();
    } catch (err: any) {
      console.error('Failed to create load sheet:', err);
      showToast('Failed to create load sheet. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
              : 'bg-rose-900/90 border-rose-700 text-rose-100'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Pickup Handover Manifest
            </span>
            <span className="text-xs text-slate-400">• Official Courier Handoff</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Merchant Load Sheet</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Group booked shipments into handover manifests with official signatures & barcodes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'create'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          Generate New Manifest ({unassignedParcels.length} Unassigned)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Manifest History ({loadSheetsHistory.length})
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-6">
          {/* Summary Banner & Action */}
          <Card className="rounded-3xl border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Selected Shipments for Manifest
                  </span>
                  <div className="flex flex-wrap items-baseline gap-6">
                    <div>
                      <span className="text-3xl font-extrabold text-white">{selectedParcelIds.length}</span>
                      <span className="text-xs text-slate-300 ml-1.5">Parcels</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-white">{totalSelectedPieces}</span>
                      <span className="text-xs text-slate-300 ml-1.5">Pieces</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-white">{totalSelectedWeight.toFixed(1)}</span>
                      <span className="text-xs text-slate-300 ml-1.5">KG</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-emerald-400">PKR {totalSelectedCod.toLocaleString()}</span>
                      <span className="text-xs text-slate-300 ml-1.5">Total COD</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateLoadSheet}
                  disabled={selectedParcelIds.length === 0 || isGenerating}
                  className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3.5 shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  {isGenerating ? 'Generating Manifest...' : 'Generate & Print Load Sheet'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search & Select Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="rounded-xl text-xs border-slate-300 text-slate-700"
              >
                {selectedParcelIds.length === unassignedParcels.length && unassignedParcels.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-1.5 text-emerald-600" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-1.5" /> Select All ({unassignedParcels.length})
                  </>
                )}
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search parcels by tracking, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white"
              />
            </div>
          </div>

          {/* Unassigned Parcels List */}
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500 font-medium">Loading unassigned bookings...</p>
            </div>
          ) : filteredParcels.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No Pending Bookings</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  All your booked shipments are already assigned to load sheets.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="p-4 w-10"></th>
                      <th className="p-4">Tracking Number</th>
                      <th className="p-4">Recipient</th>
                      <th className="p-4">Destination</th>
                      <th className="p-4">Pieces & Weight</th>
                      <th className="p-4">COD Amount</th>
                      <th className="p-4">Booked Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredParcels.map((parcel) => {
                      const isSelected = selectedParcelIds.includes(parcel.id);
                      return (
                        <tr
                          key={parcel.id}
                          onClick={() => handleToggleParcel(parcel.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/60 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {parcel.tracking_number}
                          </td>
                          <td className="p-4">
                            <div>{parcel.recipient_name}</div>
                            <div className="text-slate-400">{parcel.recipient_phone}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-900">
                            {parcel.destination_city?.name || 'Local City'}
                          </td>
                          <td className="p-4">
                            {parcel.pieces || 1} pcs / {parcel.weight || 0.5} kg
                          </td>
                          <td className="p-4 font-bold text-slate-900">
                            PKR {parcel.cod_amount?.toLocaleString() || 0}
                          </td>
                          <td className="p-4 text-slate-400">
                            {new Date(parcel.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Load Sheets History */
        <div className="space-y-4">
          {loadSheetsHistory.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardContent className="p-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No Past Manifests Found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  You haven't generated any load sheet manifests yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {loadSheetsHistory.map((sheet) => {
                const sheetParcels = sheet.parcels || [];
                const sheetNumber = sheet.load_sheet_number || sheet.sheet_number || `LS-#${sheet.id}`;
                const totalCOD = sheetParcels.reduce((acc, p) => acc + (Number(p.cod_amount) || 0), 0);
                const totalWeight = sheetParcels.reduce((acc, p) => acc + (Number(p.weight) || 0.5), 0);

                return (
                  <Card
                    key={sheet.id}
                    className="rounded-2xl border-slate-200 hover:border-slate-300 shadow-sm transition-all overflow-hidden"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-sm">
                          {sheetNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(sheet.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 mb-4">
                        <p>Total Parcels: <span className="font-bold text-slate-900">{sheetParcels.length}</span></p>
                        <p>Total Weight: <span className="font-bold text-slate-900">{totalWeight.toFixed(1)} KG</span></p>
                        <p>Total COD: <span className="font-bold text-emerald-600">PKR {totalCOD.toLocaleString()}</span></p>
                      </div>

                      <Button
                        onClick={() =>
                          setPrintSheet({
                            sheet_number: sheetNumber,
                            createdAt: sheet.createdAt,
                            parcels: sheetParcels,
                            totalPieces: sheetParcels.reduce((acc, p) => acc + (p.pieces || 1), 0),
                            totalWeight,
                            totalCod: totalCOD,
                          })
                        }
                        variant="outline"
                        className="w-full rounded-xl text-xs border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Handover Manifest
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Print Preview & Official Manifest Modal */}
      <Modal
        isOpen={!!printSheet}
        onClose={() => setPrintSheet(null)}
        title="Official Handover Manifest Receipt"
      >
        <div className="space-y-5 pt-2 text-slate-900" id="print-area">
          {/* Manifest Header */}
          <div className="border-b border-slate-300 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black tracking-tight">DBARc LOGISTICS MANIFEST</h2>
              <p className="text-xs text-slate-500 font-medium">Official Pickup & Transit Handover Document</p>
              <p className="text-xs font-mono font-bold mt-2">Manifest #{printSheet?.sheet_number}</p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="font-semibold text-slate-800">Date: {new Date(printSheet?.createdAt || Date.now()).toLocaleDateString()}</p>
              <p className="text-slate-500">Merchant: {user?.fullName || user?.username || 'Authorized Merchant'}</p>
            </div>
          </div>

          {/* Manifest Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Tracking No</th>
                  <th className="p-2.5">Recipient</th>
                  <th className="p-2.5">Destination</th>
                  <th className="p-2.5">Weight</th>
                  <th className="p-2.5 text-right">COD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {printSheet?.parcels?.map((p: any, idx: number) => (
                  <tr key={p.id || idx}>
                    <td className="p-2.5 text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-mono font-bold">{p.tracking_number}</td>
                    <td className="p-2.5 truncate max-w-[120px]">{p.recipient_name}</td>
                    <td className="p-2.5">{p.destination_city?.name || 'Local'}</td>
                    <td className="p-2.5">{p.weight || 0.5} kg</td>
                    <td className="p-2.5 text-right font-semibold">PKR {p.cod_amount?.toLocaleString() || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between text-xs font-semibold text-slate-800">
            <span>Total Parcels: {printSheet?.parcels?.length || 0}</span>
            <span>Total Weight: {printSheet?.totalWeight?.toFixed(1) || 0} KG</span>
            <span className="text-emerald-700 font-bold">Total COD: PKR {printSheet?.totalCod?.toLocaleString() || 0}</span>
          </div>

          {/* Signatures & Stamp Blocks */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-300 text-xs">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center space-y-8">
              <span className="text-slate-500 font-medium">Merchant Handover Signature</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto" />
              <p className="text-[10px] text-slate-400">Date & Stamp</p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center space-y-8">
              <span className="text-slate-500 font-medium">Courier Rider / Pickup Officer</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto" />
              <p className="text-[10px] text-slate-400">Rider Name & Vehicle No</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setPrintSheet(null)} className="rounded-xl">
              Close
            </Button>
            <Button onClick={handlePrint} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              <Printer className="w-4 h-4 mr-1.5" />
              Print Manifest
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

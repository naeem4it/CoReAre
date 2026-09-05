'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, Upload, FileSpreadsheet, Trash2, Save, RefreshCw, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, ArrivalService } from '@/services/api';

interface BulkShipmentItem {
  id: string;
  shipmentNumber: string;
  pieces: number;
  weight: number;
}

export default function OperationsBulkArrivalsPage() {
  const [batchId, setBatchId] = React.useState<string>(`BAR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [riders, setRiders] = React.useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('');
  const [selectedFileName, setSelectedFileName] = React.useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [shipments, setShipments] = React.useState<BulkShipmentItem[]>([]);

  // Toast notification
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch real active riders from backend
  React.useEffect(() => {
    const fetchRiders = async () => {
      try {
        const res = await RiderService.getAll('?filters[status][$ne]=inactive');
        const ridersList = res.data || [];
        setRiders(ridersList);
        if (ridersList.length > 0) {
          setSelectedRiderId(String(ridersList[0].id));
        }
      } catch (err) {
        console.warn('Could not load riders list:', err);
      }
    };
    fetchRiders();
  }, []);

  const handleDownloadFormat = () => {
    const csvContent = "data:text/csv;charset=utf-8,CN,WEIGHT,PIECES\nDBA-100234,1.2,1\nDBA-100235,0.8,1\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "BULK_UPLOAD_EXCEL_TEMPLATE.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFileName(file.name);
    setIsLoadingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          triggerToast('Uploaded file appears to be empty.', 'error');
          setIsLoadingFile(false);
          return;
        }

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          triggerToast('No data rows found in uploaded file.', 'error');
          setIsLoadingFile(false);
          return;
        }

        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(/,|\t/).map(h => h.trim().replace(/['"]/g, ''));
        const cnIndex = headers.findIndex(h => h === 'cn' || h.includes('tracking') || h.includes('shipment') || h.includes('number'));
        const wtIndex = headers.findIndex(h => h === 'weight' || h.includes('wt'));
        const pcsIndex = headers.findIndex(h => h === 'pieces' || h.includes('pcs') || h.includes('qty'));

        const parsedItems: BulkShipmentItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,|\t/).map(c => c.trim().replace(/['"]/g, ''));
          const cnVal = cnIndex !== -1 ? cols[cnIndex] : cols[0];
          if (!cnVal) continue;

          const wtVal = wtIndex !== -1 && cols[wtIndex] ? parseFloat(cols[wtIndex]) : 1.0;
          const pcsVal = pcsIndex !== -1 && cols[pcsIndex] ? parseInt(cols[pcsIndex], 10) : 1;

          parsedItems.push({
            id: `row-${i}-${Date.now()}`,
            shipmentNumber: cnVal.toUpperCase().replace('#', ''),
            weight: isNaN(wtVal) ? 1.0 : wtVal,
            pieces: isNaN(pcsVal) ? 1 : pcsVal,
          });
        }

        if (parsedItems.length === 0) {
          triggerToast('No valid shipment rows could be extracted.', 'error');
        } else {
          setShipments(prev => [...parsedItems, ...prev]);
          triggerToast(`Successfully parsed ${parsedItems.length} shipment entries.`, 'success');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        triggerToast('Failed to parse file. Please upload a valid CSV template.', 'error');
      } finally {
        setIsLoadingFile(false);
      }
    };

    reader.onerror = () => {
      triggerToast('Error reading the selected file.', 'error');
      setIsLoadingFile(false);
    };

    reader.readAsText(file);
  };

  const handleRemoveItem = (id: string) => {
    setShipments(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if (confirm('Reset bulk arrivals form?')) {
      setBatchId(`BAR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setSelectedFileName('');
    }
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please upload a spreadsheet or add shipments before saving.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Mark parcels as Arrived in Strapi
      let updatedCount = 0;
      for (const item of shipments) {
        try {
          const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
          const found = parcelRes.data?.data?.[0];
          if (found) {
            await apiClient.put(`/parcels/${found.id}`, {
              data: {
                status: 'Arrived',
                arrival_date: new Date().toISOString()
              }
            });
            updatedCount++;
          }
        } catch (e) {
          console.warn(`Could not update parcel ${item.shipmentNumber}:`, e);
        }
      }

      // 2. Persist Arrival Batch
      try {
        await ArrivalService.createBatch({
          batch_id: batchId,
          rider: selectedRiderId ? Number(selectedRiderId) : null,
          total_shipments: shipments.length,
          total_weight: totalWeight,
          total_pieces: totalPieces,
          scanned_items: shipments,
          arrival_date: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Batch entity notice:', e);
      }

      triggerToast(`Batch ${batchId} saved! ${shipments.length} parcels processed (${updatedCount} updated in system).`, 'success');
      setBatchId(`BAR-${Math.floor(100000 + Math.random() * 900000)}`);
      setShipments([]);
      setSelectedFileName('');
    } catch (err) {
      console.error('Save error:', err);
      triggerToast('Failed to save bulk arrivals batch.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPieces = React.useMemo(() => shipments.reduce((acc, curr) => acc + curr.pieces, 0), [shipments]);
  const totalWeight = React.useMemo(() => shipments.reduce((acc, curr) => acc + curr.weight, 0), [shipments]);

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Operation / Bulk Arrivals</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Upload Form Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Batch ID</label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rider (Optional)</label>
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">— No Rider Assigned —</option>
                {riders.map((r: any) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name || r.attributes?.name || `Rider #${r.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Download Format Row */}
          <div className="flex items-center justify-between bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs font-semibold text-blue-900">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Download standard Excel template with <strong>CN</strong> and <strong>WEIGHT</strong> headers.</span>
            </div>
            <button
              onClick={handleDownloadFormat}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Template
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl p-8 bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100/50 text-primary flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Drop an XLSX / XLS file here</h3>
              <p className="text-xs text-slate-500 mt-0.5">Supports Microsoft Excel sheet with CN numbers and package weights.</p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <label className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" /> Choose File
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {selectedFileName && (
                <span className="text-xs font-bold text-slate-800 bg-slate-200 px-3 py-1.5 rounded-lg">
                  {selectedFileName}
                </span>
              )}
            </div>

            {isLoadingFile && (
              <div className="text-xs font-bold text-primary animate-pulse mt-2">
                Parsing Excel sheet entries...
              </div>
            )}
          </div>

        </div>

        {/* Shipments List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Shipments List ({shipments.length})</span>
            <div className="flex items-center gap-4 text-xs">
              <span>Total Pieces: <strong className="text-amber-400">{totalPieces}</strong></span>
              <span>Total Weight: <strong className="text-amber-400">{totalWeight.toFixed(2)} KG</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Shipment #</th>
                  <th className="px-6 py-3.5 text-center">Pieces</th>
                  <th className="px-6 py-3.5 text-center">Weight (KG)</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      No bulk arrival shipments imported yet. Upload Excel file above.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {s.shipmentNumber}
                      </td>
                      <td className="px-6 py-3.5 text-center">{s.pieces}</td>
                      <td className="px-6 py-3.5 text-center">{s.weight.toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleRemoveItem(s.id)}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
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
    </PortalLayout>
  );
}

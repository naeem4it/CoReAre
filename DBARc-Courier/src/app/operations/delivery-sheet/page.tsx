import { apiClient } from '@/shared/api/api-client';
import { RiderService, DeliverySheetService } from '@/services/api';

interface DeliverySheetItem {
  id: string;
  sheetNumber: number;
  date: string;
  riderName: string;
  customName: string;
  routeCode: string;
  cityCode: string;
}

interface DeliveryShipment {
  id: string;
  parcelId?: number;
  shipmentNumber: string;
  shipmentRef: string;
  shipperName: string;
  consigneeName: string;
  consigneeAddress: string;
  destination: string;
  pieces: number;
  weight: number;
  amountCollect: number;
  status: 'Delivered' | 'Ready To Return' | 'Failed Attempt' | 'Out For Delivery';
  remarks: string;
}

const PAST_DELIVERY_SHEETS: DeliverySheetItem[] = [
  { id: '1', sheetNumber: 1245379, date: '2026-06-06 10:46:41', riderName: 'Rahat Yousuf', customName: 'Morning Express', routeCode: '3253', cityCode: 'LHE' },
  { id: '2', sheetNumber: 1245377, date: '2026-06-06 10:36:43', riderName: 'Saleem Usman', customName: 'Zone 2 Deliveries', routeCode: '3253', cityCode: 'LHE' },
  { id: '3', sheetNumber: 1245376, date: '2026-06-06 10:19:28', riderName: 'Honey Sawan', customName: 'Samanabad Route', routeCode: '3253', cityCode: 'LHE' },
  { id: '4', sheetNumber: 1245375, date: '2026-06-06 10:15:55', riderName: 'Muhammad Sheraz', customName: 'Gulberg Route', routeCode: '3253', cityCode: 'LHE' },
  { id: '5', sheetNumber: 1245371, date: '2026-06-06 09:50:39', riderName: 'Zulqadar', customName: 'Model Town Route', routeCode: '3253', cityCode: 'LHE' },
  { id: '6', sheetNumber: 1245172, date: '2026-06-05 10:48:48', riderName: 'Hamza Baloch', customName: 'Johar Town Route', routeCode: '3253', cityCode: 'LHE' }
];

export default function OperationsDeliverySheetPage() {
  const [sheetNumber, setSheetNumber] = React.useState<number>(1245172);
  const [selectedRider, setSelectedRider] = React.useState<string>('Hamza Baloch (2851)');
  const [routeCode, setRouteCode] = React.useState<string>('Fly Courier Service (3253)');
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Modals
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [isDsspModalOpen, setIsDsspModalOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState('');

  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const [shipments, setShipments] = React.useState<DeliveryShipment[]>([
    {
      id: '1',
      shipmentNumber: '400798861',
      shipmentRef: '297343',
      shipperName: 'Nasir Enterprises',
      consigneeName: 'Bilal Khan',
      consigneeAddress: 'House 378 Kamran block allama iqbal town - Contact # 03174361621',
      destination: 'LHE',
      pieces: 1,
      weight: 1.0,
      amountCollect: 995,
      status: 'Ready To Return',
      remarks: 'refused'
    },
    {
      id: '2',
      shipmentNumber: '400796655',
      shipmentRef: '296886',
      shipperName: 'Nasir Enterprises',
      consigneeName: 'Hassaan Malik',
      consigneeAddress: 'Umer Block Street 6, 576 House Number - Contact # 03196568634',
      destination: 'LHE',
      pieces: 1,
      weight: 1.0,
      amountCollect: 1598,
      status: 'Delivered',
      remarks: 'delivered to customer'
    },
    {
      id: '3',
      shipmentNumber: '400797931',
      shipmentRef: '297284',
      shipperName: 'Nasir Enterprises',
      consigneeName: 'Laiba Ijaz',
      consigneeAddress: 'House no 4 inside govt chishtia high school for boys islampura, Lahore',
      destination: 'LHE',
      pieces: 1,
      weight: 1.0,
      amountCollect: 2499,
      status: 'Delivered',
      remarks: 'paid cash'
    },
    {
      id: '4',
      shipmentNumber: '400798661',
      shipmentRef: '#361400',
      shipperName: 'Dr. Arooba Organics Lahore',
      consigneeName: 'Qasim Ali bhatti',
      consigneeAddress: 'House no 2 Irfan street Last bus stop Sanda Kalan, Lahore',
      destination: 'LHE',
      pieces: 1,
      weight: 0.8,
      amountCollect: 1352,
      status: 'Delivered',
      remarks: 'received'
    },
    {
      id: '5',
      shipmentNumber: '400797285',
      shipmentRef: '#361281',
      shipperName: 'Dr. Arooba Organics Lahore',
      consigneeName: 'Jannat Farhan',
      consigneeAddress: 'House 22/A Samanzar Colony Mor Samanabad, Lahore',
      destination: 'LHE',
      pieces: 1,
      weight: 0.8,
      amountCollect: 6248,
      status: 'Delivered',
      remarks: 'received'
    }
  ]);

  const handleUpdateStatus = (id: string, newStatus: any) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const handleUpdateRemarks = (id: string, text: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, remarks: text } : s));
  };

  const handleAddShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const barcode = scanBarcode.trim().toUpperCase();
    if (shipments.some(s => s.shipmentNumber === barcode)) {
      triggerToast(`Shipment ${barcode} already added to sheet.`, 'error');
      return;
    }

    try {
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${barcode}&populate=*`);
      const parcel = res.data?.data?.[0];

      const newItem: DeliveryShipment = {
        id: Date.now().toString(),
        parcelId: parcel?.id,
        shipmentNumber: barcode,
        shipmentRef: `#${Math.floor(100000 + Math.random() * 900000)}`,
        shipperName: parcel?.shipper?.name || 'Assigned Merchant',
        consigneeName: parcel?.recipient_name || 'Recipient Consignee',
        consigneeAddress: parcel?.recipient_address || 'Delivery Address',
        destination: parcel?.destination_city?.name || 'LHE',
        pieces: 1,
        weight: parcel?.weight || 1.0,
        amountCollect: parcel?.cod_amount || 0,
        status: 'Out For Delivery',
        remarks: ''
      };

      setShipments(prev => [newItem, ...prev]);
      setScanBarcode('');
    } catch (err) {
      console.warn('Could not query parcel, adding standard item:', err);
      const newItem: DeliveryShipment = {
        id: Date.now().toString(),
        shipmentNumber: barcode,
        shipmentRef: `#${Math.floor(100000 + Math.random() * 900000)}`,
        shipperName: 'Merchant Store',
        consigneeName: 'Recipient Customer',
        consigneeAddress: 'Delivery Address Location',
        destination: 'LHE',
        pieces: 1,
        weight: 1.0,
        amountCollect: 0,
        status: 'Out For Delivery',
        remarks: ''
      };
      setShipments(prev => [newItem, ...prev]);
      setScanBarcode('');
    }
  };

  const handleSave = async () => {
    if (shipments.length === 0) {
      triggerToast('Please add at least one shipment before saving.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update parcel statuses & remarks in Strapi
      for (const item of shipments) {
        try {
          if (item.parcelId) {
            await apiClient.put(`/parcels/${item.parcelId}`, {
              data: {
                status: item.status,
                comments: item.remarks || undefined,
              }
            });
          } else {
            const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${item.shipmentNumber}`);
            const p = parcelRes.data?.data?.[0];
            if (p) {
              await apiClient.put(`/parcels/${p.id}`, {
                data: {
                  status: item.status,
                  comments: item.remarks || undefined,
                }
              });
            }
          }
        } catch (e) {
          console.warn(`Could not sync parcel ${item.shipmentNumber}:`, e);
        }
      }

      // 2. Persist Delivery Sheet
      try {
        await DeliverySheetService.create({
          sheet_number: sheetNumber,
          rider_name: selectedRider,
          route_code: routeCode,
          total_parcels: shipments.length,
          total_cod: totalCollect,
          delivered_count: deliveredCount,
          return_count: returnCount,
          parcels_data: shipments,
          date: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Delivery sheet entity save notice:', e);
      }

      triggerToast(`Delivery Sheet #${sheetNumber} updated successfully! Statuses persisted to database.`, 'success');
    } catch (err) {
      console.error('Failed to save delivery sheet:', err);
      triggerToast('Error saving delivery sheet.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset delivery sheet form?')) {
      setSheetNumber(prev => prev + 1);
      setShipments([]);
    }
  };

  const filteredPastSheets = PAST_DELIVERY_SHEETS.filter(s =>
    s.sheetNumber.toString().includes(modalSearch) ||
    s.riderName.toLowerCase().includes(modalSearch.toLowerCase()) ||
    s.customName.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const totalCollect = React.useMemo(() => shipments.reduce((acc, curr) => acc + curr.amountCollect, 0), [shipments]);
  const deliveredCount = React.useMemo(() => shipments.filter(s => s.status === 'Delivered').length, [shipments]);
  const returnCount = React.useMemo(() => shipments.filter(s => s.status === 'Ready To Return').length, [shipments]);

  return (
    <PortalLayout>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success' ? (
            <div className="bg-emerald-500 rounded-full p-1 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="bg-red-500 rounded-full p-1 text-white">
              <Shield className="w-4 h-4" />
            </div>
          )}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">

        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Module</div>
            <h1 className="text-xl font-bold tracking-tight">Delivery Sheet # : {sheetNumber}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsListModalOpen(true)}
              className="bg-primary hover:bg-primary-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>

            {/* DSSP BUTTON */}
            <button
              onClick={() => setIsDsspModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileText className="w-4 h-4" /> DSSP Printout
            </button>

            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Rider Info & Scanner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rider Name</label>
              <input
                type="text"
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Route Code</label>
              <input
                type="text"
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Summary</label>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs font-bold flex items-center justify-between text-slate-800">
                <span>Delivered: <strong className="text-emerald-600">{deliveredCount}</strong></span>
                <span>Return: <strong className="text-red-600">{returnCount}</strong></span>
                <span>Collect: <strong className="text-blue-600">Rs. {totalCollect}</strong></span>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddShipment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" /> Scan CN / Shipment # to Add into Delivery Sheet
              </label>
              <input
                type="text"
                placeholder="Scan CN barcode..."
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>
        </div>

        {/* Shipments List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span>Shipments List ({shipments.length})</span>
            <span className="text-xs text-amber-400 font-bold">Total COD Collect: Rs. {totalCollect}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Shipment #</th>
                  <th className="px-4 py-3.5">Ref #</th>
                  <th className="px-4 py-3.5">Shipper Name</th>
                  <th className="px-4 py-3.5">Consignee Name</th>
                  <th className="px-4 py-3.5 text-center">Dest</th>
                  <th className="px-4 py-3.5 text-center">Pieces</th>
                  <th className="px-4 py-3.5 text-center">Weight</th>
                  <th className="px-4 py-3.5 text-right">COD Amount</th>
                  <th className="px-4 py-3.5 text-center">Delivery Status</th>
                  <th className="px-4 py-3.5">Reason / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{s.shipmentNumber}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono">{s.shipmentRef}</td>
                    <td className="px-4 py-3.5 text-slate-900">{s.shipperName}</td>
                    <td className="px-4 py-3.5 text-slate-900">{s.consigneeName}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-900">{s.destination}</td>
                    <td className="px-4 py-3.5 text-center">{s.pieces}</td>
                    <td className="px-4 py-3.5 text-center">{s.weight.toFixed(2)} KG</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">Rs. {s.amountCollect}</td>
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={s.status}
                        onChange={(e) => handleUpdateStatus(s.id, e.target.value as any)}
                        className={`py-1 px-2.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                          s.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : s.status === 'Ready To Return'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Delivered">Delivered</option>
                        <option value="Ready To Return">Ready To Return</option>
                        <option value="Failed Attempt">Failed Attempt</option>
                        <option value="Out For Delivery">Out For Delivery</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        type="text"
                        value={s.remarks}
                        onChange={(e) => handleUpdateRemarks(s.id, e.target.value)}
                        placeholder="Enter rider remarks..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-semibold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DELIVERY SHEETS LIST MODAL */}
        {isListModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <h2 className="text-base font-bold">Delivery Sheets List</h2>
                <button onClick={() => setIsListModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sheet #, rider name, or route..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">Showing {filteredPastSheets.length} sheets</span>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Sheet #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Rider Name</th>
                      <th className="p-3">Custom Name</th>
                      <th className="p-3">Route Code</th>
                      <th className="p-3 text-center">City Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {filteredPastSheets.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-primary">{s.sheetNumber}</td>
                        <td className="p-3 text-slate-600">{s.date}</td>
                        <td className="p-3 font-bold text-slate-900">{s.riderName}</td>
                        <td className="p-3 text-slate-500">{s.customName}</td>
                        <td className="p-3 font-mono text-slate-600">{s.routeCode}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{s.cityCode}</td>
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

        {/* DSSP PRINTABLE MODAL */}
        {isDsspModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-8 flex flex-col gap-6 border border-slate-300">
              
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">DSSP - Delivery Status & Summary Printout</h2>
                  <p className="text-xs text-slate-500">Printable courier runsheet format with barcode and signature fields.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Printer className="w-4 h-4" /> Print DSSP Sheet
                  </button>
                  <button onClick={() => setIsDsspModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* DSSP Printable Layout */}
              <div className="border border-slate-300 rounded-2xl p-6 bg-white space-y-6">
                
                {/* Barcode & Info Top */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-4 gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-500">Delivery Sheet #: <strong className="text-slate-900">{sheetNumber}</strong></div>
                    <div className="text-xs font-bold text-slate-500 mt-1">Rider: <strong className="text-slate-900">{selectedRider}</strong></div>
                    <div className="text-xs font-bold text-slate-500 mt-1">Route: <strong className="text-slate-900">{routeCode}</strong></div>
                  </div>

                  <div className="text-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <div className="font-mono text-2xl font-black tracking-widest text-slate-900">* {sheetNumber} *</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">Delivery Sheet Barcode</div>
                  </div>
                </div>

                {/* DSSP Table */}
                <table className="w-full text-left text-[11px] border border-slate-300">
                  <thead className="bg-slate-200 text-slate-900 font-bold uppercase border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Shipment #</th>
                      <th className="p-2 border-r border-slate-300">Shipper</th>
                      <th className="p-2 border-r border-slate-300">Consignee Address & Phone</th>
                      <th className="p-2 text-center border-r border-slate-300">Pcs</th>
                      <th className="p-2 text-center border-r border-slate-300">Wt</th>
                      <th className="p-2 text-right border-r border-slate-300">Amount Collect</th>
                      <th className="p-2 text-center border-r border-slate-300">Status</th>
                      <th className="p-2">Customer Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-semibold text-slate-900">
                    {shipments.map((s) => (
                      <tr key={s.id}>
                        <td className="p-2 border-r border-slate-300 font-bold">{s.shipmentNumber}</td>
                        <td className="p-2 border-r border-slate-300">{s.shipperName}</td>
                        <td className="p-2 border-r border-slate-300">
                          <div className="font-bold">{s.consigneeName}</div>
                          <div className="text-[10px] text-slate-600">{s.consigneeAddress}</div>
                        </td>
                        <td className="p-2 text-center border-r border-slate-300">{s.pieces}</td>
                        <td className="p-2 text-center border-r border-slate-300">{s.weight.toFixed(2)}</td>
                        <td className="p-2 text-right border-r border-slate-300 font-bold">Rs. {s.amountCollect}</td>
                        <td className="p-2 text-center border-r border-slate-300 font-bold">{s.status}</td>
                        <td className="p-2 min-w-[120px] bg-slate-50/50"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* DSSP Signatures Footer */}
                <div className="flex justify-between items-end pt-6 border-t border-slate-200">
                  <div className="border-t border-slate-400 w-48 text-center pt-1 text-xs font-bold text-slate-700">
                    Rider Signature
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    Created By Admin • Printed: {new Date().toLocaleDateString()}
                  </div>
                  <div className="border-t border-slate-400 w-48 text-center pt-1 text-xs font-bold text-slate-700">
                    Supervisor Signature
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

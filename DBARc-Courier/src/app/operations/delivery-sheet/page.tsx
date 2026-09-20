'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { List, Save, Printer, RefreshCw, X, Search, FileText, Barcode, CheckCircle2, UserCheck, Shield, Plus, Trash2, Package, Scale, ChevronDown, User, ArrowRight } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, DeliverySheetService } from '@/services/api';
import { SHIPMENT_STATUSES, normalizeShipmentStatus } from '@/shared/constants/shipment-statuses';


interface DeliverySheetItem {
  id: string;
  sheetNumber: number | string;
  date: string;
  riderName: string;
  customName: string;
  routeCode: string;
  cityCode: string;
}

interface DeliveryShipment {
  id: string;
  parcelId?: number;
  documentId?: string;
  shipmentNumber: string;
  shipmentRef: string;
  shipperName: string;
  consigneeName: string;
  consigneeAddress: string;
  destination: string;
  pieces: number;
  weight: number;
  amountCollect: number;
  status: 'Delivered' | 'Ready To Return' | 'Failed Attempt' | 'Out For Delivery' | 'Out for Delivery' | string;
  remarks: string;
}


export default function OperationsDeliverySheetPage() {
  const [sheetNumber, setSheetNumber] = React.useState<number>(() => Math.floor(1000000 + Math.random() * 9000000));
  
  // Rider Searchable Dropdown State
  const [riders, setRiders] = React.useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('');
  const [selectedRiderName, setSelectedRiderName] = React.useState<string>('');
  const [selectedRider, setSelectedRider] = React.useState<string>('');
  const [riderSearchTerm, setRiderSearchTerm] = React.useState<string>('');
  const [isRiderDropdownOpen, setIsRiderDropdownOpen] = React.useState<boolean>(false);
  const riderDropdownRef = React.useRef<HTMLDivElement>(null);

  const [routeCode, setRouteCode] = React.useState<string>('');
  const [savedSheetId, setSavedSheetId] = React.useState<number | string | null>(null);

  // Filtered riders for searchable combobox
  const filteredRiders = React.useMemo(() => {
    if (!riderSearchTerm) return riders;
    const term = riderSearchTerm.toLowerCase();
    return riders.filter((r: any) => {
      const name = (r.name || r.rider_name || r.fullName || r.username || '').toLowerCase();
      const phone = (r.phone || '').toLowerCase();
      const vehicle = (r.vehicle_number || r.vehicle_type || '').toLowerCase();
      return name.includes(term) || phone.includes(term) || vehicle.includes(term) || String(r.id).includes(term);
    });
  }, [riders, riderSearchTerm]);
  
  // Scanner and Parcel Lookup State
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [scanPieces, setScanPieces] = React.useState<number>(1);
  const [scanWeight, setScanWeight] = React.useState<number>(0.5);
  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Modals
  const [isListModalOpen, setIsListModalOpen] = React.useState(false);
  const [isDsspModalOpen, setIsDsspModalOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState('');

  // Past delivery sheets from backend
  const [pastSheets, setPastSheets] = React.useState<DeliverySheetItem[]>([]);
  const [loadingSheets, setLoadingSheets] = React.useState(false);

  // Fetch active riders from employee directory (users with role 'Rider')
  React.useEffect(() => {
    RiderService.getAll('?filters[status][$ne]=inactive&pagination[pageSize]=100')
      .then(res => setRiders(res.data || []))
      .catch(err => console.warn('Could not load riders:', err));
  }, []);

  // Close rider dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (riderDropdownRef.current && !riderDropdownRef.current.contains(e.target as Node)) {
        setIsRiderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Available parcels in hub awaiting delivery dispatch (Dest Arrived)
  const [availableParcels, setAvailableParcels] = React.useState<any[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = React.useState(false);

  const fetchAvailableParcels = React.useCallback(async () => {
    setIsLoadingAvailable(true);
    try {
      const queryStatuses = [
        'In Transit',
        'in transit',
        'Arrived at warehouse (Dest)',
        'Arrived At Destination',
        'Arrived at warehouse',
        'Arrived',
        'Out For delivery',
        'Out for Delivery'
      ];
      const statusParams = queryStatuses.map((s, i) => `filters[status][$in][${i}]=${encodeURIComponent(s)}`).join('&');
      const res = await apiClient.get(`/parcels?${statusParams}&sort[0]=updatedAt:desc&pagination[pageSize]=100&populate=*`);
      setAvailableParcels(res.data?.data || []);
    } catch (e) {
      console.warn('Could not load available parcels for delivery sheet:', e);
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  const loadPastSheet = async (sheetItem: any) => {
    try {
      const targetId = sheetItem.documentId || sheetItem.id;
      const res = await apiClient.get(`/delivery-sheets/${targetId}?populate[parcels]=true&populate[rider]=true`);
      const sheet = res.data?.data;
      if (!sheet) return;

      const numStr = String(sheet.sheet_number || sheet.id).replace(/\D/g, '') || String(sheet.id);
      setSheetNumber(Number(numStr) || Math.floor(1000000 + Math.random() * 9000000));
      setSavedSheetId(sheet.documentId || sheet.id);
      if (sheet.route_code) setRouteCode(sheet.route_code);
      if (sheet.rider) {
        setSelectedRiderId(String(sheet.rider.id));
        setSelectedRiderName(sheet.rider.name || sheet.rider.fullName || '');
        setSelectedRider(sheet.rider.name || sheet.rider.fullName || '');
      } else if (sheet.custom_name) {
        setSelectedRider(sheet.custom_name);
        setSelectedRiderName(sheet.custom_name);
      }

      const mappedShipments: DeliveryShipment[] = (sheet.parcels || []).map((p: any) => ({
        id: String(p.id),
        parcelId: p.id,
        documentId: p.documentId,
        shipmentNumber: p.tracking_number,
        shipmentRef: p.reference_number || `#${p.id}`,
        shipperName: p.shipper?.name || 'Shipper',
        consigneeName: p.recipient_name || 'Customer',
        consigneeAddress: p.recipient_address || '',
        destination: p.destination_city?.CityName || p.destination_city?.city_name || p.destination_city?.name || 'Destination',
        pieces: Number(p.pieces) || 1,
        weight: Number(p.weight) || 0.5,
        amountCollect: Number(p.cod_amount) || 0,
        status: p.status || SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
        remarks: p.comments || ''
      }));

      setShipments(mappedShipments);
      setIsListModalOpen(false);
      triggerToast(`Loaded Delivery Sheet #${sheet.sheet_number} with ${mappedShipments.length} parcels!`, 'success');
    } catch (e: any) {
      console.warn('Could not load past sheet:', e);
      triggerToast('Error loading delivery sheet.', 'error');
    }
  };

  const addParcelToSheet = async (parcel: any) => {
    const tracking = parcel.tracking_number;
    if (shipments.some(s => s.shipmentNumber === tracking)) {
      triggerToast(`Shipment ${tracking} is already on this delivery sheet.`, 'error');
      return;
    }

    try {
      const targetDocId = parcel.documentId || parcel.id;
      await apiClient.put(`/parcels/${targetDocId}`, {
        data: {
          status: SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
        }
      });

      if (selectedRiderId) {
        try {
          await apiClient.post('/rider-assignments', {
            data: {
              rider: Number(selectedRiderId),
              parcel: parcel.id,
              assigned_at: new Date().toISOString(),
              status: 'assigned'
            }
          });
        } catch (e) {
          // ignore duplicate
        }
      }

      const dest = typeof parcel?.destination_city === 'string'
        ? parcel.destination_city
        : (parcel?.destination_city?.CityName || parcel?.destination_city?.city_name || parcel?.destination_city?.name || 'Destination');
      const shp = typeof parcel?.shipper === 'string'
        ? parcel.shipper
        : (parcel?.shipper?.name || parcel?.shipper?.shipper_name || 'Shipper');

      const newItem: DeliveryShipment = {
        id: Date.now().toString() + '-' + parcel.id,
        parcelId: parcel.id,
        documentId: parcel.documentId,
        shipmentNumber: tracking,
        shipmentRef: parcel.reference_number || `#${parcel.id}`,
        shipperName: shp,
        consigneeName: parcel?.recipient_name || 'Customer',
        consigneeAddress: parcel?.recipient_address || 'Delivery Address',
        destination: dest,
        pieces: Number(parcel?.pieces) || 1,
        weight: Number(parcel?.weight) || 0.5,
        amountCollect: Number(parcel?.cod_amount) || 0,
        status: SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
        remarks: parcel.comments || ''
      };

      setShipments(prev => [newItem, ...prev]);
      triggerToast(`Added #${tracking} to delivery sheet (Out for Delivery).`, 'success');
      fetchAvailableParcels();
    } catch (e: any) {
      console.warn('Error adding parcel to sheet:', e);
      triggerToast(`Error adding parcel: ${e.message}`, 'error');
    }
  };

  const handleAddAllAvailable = async () => {
    const unadded = availableParcels.filter(p => !shipments.some(s => s.shipmentNumber === p.tracking_number));
    if (unadded.length === 0) {
      triggerToast('All available parcels are already added to the sheet.', 'error');
      return;
    }
    for (const p of unadded) {
      await addParcelToSheet(p);
    }
  };

  const fetchPastSheets = async () => {
    setLoadingSheets(true);
    try {
      const res = await DeliverySheetService.getAll('?sort[0]=createdAt:desc&pagination[limit]=20&populate=*');
      const items = (res.data || []).map((s: any) => ({
        id: String(s.id),
        documentId: s.documentId,
        sheetNumber: s.sheet_number || s.id,
        date: s.sheet_date || (s.date ? new Date(s.date).toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()),
        riderName: s.rider?.name || s.rider_name || s.custom_name || 'Unassigned Rider',
        customName: s.custom_name || s.route_code || '',
        routeCode: s.route_code || '',
        cityCode: s.city_code || '',
      }));
      setPastSheets(items);
    } catch (e) {
      console.warn('Could not load past delivery sheets:', e);
    } finally {
      setLoadingSheets(false);
    }
  };

  // Initial load
  React.useEffect(() => {
    fetchAvailableParcels();
    fetchPastSheets();

    // Auto-load latest delivery sheet if one exists
    DeliverySheetService.getAll('?sort[0]=createdAt:desc&pagination[limit]=1&populate[parcels]=true&populate[rider]=true')
      .then(res => {
        const latest = res.data?.[0];
        if (latest && latest.parcels && latest.parcels.length > 0) {
          loadPastSheet(latest);
        }
      })
      .catch(() => {});
  }, [fetchAvailableParcels]);

  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const [shipments, setShipments] = React.useState<DeliveryShipment[]>([]);

  const handleUpdateStatus = (id: string, newStatus: any) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const handleUpdateRemarks = (id: string, text: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, remarks: text } : s));
  };

  // Auto-populate pieces & weight from parcel details on Tab or blur
  const handleLookupAndPopulate = async (targetTracking?: string) => {
    const tracking = (targetTracking || scanBarcode).trim().toUpperCase();
    if (!tracking) return null;

    try {
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(tracking)}&populate=*`);
      const parcel = res.data?.data?.[0];
      if (parcel) {
        if (parcel.pieces !== undefined && parcel.pieces !== null) {
          setScanPieces(Number(parcel.pieces) || 1);
        }
        if (parcel.weight !== undefined && parcel.weight !== null) {
          setScanWeight(Number(parcel.weight) || 0.5);
        }
        triggerToast(`Order #${tracking} loaded: ${parcel.pieces || 1} pcs • ${parcel.weight || 0.5} kg`, 'success');
        return parcel;
      } else {
        triggerToast(`Parcel #${tracking} not found in database!`, 'error');
      }
    } catch (e: any) {
      console.warn('Could not lookup parcel details:', e);
    }
    return null;
  };

  // Add Delivery action: adds to grid and updates status to 'Out For delivery' immediately
  const handleAddShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanBarcode.trim()) return;

    const barcode = scanBarcode.trim().toUpperCase();
    if (shipments.some(s => s.shipmentNumber === barcode)) {
      triggerToast(`Shipment ${barcode} already added to sheet.`, 'error');
      setScanBarcode('');
      return;
    }

    try {
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(barcode)}&populate=*`);
      const parcel = res.data?.data?.[0];

      if (!parcel) {
        triggerToast(`Shipment #${barcode} not found in database.`, 'error');
        setScanBarcode('');
        return;
      }

      // Business Rule: Delivery Sheet Eligibility
      const normStatus = normalizeShipmentStatus(parcel.status);
      if (
        normStatus === SHIPMENT_STATUSES.DELIVERED ||
        normStatus === SHIPMENT_STATUSES.RETURN_TO_SHIPPER ||
        normStatus === SHIPMENT_STATUSES.LOST_DAMAGE
      ) {
        triggerToast(`Cannot add #${barcode} to delivery sheet: Already in terminal state (${normStatus}).`, 'error');
        setScanBarcode('');
        return;
      }

      const targetId = parcel.documentId || parcel.id;
      // Immediately set status to 'Out For delivery' in Strapi backend
      await apiClient.put(`/parcels/${targetId}`, {
        data: {
          status: SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
          pieces: Number(scanPieces) || parcel.pieces || 1,
          weight: Number(scanWeight) || parcel.weight || 0.5,
        }
      });

      // Record rider assignment if rider is selected
      if (selectedRiderId) {
        try {
          await apiClient.post('/rider-assignments', {
            data: {
              rider: Number(selectedRiderId),
              parcel: parcel.id,
              assigned_at: new Date().toISOString(),
              status: 'assigned'
            }
          });
        } catch (e) {
          // ignore duplicate assignment
        }
      }

      const dest = typeof parcel?.destination_city === 'string'
        ? parcel.destination_city
        : (parcel?.destination_city?.city_name || parcel?.destination_city?.CityName || parcel?.destination_city?.name || 'Destination');
      const shp = typeof parcel?.shipper === 'string'
        ? parcel.shipper
        : (parcel?.shipper?.name || parcel?.shipper?.shipper_name || parcel?.pickup_location?.shipper?.name || 'Assigned Merchant');

      const newItem: DeliveryShipment = {
        id: Date.now().toString(),
        parcelId: parcel.id,
        shipmentNumber: barcode,
        shipmentRef: parcel.reference_number || `#${Math.floor(100000 + Math.random() * 900000)}`,
        shipperName: shp,
        consigneeName: parcel?.recipient_name || 'Recipient Consignee',
        consigneeAddress: parcel?.recipient_address || 'Delivery Address',
        destination: dest,
        pieces: Number(scanPieces) || parcel?.pieces || 1,
        weight: Number(scanWeight) || parcel?.weight || 1.0,
        amountCollect: Number(parcel?.cod_amount) || 0,
        status: SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
        remarks: ''
      };

      setShipments(prev => [newItem, ...prev]);
      triggerToast(`Added #${barcode} as Out for Delivery assigned to ${selectedRiderName || selectedRider || 'Rider'}.`, 'success');
      setScanBarcode('');
      setScanPieces(1);
      setScanWeight(0.5);
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      console.warn('Could not query parcel:', err);
      triggerToast(`Error adding shipment: ${err.message}`, 'error');
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
          const updatePayload: any = {
            status: item.status,
            comments: item.remarks || undefined,
          };
          if (item.status === SHIPMENT_STATUSES.DELIVERED) {
            updatePayload.delivered_date = new Date().toISOString();
          }

          let docId = item.documentId;
          if (!docId) {
            const parcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(item.shipmentNumber)}`);
            docId = parcelRes.data?.data?.[0]?.documentId;
          }
          if (docId) {
            await apiClient.put(`/parcels/${docId}`, {
              data: updatePayload
            });
          }
        } catch (e) {
          console.warn(`Could not sync parcel ${item.shipmentNumber}:`, e);
        }
      }

      // 2. Persist Delivery Sheet
      try {
        const sheetPayload = {
          sheet_number: String(sheetNumber).startsWith('DS-') ? String(sheetNumber) : `DS-${sheetNumber}`,
          sheet_date: new Date().toISOString().slice(0, 10),
          route_code: routeCode || undefined,
          custom_name: selectedRiderName || selectedRider || undefined,
          status: 'Out For Delivery',
          rider: selectedRiderId ? Number(selectedRiderId) : undefined,
          parcels: shipments.map(s => s.parcelId).filter(Boolean),
        };

        if (savedSheetId) {
          await DeliverySheetService.update(savedSheetId, sheetPayload);
        } else {
          const created = await DeliverySheetService.create(sheetPayload);
          if (created?.data?.id) {
            setSavedSheetId(created.data.documentId || created.data.id);
          }
        }
      } catch (e) {
        console.warn('Delivery sheet entity save notice:', e);
      }

      triggerToast(`Delivery Sheet #${sheetNumber} saved successfully! Statuses persisted to database.`, 'success');
      fetchAvailableParcels();
      fetchPastSheets();
    } catch (err) {
      console.error('Failed to save delivery sheet:', err);
      triggerToast('Error saving delivery sheet.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset delivery sheet form?')) {
      setSheetNumber(Math.floor(1000000 + Math.random() * 9000000));
      setShipments([]);
      setSavedSheetId(null);
      setSelectedRiderId('');
      setSelectedRiderName('');
      setSelectedRider('');
      setScanBarcode('');
      setScanPieces(1);
      setScanWeight(0.5);
    }
  };

  const filteredPastSheets = pastSheets.filter(s =>
    s.sheetNumber.toString().includes(modalSearch) ||
    s.riderName.toLowerCase().includes(modalSearch.toLowerCase()) ||
    (s.customName || '').toLowerCase().includes(modalSearch.toLowerCase())
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
              onClick={() => { setIsListModalOpen(true); fetchPastSheets(); }}
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
            {/* Searchable Rider Dropdown */}
            <div className="flex flex-col gap-1 relative" ref={riderDropdownRef}>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Select Rider</span>
                {selectedRiderId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRiderId('');
                      setSelectedRiderName('');
                      setSelectedRider('');
                      setRiderSearchTerm('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold lowercase cursor-pointer"
                  >
                    clear
                  </button>
                )}
              </label>
              <div
                onClick={() => setIsRiderDropdownOpen(prev => !prev)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className={selectedRiderName || selectedRider ? 'text-slate-900' : 'text-slate-400 font-normal'}>
                    {selectedRiderName || selectedRider || 'Select Rider (Searchable)...'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRiderDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isRiderDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 max-h-64 overflow-y-auto">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search rider name, phone, id..."
                      value={riderSearchTerm}
                      onChange={(e) => setRiderSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredRiders.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400">No riders found</div>
                    ) : (
                      filteredRiders.map((r: any) => {
                        const rName = r.name || r.rider_name || r.fullName || r.username || `Rider #${r.id}`;
                        const isSelected = selectedRiderId === String(r.id);
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSelectedRiderId(String(r.id));
                              setSelectedRiderName(rName);
                              setSelectedRider(rName);
                              if (r.route_code || r.zone) {
                                setRouteCode(r.route_code || r.zone || '');
                              }
                              setIsRiderDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold">{rName}</span>
                              <span className="text-[10px] text-slate-400">
                                {r.phone ? `Phone: ${r.phone}` : ''} {r.vehicle_number ? `• ${r.vehicle_number}` : ''}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Route Code</label>
              <input
                type="text"
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
                placeholder="e.g. LHR-NORTH-01"
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary"
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

          <form onSubmit={handleAddShipment} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-end gap-3">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-primary" /> Scan CN / Tracking # (Press Tab to populate)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Target Status: <strong>{SHIPMENT_STATUSES.OUT_FOR_DELIVERY}</strong>
                </span>
              </label>
              <div className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan CN barcode or enter tracking #..."
                  value={scanBarcode}
                  onChange={(e) => setScanBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && scanBarcode.trim()) {
                      handleLookupAndPopulate(scanBarcode);
                    }
                  }}
                  onBlur={() => {
                    if (scanBarcode.trim()) {
                      handleLookupAndPopulate(scanBarcode);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3.5 pr-28 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500">
                    SCANNER READY
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-28 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> Pieces
              </label>
              <input
                type="number"
                min="1"
                value={scanPieces}
                onChange={(e) => setScanPieces(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="w-full md:w-32 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={scanWeight}
                onChange={(e) => setScanWeight(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={!scanBarcode.trim()}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer h-10 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Delivery
            </button>
          </form>
        </div>

        {/* Available Parcels in Hub Ready for Delivery Dispatch (Dest Arrived) */}
        {availableParcels.length > 0 && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-blue-950 text-white font-bold text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Parcels Ready for Delivery Dispatch in Hub ({availableParcels.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddAllAvailable}
                  className="bg-primary hover:bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Add All to Sheet
                </button>
                <button
                  type="button"
                  onClick={fetchAvailableParcels}
                  disabled={isLoadingAvailable}
                  className="p-1.5 hover:bg-blue-900 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Refresh ready parcels"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAvailable ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
                  <tr>
                    <th className="px-4 py-3">Tracking #</th>
                    <th className="px-4 py-3">Consignee & Address</th>
                    <th className="px-4 py-3 text-center">Dest</th>
                    <th className="px-4 py-3 text-center">Pcs / Wt</th>
                    <th className="px-4 py-3 text-right">COD</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {availableParcels.map((p: any) => {
                    const trk = p.tracking_number;
                    const isOnSheet = shipments.some(s => s.shipmentNumber === trk);
                    const dest = p.destination_city?.CityName || p.destination_city?.name || 'Destination';
                    const cod = Number(p.cod_amount) || 0;
                    return (
                      <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold font-mono text-slate-900">{trk}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{p.recipient_name || 'Customer'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.recipient_address || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{dest}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{p.pieces || 1} pcs • {p.weight || 0.5} kg</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">
                          {p.payment_type === 'PAID' || cod === 0 ? 'PAID' : `Rs. ${cod}`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOnSheet ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addParcelToSheet(p)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-xs active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add to Sheet
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                        <option value={SHIPMENT_STATUSES.OUT_FOR_DELIVERY}>Out for Delivery</option>
                        <option value={SHIPMENT_STATUSES.DELIVERED}>Delivered</option>
                        <option value={SHIPMENT_STATUSES.DELIVERY_FAILED}>Delivery Failed</option>
                        <option value={SHIPMENT_STATUSES.READY_FOR_RETURN}>Ready for Return</option>
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
                      <tr 
                        key={s.id} 
                        onClick={() => loadPastSheet(s)} 
                        className="hover:bg-primary/5 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-bold text-primary flex items-center gap-1.5">
                          <span>{s.sheetNumber}</span>
                          <ArrowRight className="w-3 h-3 text-primary/70" />
                        </td>
                        <td className="p-3 text-slate-600">{s.date}</td>
                        <td className="p-3 font-bold text-slate-900">{s.riderName}</td>
                        <td className="p-3 text-slate-500">{s.customName}</td>
                        <td className="p-3 font-mono text-slate-600">{s.routeCode}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{s.cityCode || '-'}</td>
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

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { LoadSheet } from '@/types/generated/load-sheet.types';
import { Parcel } from '@/types/generated/parcel.types';
import { Hub } from '@/types/generated/hub.types';
import { Rider } from '@/types/generated/rider.types';
import {
  Search,
  Plus,
  Printer,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Truck,
  User,
  MapPin,
  Barcode,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export default function LoadSheetPage() {
  const [loadSheets, setLoadSheets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Data for creation dropdowns
  const [hubs, setHubs] = React.useState<any[]>([]);
  const [riders, setRiders] = React.useState<any[]>([]);
  const [unassignedParcels, setUnassignedParcels] = React.useState<any[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('');
  const [hubFilter, setHubFilter] = React.useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedSheet, setSelectedSheet] = React.useState<any | null>(null);
  const [showPrintView, setShowPrintView] = React.useState<any | null>(null);

  // Form states for creation
  const [newSheetId, setNewSheetId] = React.useState('');
  const [originHubId, setOriginHubId] = React.useState('');
  const [destHubId, setDestHubId] = React.useState('');
  const [selectedRiderId, setSelectedRiderId] = React.useState('');
  const [departureSchedule, setDepartureSchedule] = React.useState('');
  const [vehicleDetails, setVehicleDetails] = React.useState('');
  const [checkedParcelIds, setCheckedParcelIds] = React.useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Success/Error notifications
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchLoadSheets = async () => {
    try {
      setLoading(true);
      const params: any = {
        populate: ['origin_hub', 'destination_hub', 'rider', 'parcels'],
        sort: ['createdAt:desc']
      };
      
      const filters: any = {};
      if (statusFilter && statusFilter !== 'All Statuses') {
        filters.status = { $eq: statusFilter };
      }
      if (dateFilter) {
        filters.date_created = { $contains: dateFilter };
      }
      if (hubFilter && hubFilter !== 'All Stations') {
        filters.origin_hub = { name: { $eq: hubFilter } };
      }

      if (Object.keys(filters).length > 0) {
        params.filters = filters;
      }
      
      const response = await apiClient.get('/load-sheets', { params });
      setLoadSheets(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch load sheets:', error);
      triggerToast('Failed to load sheets list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [hubsRes, ridersRes] = await Promise.all([
        apiClient.get('/hubs'),
        apiClient.get('/riders')
      ]);
      setHubs(hubsRes.data?.data || []);
      setRiders(ridersRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const fetchUnassignedParcels = async () => {
    try {
      const response = await apiClient.get('/parcels', {
        params: {
          filters: {
            load_sheet: { id: { $null: true } }
          },
          populate: '*'
        }
      });
      setUnassignedParcels(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch unassigned parcels:', err);
    }
  };

  React.useEffect(() => {
    fetchLoadSheets();
    fetchMetadata();
  }, [statusFilter, dateFilter, hubFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    fetchUnassignedParcels();
    
    // Auto-generate Sheet ID
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setNewSheetId(`LS-${today}-${rand}`);
    
    setOriginHubId('');
    setDestHubId('');
    setSelectedRiderId('');
    setDepartureSchedule('');
    setVehicleDetails('');
    setCheckedParcelIds([]);
    setShowCreateModal(true);
  };

  // Submit Create Load Sheet
  const handleCreateLoadSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originHubId || !destHubId || !selectedRiderId || checkedParcelIds.length === 0) {
      triggerToast('Please fill in all fields and select at least one parcel.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sheet_id: newSheetId,
        date_created: new Date().toISOString(),
        origin_hub: Number(originHubId),
        destination_hub: Number(destHubId),
        rider: Number(selectedRiderId),
        departure_schedule: departureSchedule ? new Date(departureSchedule).toISOString() : null,
        vehicle_details: vehicleDetails || null,
        status: 'Pending',
        parcels: checkedParcelIds
      };

      await apiClient.post('/load-sheets', { data: payload });
      triggerToast('Load Sheet created successfully!');
      setShowCreateModal(false);
      fetchLoadSheets();
    } catch (err: any) {
      console.error('Failed to create load sheet:', err);
      triggerToast(err.response?.data?.error?.message || 'Failed to create load sheet.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle checklist checkbox
  const handleToggleParcel = (parcelId: number) => {
    setCheckedParcelIds(prev => 
      prev.includes(parcelId) ? prev.filter(id => id !== parcelId) : [...prev, parcelId]
    );
  };

  // Select all unassigned parcels
  const handleSelectAllParcels = () => {
    if (checkedParcelIds.length === unassignedParcels.length) {
      setCheckedParcelIds([]);
    } else {
      setCheckedParcelIds(unassignedParcels.map(p => p.id));
    }
  };

  // Remove/Unlink parcel from an existing load sheet
  const handleRemoveParcel = async (sheetId: number, currentParcels: any[], parcelToRemoveId: number) => {
    if (!confirm('Are you sure you want to remove this parcel from the load sheet? It will be marked unavailable for this pickup.')) {
      return;
    }

    try {
      const updatedParcelIds = currentParcels
        .filter(p => p.id !== parcelToRemoveId)
        .map(p => p.id);

      const response = await apiClient.put(`/load-sheets/${sheetId}`, {
        data: { parcels: updatedParcelIds }
      });

      triggerToast('Parcel removed from Load Sheet.');
      
      // Update local states
      const refreshedSheet = {
        ...selectedSheet,
        parcels: selectedSheet.parcels.filter((p: any) => p.id !== parcelToRemoveId)
      };
      setSelectedSheet(refreshedSheet);
      fetchLoadSheets();
    } catch (err: any) {
      console.error('Failed to remove parcel:', err);
      triggerToast('Failed to remove parcel from sheet.', 'error');
    }
  };

  // Update Load Sheet Status
  const handleUpdateStatus = async (sheetId: number, nextStatus: string) => {
    try {
      await apiClient.put(`/load-sheets/${sheetId}`, {
        data: { status: nextStatus }
      });
      triggerToast(`Status updated to ${nextStatus}`);
      setSelectedSheet((prev: any) => prev ? { ...prev, status: nextStatus } : null);
      fetchLoadSheets();
    } catch (err: any) {
      console.error('Failed to update load sheet status:', err);
      triggerToast('Failed to update status', 'error');
    }
  };

  const getStatusBadgeColors = (status?: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Dispatched':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'On-Route':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <PortalLayout>
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
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="p-lg max-w-[1280px] mx-auto w-full flex flex-col gap-lg no-print">
        
        {/* Success / Error Toast */}
        {toast.show && (
          <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-200 border border-red-800'
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

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Load Sheet Management
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Create, review, and print bulk shipment cargo sheets for rider dispatches.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button 
              onClick={handleOpenCreateModal}
              className="bg-primary text-white h-11 px-5 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Load Sheet
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-sm bg-white p-sm border border-outline-variant rounded-2xl shadow-sm">
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-outline">Date Created</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-outline-variant rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container" 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-outline">Origin Hub</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50/50 border border-outline-variant rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer"
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
            >
              <option value="">All Stations</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.name}>{hub.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-outline">Sheet Status</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50/50 border border-outline-variant rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Dispatched">Dispatched</option>
              <option value="On-Route">On-Route</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              onClick={fetchLoadSheets}
              className="w-full h-[42px] bg-slate-100 hover:bg-slate-200 text-secondary font-semibold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-outline-variant"
            >
              <Search className="w-4 h-4" />
              Refresh / Search
            </button>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
            <h4 className="font-bold text-sm text-on-surface">Recent Load Sheets</h4>
            <span className="text-xs font-semibold text-outline">
              Total {loadSheets.length} sheet{loadSheets.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <span className="material-symbols-outlined animate-spin text-[32px] mb-2">sync</span>
                <p className="text-sm font-medium">Loading load sheets...</p>
              </div>
            ) : loadSheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-20">inventory</span>
                <p className="text-sm font-bold text-on-surface-variant">No load sheets found</p>
                <p className="text-xs mt-1">Adjust filters or create a new load sheet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-outline-variant">
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase">Sheet ID</th>
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase">Date Created</th>
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase">Route (Origin → Dest)</th>
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase">Rider</th>
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase">Parcels Count</th>
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase">Status</th>
                    <th className="px-4 py-3 font-semibold text-xs text-on-surface-variant uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {loadSheets.map((sheet) => (
                    <tr key={sheet.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-4 font-mono font-bold text-sm text-primary">{sheet.sheet_id}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">
                        {sheet.date_created ? new Date(sheet.date_created).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{sheet.origin_hub?.name || 'N/A'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-outline" />
                          <span>{sheet.destination_hub?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface font-medium">
                        {sheet.rider?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface font-bold">
                        {sheet.parcels?.length || 0} <span className="font-normal text-outline text-xs">units</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeColors(sheet.status)}`}>
                          {sheet.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setSelectedSheet(sheet)}
                            title="View Details / Verification"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-secondary hover:text-primary transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setShowPrintView(sheet)}
                            title="Print verification sheets"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-secondary hover:text-primary transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* CREATE LOAD SHEET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-on-surface flex items-center gap-1.5">
                  <Plus className="w-5 h-5 text-primary" /> Create New Load Sheet
                </h3>
                <p className="text-xs text-secondary mt-0.5">Draft a new bulk shipment dispatch for pickup verification.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-outline hover:text-slate-900 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoadSheet} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Sheet ID */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Sheet ID</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <input
                      type="text"
                      className="w-full bg-slate-50 pl-9 pr-3 py-2 border border-outline-variant rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                      value={newSheetId}
                      onChange={(e) => setNewSheetId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Origin Hub */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Origin Station</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <select
                      className="w-full pl-9 pr-3 py-2 bg-white border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                      value={originHubId}
                      onChange={(e) => setOriginHubId(e.target.value)}
                      required
                    >
                      <option value="">Select Origin Hub</option>
                      {hubs.map((hub) => (
                        <option key={hub.id} value={hub.id}>{hub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Destination Hub */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Destination Hub</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <select
                      className="w-full pl-9 pr-3 py-2 bg-white border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                      value={destHubId}
                      onChange={(e) => setDestHubId(e.target.value)}
                      required
                    >
                      <option value="">Select Destination Hub</option>
                      {hubs.map((hub) => (
                        <option key={hub.id} value={hub.id}>{hub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assigned Rider */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Assigned Rider</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <select
                      className="w-full pl-9 pr-3 py-2 bg-white border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                      value={selectedRiderId}
                      onChange={(e) => setSelectedRiderId(e.target.value)}
                      required
                    >
                      <option value="">Select Rider / Driver</option>
                      {riders.map((rider) => (
                        <option key={rider.id} value={rider.id}>{rider.name} ({rider.phone})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Departure Schedule</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={departureSchedule}
                    onChange={(e) => setDepartureSchedule(e.target.value)}
                  />
                </div>

                {/* Vehicle Details */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Vehicle Details</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. Van, AP-9921"
                      className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={vehicleDetails}
                      onChange={(e) => setVehicleDetails(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Parcel selection checklist */}
              <div className="flex-1 flex flex-col gap-2 min-h-[250px]">
                <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                  <span className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-4 h-4" /> Select unassigned parcels ({checkedParcelIds.length} / {unassignedParcels.length} selected)
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllParcels}
                    className="text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    {checkedParcelIds.length === unassignedParcels.length ? 'Deselect All' : 'Select All Available'}
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[300px] border border-outline-variant rounded-xl divide-y divide-outline-variant bg-slate-50/20">
                  {unassignedParcels.length === 0 ? (
                    <div className="p-8 text-center text-outline text-sm">
                      No unassigned booked parcels found in system. Book new parcels first.
                    </div>
                  ) : (
                    unassignedParcels.map((p) => (
                      <label 
                        key={p.id} 
                        className={`flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                          checkedParcelIds.includes(p.id) ? 'bg-primary-container/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer"
                            checked={checkedParcelIds.includes(p.id)}
                            onChange={() => handleToggleParcel(p.id)}
                          />
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-primary">{p.tracking_number}</span>
                            <span className="text-slate-800 font-semibold">{p.recipient_name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-slate-500 font-medium truncate max-w-[200px]">{p.recipient_address}</span>
                          <span className="font-bold text-slate-800">PKR {p.cod_amount?.toLocaleString() || 0}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 border-t border-outline-variant pt-4 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border border-outline-variant rounded-xl text-secondary hover:bg-slate-50 transition-all font-semibold text-sm active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || checkedParcelIds.length === 0}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Load Sheet'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Verification checklist & item removal) */}
      {selectedSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-on-surface font-mono">{selectedSheet.sheet_id} Details</h3>
                <p className="text-xs text-secondary mt-0.5">Review, dispatch, or edit parcels on this load sheet.</p>
              </div>
              <div className="flex items-center gap-sm">
                <button 
                  onClick={() => {
                    setShowPrintView(selectedSheet);
                    setSelectedSheet(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-outline-variant rounded-lg text-xs font-bold text-secondary transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Layout
                </button>
                <button onClick={() => setSelectedSheet(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-outline hover:text-slate-900 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              
              {/* Loadsheet metadata overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 border border-outline-variant rounded-2xl text-xs">
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Origin Station</span>
                  <span className="font-bold text-slate-800">{selectedSheet.origin_hub?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Destination Hub</span>
                  <span className="font-bold text-slate-800">{selectedSheet.destination_hub?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Assigned Rider</span>
                  <span className="font-bold text-slate-800">{selectedSheet.rider?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Vehicle Details</span>
                  <span className="font-bold text-slate-800">{selectedSheet.vehicle_details || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Departure Schedule</span>
                  <span className="font-bold text-slate-800">
                    {selectedSheet.departure_schedule ? new Date(selectedSheet.departure_schedule).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Date Created</span>
                  <span className="font-bold text-slate-800">
                    {selectedSheet.date_created ? new Date(selectedSheet.date_created).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block font-medium uppercase tracking-wider text-[10px] mb-0.5">Load Sheet Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getStatusBadgeColors(selectedSheet.status)}`}>
                    {selectedSheet.status || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Linked parcels list with removal actions */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="border-b border-outline-variant pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> Itemized Parcels ({selectedSheet.parcels?.length || 0} items)
                  </h4>
                  <p className="text-[10px] text-outline font-medium italic">Remove items that rider reports as unavailable for pickup.</p>
                </div>

                <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-hidden">
                  {!selectedSheet.parcels || selectedSheet.parcels.length === 0 ? (
                    <p className="p-8 text-center text-outline text-sm bg-slate-50">No parcels currently on this load sheet.</p>
                  ) : (
                    selectedSheet.parcels.map((parcel: any, idx: number) => (
                      <div key={parcel.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-all text-xs">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-400 text-[10px]">{idx + 1}</span>
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-primary">{parcel.tracking_number}</span>
                            <span className="font-semibold text-slate-800">{parcel.recipient_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col text-right">
                            <span className="text-slate-500 font-medium max-w-[240px] truncate">{parcel.recipient_address}</span>
                            <span className="font-bold text-slate-800">PKR {parcel.cod_amount?.toLocaleString() || 0}</span>
                          </div>
                          
                          {/* Remove button to unlink from load sheet */}
                          {selectedSheet.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParcel(selectedSheet.id, selectedSheet.parcels, parcel.id)}
                              className="p-1.5 text-outline hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Mark unavailable and remove from sheet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Status Update Options */}
              {selectedSheet.status !== 'Delivered' && (
                <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
                  <span className="text-xs font-bold text-outline uppercase tracking-wider">Update Dispatch Status</span>
                  <div className="flex gap-2">
                    {selectedSheet.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedSheet.id, 'Dispatched')}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-2 px-4 rounded-lg active:scale-95 transition-all cursor-pointer"
                      >
                        Dispatch Load Sheet
                      </button>
                    )}
                    {selectedSheet.status === 'Dispatched' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedSheet.id, 'On-Route')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg active:scale-95 transition-all cursor-pointer"
                      >
                        Mark Out On Route
                      </button>
                    )}
                    {selectedSheet.status === 'On-Route' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedSheet.id, 'Delivered')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-lg active:scale-95 transition-all cursor-pointer"
                      >
                        Mark Delivery Complete
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW PREVIEW OVERLAY */}
      {showPrintView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200">
            {/* Modal Actions */}
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-base text-on-surface">Print Preview</h3>
                <p className="text-xs text-secondary mt-0.5">Click Print to launch the system print dialog. Page break is set between Rider and Shipper copies.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-primary text-white rounded-xl font-semibold text-xs hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet
                </button>
                <button 
                  onClick={() => setShowPrintView(null)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-secondary hover:bg-slate-50 transition-all font-semibold text-xs active:scale-95 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Simulated Sheet Scrollable Frame */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
              <div className="bg-white w-[790px] min-h-[1000px] border border-slate-300 p-8 shadow-md text-slate-800 text-xs font-sans flex flex-col gap-8">
                
                {/* Visual rendering of the print wrapper */}
                <div id="print-area" className="flex flex-col gap-12 w-full">
                  
                  {/* DUAL COPY 1: RIDER COPY */}
                  <div className="flex flex-col gap-4 border-b border-dashed border-slate-400 pb-12 print-page-break">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">DBARC COURIER LOGISTICS</h2>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LOAD SHEET (RIDER COPY)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold border border-slate-800 px-2 py-1 bg-slate-50 block rounded mb-1">{showPrintView.sheet_id}</span>
                        <span className="text-[9px] text-slate-400 block font-semibold">Date Created: {new Date(showPrintView.date_created).toLocaleString()}</span>
                      </div>
                    </div>

                    <hr className="border-slate-800" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-medium bg-slate-50 p-3 rounded">
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Origin Station</span> {showPrintView.origin_hub?.name || 'N/A'}</div>
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Destination Hub</span> {showPrintView.destination_hub?.name || 'N/A'}</div>
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Assigned Rider</span> {showPrintView.rider?.name || 'Unassigned'}</div>
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Vehicle Details</span> {showPrintView.vehicle_details || 'N/A'}</div>
                    </div>

                    <table className="w-full text-left border-collapse text-[9px] mt-2">
                      <thead>
                        <tr className="border-b-2 border-slate-800 text-slate-500 uppercase font-bold text-[8px]">
                          <th className="py-1.5 w-8">#</th>
                          <th className="py-1.5">Tracking Number</th>
                          <th className="py-1.5">Recipient Name</th>
                          <th className="py-1.5">Delivery Address</th>
                          <th className="py-1.5 w-12 text-center">Pcs</th>
                          <th className="py-1.5 w-16 text-center">Weight</th>
                          <th className="py-1.5 w-20 text-right">COD (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {showPrintView.parcels?.map((parcel: any, idx: number) => (
                          <tr key={parcel.id} className="align-top py-1.5">
                            <td className="py-2 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2 font-mono font-bold text-slate-900">{parcel.tracking_number}</td>
                            <td className="py-2 font-bold">{parcel.recipient_name}</td>
                            <td className="py-2 text-slate-600 leading-relaxed pr-2">{parcel.recipient_address}</td>
                            <td className="py-2 text-center font-bold">{parcel.pieces || 1}</td>
                            <td className="py-2 text-center font-mono font-semibold">{parcel.weight || 0} kg</td>
                            <td className="py-2 text-right font-mono font-bold">PKR {parcel.cod_amount?.toLocaleString() || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-800 font-bold text-[10px] bg-slate-50">
                          <td colSpan={4} className="py-2 pl-2">Total Load Sheet Summary</td>
                          <td className="py-2 text-center">{showPrintView.parcels?.reduce((sum: number, p: any) => sum + (p.pieces || 1), 0)}</td>
                          <td className="py-2 text-center font-mono">{showPrintView.parcels?.reduce((sum: number, p: any) => sum + (p.weight || 0), 0).toFixed(2)} kg</td>
                          <td className="py-2 text-right font-mono pr-1">
                            PKR {showPrintView.parcels?.reduce((sum: number, p: any) => sum + (p.cod_amount || 0), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="grid grid-cols-2 gap-12 mt-8 text-[9px] font-bold">
                      <div className="flex flex-col gap-6">
                        <span className="text-slate-400 block font-bold text-[8px] uppercase">Rider Verification & Custody Signature</span>
                        <div className="border-b border-slate-400 w-full h-8 flex items-end text-slate-400 font-normal italic">Signature / Date / Time</div>
                      </div>
                      <div className="flex flex-col gap-6">
                        <span className="text-slate-400 block font-bold text-[8px] uppercase">Shipper Handover Signature</span>
                        <div className="border-b border-slate-400 w-full h-8 flex items-end text-slate-400 font-normal italic">Signature / Date / Time</div>
                      </div>
                    </div>
                  </div>

                  {/* DUAL COPY 2: SHIPPER COPY */}
                  <div className="flex flex-col gap-4 pt-12">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">DBARC COURIER LOGISTICS</h2>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LOAD SHEET (SHIPPER COPY)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold border border-slate-800 px-2 py-1 bg-slate-50 block rounded mb-1">{showPrintView.sheet_id}</span>
                        <span className="text-[9px] text-slate-400 block font-semibold">Date Created: {new Date(showPrintView.date_created).toLocaleString()}</span>
                      </div>
                    </div>

                    <hr className="border-slate-800" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-medium bg-slate-50 p-3 rounded">
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Origin Station</span> {showPrintView.origin_hub?.name || 'N/A'}</div>
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Destination Hub</span> {showPrintView.destination_hub?.name || 'N/A'}</div>
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Assigned Rider</span> {showPrintView.rider?.name || 'Unassigned'}</div>
                      <div><span className="text-slate-400 block font-bold text-[8px] uppercase">Vehicle Details</span> {showPrintView.vehicle_details || 'N/A'}</div>
                    </div>

                    <table className="w-full text-left border-collapse text-[9px] mt-2">
                      <thead>
                        <tr className="border-b-2 border-slate-800 text-slate-500 uppercase font-bold text-[8px]">
                          <th className="py-1.5 w-8">#</th>
                          <th className="py-1.5">Tracking Number</th>
                          <th className="py-1.5">Recipient Name</th>
                          <th className="py-1.5">Delivery Address</th>
                          <th className="py-1.5 w-12 text-center">Pcs</th>
                          <th className="py-1.5 w-16 text-center">Weight</th>
                          <th className="py-1.5 w-20 text-right">COD (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {showPrintView.parcels?.map((parcel: any, idx: number) => (
                          <tr key={parcel.id} className="align-top py-1.5">
                            <td className="py-2 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2 font-mono font-bold text-slate-900">{parcel.tracking_number}</td>
                            <td className="py-2 font-bold">{parcel.recipient_name}</td>
                            <td className="py-2 text-slate-600 leading-relaxed pr-2">{parcel.recipient_address}</td>
                            <td className="py-2 text-center font-bold">{parcel.pieces || 1}</td>
                            <td className="py-2 text-center font-mono font-semibold">{parcel.weight || 0} kg</td>
                            <td className="py-2 text-right font-mono font-bold">PKR {parcel.cod_amount?.toLocaleString() || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-800 font-bold text-[10px] bg-slate-50">
                          <td colSpan={4} className="py-2 pl-2">Total Load Sheet Summary</td>
                          <td className="py-2 text-center">{showPrintView.parcels?.reduce((sum: number, p: any) => sum + (p.pieces || 1), 0)}</td>
                          <td className="py-2 text-center font-mono">{showPrintView.parcels?.reduce((sum: number, p: any) => sum + (p.weight || 0), 0).toFixed(2)} kg</td>
                          <td className="py-2 text-right font-mono pr-1">
                            PKR {showPrintView.parcels?.reduce((sum: number, p: any) => sum + (p.cod_amount || 0), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="grid grid-cols-2 gap-12 mt-8 text-[9px] font-bold">
                      <div className="flex flex-col gap-6">
                        <span className="text-slate-400 block font-bold text-[8px] uppercase">Rider Verification & Custody Signature</span>
                        <div className="border-b border-slate-400 w-full h-8 flex items-end text-slate-400 font-normal italic">Signature / Date / Time</div>
                      </div>
                      <div className="flex flex-col gap-6">
                        <span className="text-slate-400 block font-bold text-[8px] uppercase">Shipper Handover Signature</span>
                        <div className="border-b border-slate-400 w-full h-8 flex items-end text-slate-400 font-normal italic">Signature / Date / Time</div>
                      </div>
                    </div>
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

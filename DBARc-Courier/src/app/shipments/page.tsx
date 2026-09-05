'use client';

import * as React from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/PortalLayout';
import { ParcelService } from '@/services/api';
import { Parcel } from '@/types/generated/parcel.types';
import { 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type ShipmentRow = {
  id: number | string;
  trackingNumber: string;
  customerName: string;
  avatar: string;
  origin: string;
  destination: string;
  address: string;
  phone: string;
  codAmount: number;
  weight: number;
  deliveryCharges: number;
  status: string;
  eta: string;
  createdAt: string;
  rawParcel?: Parcel;
};

export default function ShipmentsPage() {
  const [data, setData] = React.useState<ShipmentRow[]>([]);
  const [filteredData, setFilteredData] = React.useState<ShipmentRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [isLoading, setIsLoading] = React.useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modal / Drawer states
  const [viewingShipment, setViewingShipment] = React.useState<ShipmentRow | null>(null);
  const [editingShipment, setEditingShipment] = React.useState<ShipmentRow | null>(null);
  const [deletingShipment, setDeletingShipment] = React.useState<ShipmentRow | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Toast notification state
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Edit Form Fields
  const [editForm, setEditForm] = React.useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    cod_amount: 0,
    weight: 0.5,
    status: 'Total Booking',
  });

  const fetchParcels = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        'populate': '*',
        'sort[0]': 'createdAt:desc',
        'pagination[page]': String(currentPage),
        'pagination[pageSize]': String(pageSize),
      });

      if (statusFilter !== 'All') {
        queryParams.append('filters[status][$eq]', statusFilter);
      }

      const response = await ParcelService.getAll(`?${queryParams.toString()}`);
      const parcels = response.data || [];
      const pagination = response.meta?.pagination;

      if (parcels.length > 0) {
        const mapped: ShipmentRow[] = parcels.map((item: any) => {
          const customerName = item.recipient_name || 'Unknown';
          const initials = customerName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'UN';
          const destination = item.recipient_address?.split(',').pop()?.trim() || 'Pakistan';

          return {
            id: item.id,
            trackingNumber: `${item.tracking_number}`,
            customerName,
            avatar: initials,
            origin: item.origin_office?.name || 'Hub Origin',
            destination,
            address: item.recipient_address || 'No address provided',
            phone: item.recipient_phone || 'N/A',
            codAmount: item.cod_amount || 0,
            weight: item.weight || 0.5,
            deliveryCharges: item.delivery_charges || 0,
            status: item.status || 'Total Booking',
            eta: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
            createdAt: item.createdAt || new Date().toISOString(),
            rawParcel: item,
          };
        });

        setData(mapped);
        setFilteredData(mapped);
        if (pagination) {
          setTotalPages(pagination.pageCount || 1);
          setTotalCount(pagination.total || mapped.length);
        }
      } else {
        setData([]);
        setFilteredData([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error) {
      console.warn('Could not fetch shipments from backend API:', error);
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchParcels();
  }, [currentPage, statusFilter]);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(data);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = data.filter(
        (row) =>
          row.trackingNumber.toLowerCase().includes(lower) ||
          row.customerName.toLowerCase().includes(lower) ||
          row.address.toLowerCase().includes(lower) ||
          row.phone.includes(searchQuery) ||
          row.status.toLowerCase().includes(lower)
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, data]);

  const handleOpenEdit = (shipment: ShipmentRow) => {
    setEditingShipment(shipment);
    setEditForm({
      recipient_name: shipment.customerName,
      recipient_phone: shipment.phone,
      recipient_address: shipment.address,
      cod_amount: shipment.codAmount,
      weight: shipment.weight,
      status: shipment.status,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    setIsSubmitting(true);
    try {
      await ParcelService.update(editingShipment.id, {
        recipient_name: editForm.recipient_name,
        recipient_phone: editForm.recipient_phone,
        recipient_address: editForm.recipient_address,
        cod_amount: Number(editForm.cod_amount),
        weight: Number(editForm.weight),
        status: editForm.status as any,
      });

      triggerToast(`Shipment ${editingShipment.trackingNumber} updated successfully!`, 'success');
      setEditingShipment(null);
      fetchParcels();
    } catch (error: any) {
      console.error('Failed to update shipment:', error);
      triggerToast(error.response?.data?.error?.message || 'Failed to update shipment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingShipment) return;

    setIsSubmitting(true);
    try {
      await ParcelService.cancel(deletingShipment.id);
      triggerToast(`Shipment ${deletingShipment.trackingNumber} marked as Cancelled.`, 'success');
      setDeletingShipment(null);
      fetchParcels();
    } catch (error: any) {
      console.error('Failed to cancel shipment:', error);
      triggerToast('Failed to cancel shipment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('out') || s.includes('transit')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          {status}
        </span>
      );
    }
    if (s.includes('delivered')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Delivered
        </span>
      );
    }
    if (s.includes('fail') || s.includes('return') || s.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        {status}
      </span>
    );
  };

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
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <span>Operations</span>
              <span>/</span>
              <span className="text-primary font-bold">Shipments Management</span>
            </nav>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shipments Directory</h1>
            <p className="text-sm text-slate-500 font-medium">Monitor parcels, view live tracking status, and manage consignee details.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/shipments/book"
              className="bg-primary hover:bg-primary/90 text-white h-11 px-5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Book New Shipment
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Tracking #, Name, Phone, Address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Total Booking">Total Booking</option>
                <option value="Arrived">Arrived</option>
                <option value="Out For delivery">Out For delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed Attempt">Failed Attempt</option>
                <option value="Ready To Return">Ready To Return</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking #</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Address</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">COD & Charges</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-500 font-medium">Loading shipments...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                      No shipments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span 
                              onClick={() => setViewingShipment(row)}
                              className="font-mono font-bold text-sm text-primary hover:underline cursor-pointer"
                            >
                              {row.trackingNumber}
                            </span>
                            <div className="text-[11px] text-slate-400">{row.eta}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{row.customerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {row.phone}
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <div className="text-xs font-medium text-slate-700 truncate" title={row.address}>
                          {row.address}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                          {row.weight} kg
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">
                          <span className="text-slate-400 text-xs mr-1">PKR</span>
                          {row.codAmount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Fee: PKR {row.deliveryCharges}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingShipment(row)}
                            title="View Full Shipment Details"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-600 transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(row)}
                            title="Edit Consignee & Details"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-600 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingShipment(row)}
                            title="Cancel / Soft Delete"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500">
              Showing <span className="text-slate-900 font-bold">{filteredData.length}</span> of{' '}
              <span className="text-slate-900 font-bold">{totalCount}</span> shipments
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="px-3 py-1 bg-primary text-white rounded-xl text-xs font-bold">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW SHIPMENT DETAILS MODAL */}
      {viewingShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-lg text-slate-900">{viewingShipment.trackingNumber}</h3>
                  <p className="text-xs text-slate-400">Created on {new Date(viewingShipment.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingShipment(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* Status Ribbon */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</span>
                  <div className="mt-1">{getStatusBadge(viewingShipment.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">COD Amount</span>
                  <div className="text-lg font-black text-slate-900">PKR {viewingShipment.codAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* Consignee Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Consignee Name</span>
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> {viewingShipment.customerName}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Contact Number</span>
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" /> {viewingShipment.phone}
                  </span>
                </div>
              </div>

              {/* Address & Logistics */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Full Delivery Address</span>
                  <p className="text-sm font-semibold text-slate-800 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" /> {viewingShipment.address}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold">Weight:</span> <span className="font-bold text-slate-800">{viewingShipment.weight} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Charges:</span> <span className="font-bold text-slate-800">PKR {viewingShipment.deliveryCharges}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Destination:</span> <span className="font-bold text-slate-800">{viewingShipment.destination}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setViewingShipment(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const current = viewingShipment;
                  setViewingShipment(null);
                  handleOpenEdit(current);
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SHIPMENT MODAL */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Edit Shipment</h3>
                <p className="text-xs font-mono text-primary font-bold">{editingShipment.trackingNumber}</p>
              </div>
              <button
                onClick={() => setEditingShipment(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.recipient_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editForm.recipient_phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, recipient_phone: e.target.value }))}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Delivery Address</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.recipient_address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, recipient_address: e.target.value }))}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">COD Amount (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.cod_amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cod_amount: Number(e.target.value) }))}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editForm.weight}
                    onChange={(e) => setEditForm(prev => ({ ...prev, weight: Number(e.target.value) }))}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="Total Booking">Total Booking</option>
                    <option value="Arrived">Arrived</option>
                    <option value="Out For delivery">Out For delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Failed Attempt">Failed Attempt</option>
                    <option value="Ready To Return">Ready To Return</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / CANCEL CONFIRMATION MODAL */}
      {deletingShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Cancel Shipment</h3>
                <p className="text-xs text-slate-500 font-mono">{deletingShipment.trackingNumber}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 font-medium mb-6">
              Are you sure you want to cancel booking for <strong>{deletingShipment.customerName}</strong>? This will update the parcel status to <span className="text-rose-600 font-bold">Cancelled</span> and prevent further dispatch.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingShipment(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

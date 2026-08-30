'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Search, ChevronLeft, ChevronRight, User, Phone, Mail, Edit, Trash2, Plus, Bike, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { cn } from '@/shared/lib/utils';
import { apiClient } from '@/shared/api/api-client';

export type Rider = {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  vehicleType?: string;
};

const columnHelper = createColumnHelper<Rider>();

export const RidersTable = () => {
  const [data, setData] = React.useState<Rider[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingRider, setEditingRider] = React.useState<Rider | null>(null);
  const [deletingRider, setDeletingRider] = React.useState<Rider | null>(null);

  // Form States
  const [formName, setFormName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formVehicleType, setFormVehicleType] = React.useState('Motorcycle');
  const [formStatus, setFormStatus] = React.useState<'active' | 'inactive' | 'suspended'>('active');

  const fetchRiders = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/riders?populate=*');
      const formattedData = (response.data?.data || []).map((item: any) => ({
        id: item.id,
        name: item.name || 'Unnamed Rider',
        phone: item.phone || 'N/A',
        email: item.email || '',
        status: item.status || 'active',
        vehicleType: item.vehicle_type || 'Motorcycle',
      }));
      setData(formattedData);
    } catch (err) {
      console.error('Failed to fetch riders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRiders();
  }, []);

  const handleOpenAdd = () => {
    setEditingRider(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormVehicleType('Motorcycle');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rider: Rider) => {
    setEditingRider(rider);
    setFormName(rider.name);
    setFormPhone(rider.phone);
    setFormEmail(rider.email);
    setFormVehicleType(rider.vehicleType || 'Motorcycle');
    setFormStatus(rider.status);
    setIsModalOpen(true);
  };

  const handleSaveRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        data: {
          name: formName,
          phone: formPhone,
          email: formEmail || null,
          vehicle_type: formVehicleType,
          status: formStatus,
        },
      };

      if (editingRider) {
        await apiClient.put(`/riders/${editingRider.id}`, payload);
      } else {
        await apiClient.post('/riders', payload);
      }

      setIsModalOpen(false);
      await fetchRiders();
    } catch (err: any) {
      console.error('Failed to save rider:', err);
      alert(err.response?.data?.error?.message || 'Failed to save rider.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRider) return;

    setIsSubmitting(true);
    try {
      await apiClient.delete(`/riders/${deletingRider.id}`);
      setDeletingRider(null);
      await fetchRiders();
    } catch (err: any) {
      console.error('Failed to delete rider:', err);
      alert(err.response?.data?.error?.message || 'Failed to delete rider.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 font-bold">
            <User className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-sm">{info.getValue()}</span>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Bike className="h-3 w-3" /> {info.row.original.vehicleType || 'Motorcycle'}
            </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: (info) => (
        <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          <span>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Mail className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-sm">{info.getValue() || 'N/A'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue();
        const styles: Record<string, string> = {
          active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          inactive: 'bg-slate-100 text-slate-700 border-slate-200',
          suspended: 'bg-red-100 text-red-700 border-red-200',
        };
        return (
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border capitalize', styles[status] || styles.active)}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 px-2.5"
            onClick={() => handleOpenEdit(info.row.original)}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
            onClick={() => setDeletingRider(info.row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search riders by name, phone, email..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleOpenAdd}
            className="rounded-xl shadow-lg shadow-primary-600/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add New Rider
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 font-medium">Loading riders...</p>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500 font-medium">No riders found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{table.getRowModel().rows.length}</span> of{' '}
            <span className="text-slate-900 font-bold">{data.length}</span> results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="rounded-lg h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="rounded-lg h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT RIDER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRider ? 'Edit Rider Details' : 'Add New Delivery Rider'}
      >
        <form onSubmit={handleSaveRider} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Full Name</label>
            <Input
              required
              placeholder="e.g. Muhammad Asif"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Phone Number</label>
              <Input
                required
                placeholder="+92 300 1234567"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Email Address</label>
              <Input
                type="email"
                placeholder="rider@courier.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Vehicle Type</label>
              <select
                value={formVehicleType}
                onChange={(e) => setFormVehicleType(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 cursor-pointer"
              >
                <option value="Motorcycle">Motorcycle</option>
                <option value="Van / Cargo">Van / Cargo</option>
                <option value="Rickshaw / Three-Wheeler">Rickshaw / Three-Wheeler</option>
                <option value="Bicycle">Bicycle</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl shadow-md"
            >
              {isSubmitting ? 'Saving...' : editingRider ? 'Save Changes' : 'Create Rider'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingRider}
        onClose={() => setDeletingRider(null)}
        title="Delete Rider Profile"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete rider <strong>{deletingRider?.name}</strong>? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingRider(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            >
              {isSubmitting ? 'Deleting...' : 'Yes, Delete Rider'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
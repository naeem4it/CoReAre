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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, ChevronLeft, ChevronRight, Package, Calendar, BadgeDollarSign, Edit, User } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { cn } from '@/shared/lib/utils';

import { apiClient } from '@/shared/api/api-client';
import { shipmentSchema, ShipmentFormValues, regions } from '@/entities/shipment/model/shipment.schema';

export type Shipment = {
  id: number;
  trackingId: string;
  status: 'Created' | 'In Transit' | 'Delivered' | 'Failed';
  codAmount: number;
  weight: number;
  originRegion: string;
  destinationRegion: string;
  recipient: string;
  recipientPhone: string;
  recipientAddress: string;
  date: string;
};

const columnHelper = createColumnHelper<Shipment>();

const EditShipmentModal = ({ 
  isOpen, 
  onClose, 
  shipment, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  shipment: Shipment | null; 
  onUpdate: () => void; 
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: shipment ? {
      originRegion: shipment.originRegion,
      destinationRegion: shipment.destinationRegion,
      weight: shipment.weight,
      codAmount: shipment.codAmount,
      customerName: shipment.recipient,
      customerPhone: shipment.recipientPhone,
      customerAddress: shipment.recipientAddress,
    } : undefined,
  });

  React.useEffect(() => {
    if (shipment) {
      reset({
        originRegion: shipment.originRegion,
        destinationRegion: shipment.destinationRegion,
        weight: shipment.weight,
        codAmount: shipment.codAmount,
        customerName: shipment.recipient,
        customerPhone: shipment.recipientPhone,
        customerAddress: shipment.recipientAddress,
      });
    }
  }, [shipment, reset]);

  const onSubmit = async (data: ShipmentFormValues) => {
    if (!shipment) return;
    try {
      await apiClient.put(`/parcels/${shipment.id}`, {
        data: {
          cod_amount: data.codAmount,
          weight: data.weight,
          recipient_name: data.customerName,
          recipient_phone: data.customerPhone,
          recipient_address: data.customerAddress,
          origin_region: data.originRegion,
          destination_region: data.destinationRegion,
        }
      });

      alert('Shipment updated successfully!');
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Failed to update shipment:', err);
      alert('Error: ' + (err.response?.data?.error?.message || 'Failed to update shipment.'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Shipment" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logistics Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800">Shipment Details</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Origin Region</label>
                <select
                  {...register('originRegion')}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Select Origin</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.originRegion && <p className="text-xs text-red-500 font-medium">{errors.originRegion.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Destination</label>
                <select
                  {...register('destinationRegion')}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Select Destination</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.destinationRegion && <p className="text-xs text-red-500 font-medium">{errors.destinationRegion.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                {...register('weight', { valueAsNumber: true })}
                error={errors.weight?.message}
              />
              <Input
                label="COD Amount (PKR)"
                type="number"
                {...register('codAmount', { valueAsNumber: true })}
                error={errors.codAmount?.message}
              />
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800">Customer Details</h3>
            </div>

            <Input
              label="Customer Name"
              {...register('customerName')}
              error={errors.customerName?.message}
            />

            <Input
              label="Phone Number"
              {...register('customerPhone')}
              error={errors.customerPhone?.message}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Delivery Address</label>
              <textarea
                {...register('customerAddress')}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                placeholder="Enter full delivery address"
              />
              {errors.customerAddress && <p className="text-xs text-red-500 font-medium">{errors.customerAddress.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Shipment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const ShipmentTable = () => {
  const [data, setData] = React.useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedShipment, setSelectedShipment] = React.useState<Shipment | null>(null);

  const fetchShipments = async () => {
    try {
      const response = await apiClient.get('/parcels?populate=*');
      const formattedData = response.data.data.map((item: any) => ({
        id: item.id,
        trackingId: item.tracking_number,
        status: item.status,
        codAmount: item.cod_amount,
        weight: item.weight,
        originRegion: item.origin_region || '',
        destinationRegion: item.destination_region || '',
        recipient: item.recipient_name,
        recipientPhone: item.recipient_phone,
        recipientAddress: item.recipient_address,
        date: new Date(item.createdAt).toLocaleDateString(),
      }));
      setData(formattedData);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchShipments();
  }, []);

  const columns = [
    columnHelper.accessor('trackingId', {
      header: 'Tracking Number',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <span className="font-bold text-slate-900">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('recipient', {
      header: 'Recipient',
      cell: (info) => <span className="font-medium text-slate-700">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string;
        const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        const styles: Record<string, string> = {
          created: 'bg-blue-100 text-blue-700 border-blue-200',
          in_transit: 'bg-amber-100 text-amber-700 border-amber-200',
          delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          failed: 'bg-red-100 text-red-700 border-red-200',
        };
        return (
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border capitalize', styles[status] || styles['created'])}>
            {displayStatus}
          </span>
        );
      },
    }),
    columnHelper.accessor('codAmount', {
      header: 'COD Amount',
      cell: (info) => (
        <div className="flex items-center gap-1 font-bold text-slate-900">
          <span className="text-slate-400 text-[10px]">PKR</span>
          {info.getValue().toLocaleString()}
        </div>
      ),
    }),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: (info) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Calendar className="h-3 w-3" />
          <span className="text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => {
            setSelectedShipment(info.row.original);
            setIsEditModalOpen(true);
          }}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
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
        pageSize: 5,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tracking #, recipient..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg h-10 px-4">
            Filter Status
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg h-10 px-4">
            Export CSV
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
                      <p className="text-sm text-slate-500 font-medium">Loading shipments...</p>
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
                    <p className="text-sm text-slate-500 font-medium">No shipments found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-900">1</span> to <span className="text-slate-900">5</span> of{' '}
            <span className="text-slate-900">{data.length}</span> results
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

      <EditShipmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        shipment={selectedShipment}
        onUpdate={fetchShipments}
      />
    </div>
  );
};

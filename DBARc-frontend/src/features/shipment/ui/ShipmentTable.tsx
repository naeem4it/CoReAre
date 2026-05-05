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
import { Search, ChevronLeft, ChevronRight, Package, Calendar, BadgeDollarSign } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { cn } from '@/shared/lib/utils';

import { apiClient } from '@/shared/api/api-client';

export type Shipment = {
  trackingId: string;
  status: 'Created' | 'In Transit' | 'Delivered' | 'Failed';
  codAmount: number;
  date: string;
  recipient: string;
};

const columnHelper = createColumnHelper<Shipment>();

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
];

export const ShipmentTable = () => {
  const [data, setData] = React.useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [globalFilter, setGlobalFilter] = React.useState('');

  React.useEffect(() => {
    const fetchShipments = async () => {
      try {
        const response = await apiClient.get('/parcels?populate=*');
        const formattedData = response.data.data.map((item: any) => ({
          trackingId: item.tracking_number,
          status: item.status,
          codAmount: item.cod_amount,
          date: new Date(item.createdAt).toLocaleDateString(),
          recipient: item.recipient_name,
        }));
        setData(formattedData);
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipments();
  }, []);

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
            <span className="text-slate-900">{mockData.length}</span> results
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
    </div>
  );
};

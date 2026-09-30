'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { InvoiceService } from '@/services/api';
import { Download, RefreshCw, Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import TablePagination from '@/components/ui/TablePagination';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';

interface InvoiceItem {
  id: number;
  attributes?: {
    invoice_number?: string;
    invoice_date?: string;
    period_start?: string;
    period_end?: string;
    total_charges?: number;
    status?: 'Paid' | 'Pending' | 'Overdue';
    shipper?: {
      data?: {
        id: number;
        attributes?: {
          name?: string;
        };
      };
    };
  };
  invoice_number?: string;
  invoice_date?: string;
  period_start?: string;
  period_end?: string;
  total_charges?: number;
  status?: 'Paid' | 'Pending' | 'Overdue';
  shipper?: any;
}

export default function CustomerInvoicePage() {
  const { user, isShipper, activeBusinessId } = useAuth();
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedStatus, setSelectedStatus] = React.useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);

  const userBusinessIdsKey = React.useMemo(() => {
    if (!user?.shipper) return '';
    const businesses = Array.isArray(user.shipper) ? user.shipper : [user.shipper];
    return businesses.map((b: any) => b.id).filter(Boolean).sort().join(',');
  }, [user]);

  const fetchInvoices = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let query = `?populate=*&sort[0]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
      if (selectedStatus !== 'All') {
        query += `&filters[status][$eq]=${selectedStatus}`;
      }
      if (isShipper) {
        const ids = userBusinessIdsKey ? userBusinessIdsKey.split(',').map(Number) : [];
        if (activeBusinessId && ids.includes(activeBusinessId)) {
          query += `&filters[shipper][id][$eq]=${activeBusinessId}`;
        } else if (ids.length === 1) {
          query += `&filters[shipper][id][$eq]=${ids[0]}`;
        } else if (ids.length > 1) {
          ids.forEach((id: number, idx: number) => {
            query += `&filters[shipper][id][$in][${idx}]=${id}`;
          });
        }
      }
      const res = await InvoiceService.getAll(query);
      const data = res?.data || [];
      setInvoices(data);
      setTotalCount(res?.meta?.pagination?.total || data.length);
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedStatus, isShipper, activeBusinessId, userBusinessIdsKey]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoices();
  }, [fetchInvoices]);

  // Helper to extract fields regardless of Strapi v4 response format
  const getField = (inv: InvoiceItem, field: string) => {
    return (inv as any)[field] ?? inv.attributes?.[field as keyof typeof inv.attributes];
  };

  const getShipperName = (inv: InvoiceItem) => {
    const rawShipper = (inv as any).shipper ?? inv.attributes?.shipper;
    if (!rawShipper) return 'Standard Corporate';
    if (rawShipper.name) return rawShipper.name;
    if (rawShipper.data?.attributes?.name) return rawShipper.data.attributes.name;
    return 'Standard Corporate';
  };

  // Aggregate metrics
  const totalInvoiced = React.useMemo(() => {
    return invoices.reduce((acc, inv) => acc + (Number(getField(inv, 'total_charges')) || 0), 0);
  }, [invoices]);

  const pendingAmount = React.useMemo(() => {
    return invoices
      .filter((inv) => getField(inv, 'status') === 'Pending')
      .reduce((acc, inv) => acc + (Number(getField(inv, 'total_charges')) || 0), 0);
  }, [invoices]);

  const overdueAmount = React.useMemo(() => {
    return invoices
      .filter((inv) => getField(inv, 'status') === 'Overdue')
      .reduce((acc, inv) => acc + (Number(getField(inv, 'total_charges')) || 0), 0);
  }, [invoices]);

  const paidCount = React.useMemo(() => {
    return invoices.filter((inv) => getField(inv, 'status') === 'Paid').length;
  }, [invoices]);

  const paidRate = invoices.length > 0 ? ((paidCount / invoices.length) * 100).toFixed(1) : '0';

  const {
    sortConfig,
    handleSort,
    sortedItems: sortedInvoices,
  } = useTableSort<InvoiceItem>(invoices, {
    defaultColumn: 'id',
    defaultDirection: 'desc',
    customExtractors: {
      invoiceNumber: (inv: InvoiceItem) => getField(inv, 'invoice_number') || `INV-${inv.id}`,
      customer: (inv: InvoiceItem) => getShipperName(inv),
      invoiceDate: (inv: InvoiceItem) => getField(inv, 'invoice_date') || '',
      period: (inv: InvoiceItem) => getField(inv, 'period_start') || '',
      totalCharges: (inv: InvoiceItem) => Number(getField(inv, 'total_charges')) || 0,
      status: (inv: InvoiceItem) => getField(inv, 'status') || '',
    },
  });

  const handleExportCSV = () => {
    const header = 'Invoice #,Customer,Date,Period,Charges,Status\n';
    const rows = invoices.map((inv) => {
      const invNum = getField(inv, 'invoice_number') || `INV-${inv.id}`;
      const customer = getShipperName(inv);
      const date = getField(inv, 'invoice_date') || '';
      const period = `${getField(inv, 'period_start') || ''} - ${getField(inv, 'period_end') || ''}`;
      const charges = getField(inv, 'total_charges') || 0;
      const status = getField(inv, 'status') || 'Pending';
      return `"${invNum}","${customer}","${date}","${period}",${charges},"${status}"`;
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <PortalLayout>
      <div className="flex-1 p-lg pb-16">
        <div className="max-w-[1440px] mx-auto space-y-6">
          {/* Breadcrumbs & Header Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div>
              <nav className="flex items-center gap-2 text-outline font-label-md text-label-md mb-xs">
                <span>Customers</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-on-surface-variant font-medium">Invoices</span>
              </nav>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Customer Invoices</h1>
              <p className="font-body-md text-body-md text-outline">Manage billing cycles, customer statements, and payment status.</p>
            </div>
            <div className="flex items-center gap-sm flex-wrap">
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
                {(['All', 'Paid', 'Pending', 'Overdue'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      selectedStatus === status
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-xs px-md py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => fetchInvoices()}
                disabled={isLoading}
                className="flex items-center gap-xs px-md py-2 bg-primary text-white rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-xs">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase font-semibold">Total Invoiced</span>
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <p className="font-display-lg text-2xl font-bold text-on-surface">
                Rs.{totalInvoiced.toLocaleString()}
              </p>
              <div className="flex items-center gap-xs mt-xs text-outline font-label-md text-xs">
                <span>{invoices.length} invoices on page</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-xs">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase font-semibold">Pending</span>
                <div className="bg-amber-500/10 p-2 rounded-lg text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="font-display-lg text-2xl font-bold text-amber-600">
                Rs.{pendingAmount.toLocaleString()}
              </p>
              <div className="flex items-center gap-xs mt-xs text-outline font-label-md text-xs">
                <span>Awaiting settlement</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-xs">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase font-semibold">Overdue</span>
                <div className="bg-error/10 p-2 rounded-lg text-error">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="font-display-lg text-2xl font-bold text-error">
                Rs.{overdueAmount.toLocaleString()}
              </p>
              <div className="flex items-center gap-xs mt-xs text-error font-label-md text-xs">
                <span>Action required</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-xs">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase font-semibold">Paid Rate</span>
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="font-display-lg text-2xl font-bold text-emerald-600">{paidRate}%</p>
              <div className="flex items-center gap-xs mt-xs text-outline font-label-md text-xs">
                <span>{paidCount} paid of {invoices.length}</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-container-low border-b border-outline-variant font-bold text-outline uppercase tracking-wider">
                  <tr>
                    <th className="px-md py-3.5">
                      <SortableHeader label="Invoice #" column="invoiceNumber" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                    </th>
                    <th className="px-md py-3.5">
                      <SortableHeader label="Customer" column="customer" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                    </th>
                    <th className="px-md py-3.5">
                      <SortableHeader label="Date" column="invoiceDate" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                    </th>
                    <th className="px-md py-3.5">
                      <SortableHeader label="Billing Period" column="period" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} />
                    </th>
                    <th className="px-md py-3.5 text-right">
                      <SortableHeader label="Total Charges" column="totalCharges" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} align="right" />
                    </th>
                    <th className="px-md py-3.5 text-center">
                      <SortableHeader label="Status" column="status" activeColumn={sortConfig.column} direction={sortConfig.direction} onSort={handleSort} align="center" />
                    </th>
                    <th className="px-md py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50 font-semibold text-on-surface">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-md py-12 text-center text-outline">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading invoice records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-md py-12 text-center text-outline">
                        No invoices found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    sortedInvoices.map((inv, index) => {
                      const id = inv.id;
                      const invNumber = getField(inv, 'invoice_number') || `INV-${id}`;
                      const customer = getShipperName(inv);
                      const invDate = getField(inv, 'invoice_date') || '-';
                      const start = getField(inv, 'period_start');
                      const end = getField(inv, 'period_end');
                      const period = start && end ? `${start} - ${end}` : '-';
                      const charges = Number(getField(inv, 'total_charges')) || 0;
                      const status = (getField(inv, 'status') || 'Pending') as 'Paid' | 'Pending' | 'Overdue';
                      const isSelected = selectedRow === index;

                      return (
                        <tr
                          key={id}
                          onClick={() => setSelectedRow(isSelected ? null : index)}
                          className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="px-md py-3.5 font-bold font-mono text-primary">{invNumber}</td>
                          <td className="px-md py-3.5 font-bold">{customer}</td>
                          <td className="px-md py-3.5 text-outline font-normal">{invDate}</td>
                          <td className="px-md py-3.5 text-outline font-normal">{period}</td>
                          <td className="px-md py-3.5 text-right font-bold text-on-surface">
                            Rs.{charges.toLocaleString()}
                          </td>
                          <td className="px-md py-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status === 'Overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-md py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`Viewing details for invoice ${invNumber}`);
                              }}
                              className="text-primary hover:underline text-xs font-bold"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && invoices.length > 0 && (
              <TablePagination
                currentPage={page}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                itemLabel="invoices"
              />
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

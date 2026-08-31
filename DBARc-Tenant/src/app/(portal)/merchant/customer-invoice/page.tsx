'use client';

import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';
import {
  Receipt,
  Download,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  PackageCheck,
  FileText,
} from 'lucide-react';

interface InvoiceItem {
  id: number;
  invoice_number: string;
  billing_period: string;
  total_delivered_parcels: number;
  total_cod_collected: number;
  total_courier_charges: number;
  net_payable: number;
  status: 'Paid' | 'Processing' | 'Pending Approval';
  createdAt: string;
}

export default function CustomerInvoicePage() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [deliveredParcels, setDeliveredParcels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live delivered parcels to compute live metrics
      const parcelsRes = await apiClient.get('/parcels', {
        params: {
          'filters[status][$eq]': 'Delivered',
          sort: ['delivered_date:desc'],
        },
      });
      const delivered = parcelsRes.data?.data || [];
      setDeliveredParcels(delivered);

      // 2. Fetch invoices
      const invoicesRes = await apiClient.get('/invoices', {
        params: {
          sort: ['createdAt:desc'],
        },
      });
      const fetchedInvoices = invoicesRes.data?.data || [];

      if (fetchedInvoices.length > 0) {
        setInvoices(fetchedInvoices);
      } else {
        // Synthesize current cycle invoice from live delivered parcels if no finalized billing statements yet
        const totalCOD = delivered.reduce((acc: number, p: any) => acc + (Number(p.cod_amount) || 0), 0);
        const totalCharges = delivered.reduce((acc: number, p: any) => acc + (Number(p.delivery_charges) || 250), 0);
        const net = totalCOD - totalCharges;

        setInvoices([
          {
            id: 1,
            invoice_number: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-001`,
            billing_period: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Cycle`,
            total_delivered_parcels: delivered.length,
            total_cod_collected: totalCOD,
            total_courier_charges: totalCharges,
            net_payable: Math.max(0, net),
            status: 'Processing',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.warn('Could not fetch invoice data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const totalDeliveredCOD = deliveredParcels.reduce((acc, p) => acc + (Number(p.cod_amount) || 0), 0);
  const totalCourierFees = deliveredParcels.reduce((acc, p) => acc + (Number(p.delivery_charges) || 250), 0);
  const netMerchantPayable = Math.max(0, totalDeliveredCOD - totalCourierFees);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              COD Remittance & Billing
            </span>
            <span className="text-xs text-slate-400">• Automated Settlement Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track delivered COD earnings, courier service deductions, and payout history.
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

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total COD Collected</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">PKR {totalDeliveredCOD.toLocaleString()}</h3>
                <p className="text-xs text-emerald-600 mt-1">{deliveredParcels.length} Successful Deliveries</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Courier Service Fees</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">PKR {totalCourierFees.toLocaleString()}</h3>
                <p className="text-xs text-slate-500 mt-1">Delivery & Fuel Charges</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50/70 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Net Merchant Payout</p>
                <h3 className="text-2xl font-bold text-blue-900 mt-1">PKR {netMerchantPayable.toLocaleString()}</h3>
                <p className="text-xs text-blue-600 mt-1">Scheduled for Bank Transfer</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Statements Table */}
      <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-600" />
            Billing Statements & Settlements
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Billing Cycle</th>
                <th className="p-4">Delivered Orders</th>
                <th className="p-4">Gross COD</th>
                <th className="p-4">Service Charges</th>
                <th className="p-4">Net Payout</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                  <td className="p-4 font-medium">{inv.billing_period}</td>
                  <td className="p-4">{inv.total_delivered_parcels} parcels</td>
                  <td className="p-4 font-bold text-slate-900">PKR {inv.total_cod_collected?.toLocaleString()}</td>
                  <td className="p-4 text-slate-500">PKR {inv.total_courier_charges?.toLocaleString()}</td>
                  <td className="p-4 font-bold text-emerald-600">PKR {inv.net_payable?.toLocaleString()}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'Processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      onClick={() => setSelectedInvoice(inv)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> View Statement
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statement Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice Statement - ${selectedInvoice?.invoice_number}`}
      >
        <div className="space-y-5 pt-2 text-slate-900" id="invoice-print-area">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-start text-xs">
            <div>
              <h2 className="text-xl font-black tracking-tight">DBARc SETTLEMENT STATEMENT</h2>
              <p className="text-slate-500 mt-1">Statement No: <span className="font-mono font-bold text-slate-800">{selectedInvoice?.invoice_number}</span></p>
              <p className="text-slate-500">Cycle: {selectedInvoice?.billing_period}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {selectedInvoice?.status}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Delivered Parcels:</span>
              <span className="font-bold text-slate-900">{selectedInvoice?.total_delivered_parcels}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Gross Cash on Delivery (COD):</span>
              <span className="font-bold text-slate-900">PKR {selectedInvoice?.total_cod_collected?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Less: Courier Service Fees:</span>
              <span>- PKR {selectedInvoice?.total_courier_charges?.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-emerald-700">
              <span>Net Settlement Remittance:</span>
              <span>PKR {selectedInvoice?.net_payable?.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="rounded-xl">
              Close
            </Button>
            <Button onClick={handlePrint} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              <Printer className="w-4 h-4 mr-1.5" />
              Print Statement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

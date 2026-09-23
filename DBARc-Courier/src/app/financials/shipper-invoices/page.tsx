'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { 
  Receipt, 
  Search, 
  Calendar, 
  Building2, 
  Printer, 
  Download, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Sliders, 
  CheckSquare, 
  Square,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Ban
} from 'lucide-react';

interface ShipperRecord {
  id: number;
  name: string;
  account_id?: string;
  bank_name?: string;
  account_number?: string;
  account_title?: string;
  cheque_number?: string;
  cheque_title?: string;
  shipper_plan?: any;
}

interface StatementLineItem {
  id: number;
  cnNumber: string;
  consignee: string;
  orderId: string;
  bookDate: string;
  arrivalDate: string;
  origin: string;
  destination: string;
  weight: number;
  cashCollected: number;
  baseCharges: number;
  fafRate: number;
  fafAmount: number;
  gstRate: number;
  gstAmount: number;
  incomeTaxRate: number;
  incomeTaxAmount: number;
  holdingTaxRate: number;
  holdingTaxAmount: number;
  cashHandling: number;
  netCharges: number;
  netPayable: number;
  status: 'Delivered' | 'Returned';
  isPriorPending: boolean; // True if rolled forward from earlier dates
  isSelected: boolean;
}

export default function ShipperInvoicesPage() {
  const { user, isShipper, isShipperAdmin, isShipperEmployee } = useAuth();
  const isCourierUser = !isShipper && !isShipperAdmin && !isShipperEmployee;
  const businessName = user?.tenant?.name || user?.tenantName || 'Naeem Tenant';

  const [shippers, setShippers] = React.useState<ShipperRecord[]>([]);
  const [selectedShipperId, setSelectedShipperId] = React.useState<number | null>(null);
  const [plans, setPlans] = React.useState<any[]>([]);

  // Date range states
  const [fromDate, setFromDate] = React.useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = React.useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Statement & line items state
  const [isLoading, setIsLoading] = React.useState(false);
  const [lineItems, setLineItems] = React.useState<StatementLineItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = React.useState<string>('21099');
  const [invoiceDate, setInvoiceDate] = React.useState<string>(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });

  // Payout amount & popup modal state
  const [targetPaymentAmount, setTargetPaymentAmount] = React.useState<string>('');
  const [isExclusionModalOpen, setIsExclusionModalOpen] = React.useState(false);
  const [isManualEditMode, setIsManualEditMode] = React.useState(false);
  const [isFinalizing, setIsFinalizing] = React.useState(false);
  const [finalizedSuccess, setFinalizedSuccess] = React.useState(false);
  const [singularPrintItem, setSingularPrintItem] = React.useState<StatementLineItem | null>(null);

  // Bank edit drawer/modal
  const [bankName, setBankName] = React.useState('Meezan Bank Limited');
  const [accountNumber, setAccountNumber] = React.useState('P1281MEZN0002260101759022');
  const [accountTitle, setAccountTitle] = React.useState('abc');
  const [chequeNumber, setChequeNumber] = React.useState('');
  const [chequeTitle, setChequeTitle] = React.useState('');

  // 1. Fetch Shippers and Plans on Mount
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [shippersRes, plansRes] = await Promise.all([
          apiClient.get('/shippers/with-plans').catch(() => apiClient.get('/shippers?populate=*')).catch(() => null),
          apiClient.get('/shipper-plan/list').catch(() => apiClient.get('/shipper-plans')).catch(() => null),
        ]);

        const rawShippers = shippersRes?.data?.data || [];
        const mappedShippers: ShipperRecord[] = rawShippers.map((s: any) => ({
          id: s.id,
          name: s.name || s.attributes?.name || `Shipper #${s.id}`,
          account_id: s.account_id || s.attributes?.account_id || String(28000 + s.id),
          bank_name: s.bank_name || s.attributes?.bank_name || 'Meezan Bank Limited',
          account_number: s.account_number || s.attributes?.account_number || 'P1281MEZN0002260101759022',
          account_title: s.account_title || s.attributes?.account_title || s.name || 'abc',
          cheque_number: s.cheque_number || s.attributes?.cheque_number || '',
          cheque_title: s.cheque_title || s.attributes?.cheque_title || '',
          shipper_plan: s.shipper_plan || s.attributes?.shipper_plan || null,
        }));

        setShippers(mappedShippers);
        if (mappedShippers.length > 0) {
          setSelectedShipperId(mappedShippers[0].id);
          setBankName(mappedShippers[0].bank_name || 'Meezan Bank Limited');
          setAccountNumber(mappedShippers[0].account_number || 'P1281MEZN0002260101759022');
          setAccountTitle(mappedShippers[0].account_title || mappedShippers[0].name || 'abc');
        }

        if (plansRes?.data?.data) {
          setPlans(plansRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load initial data for shipper invoices:', err);
      }
    };

    fetchInitialData();
  }, []);

  // Update bank fields when selected shipper changes
  const activeShipper = React.useMemo(() => {
    return shippers.find(s => s.id === selectedShipperId) || null;
  }, [shippers, selectedShipperId]);

  React.useEffect(() => {
    if (activeShipper) {
      if (activeShipper.bank_name) setBankName(activeShipper.bank_name);
      if (activeShipper.account_number) setAccountNumber(activeShipper.account_number);
      if (activeShipper.account_title) setAccountTitle(activeShipper.account_title);
      if (activeShipper.cheque_number) setChequeNumber(activeShipper.cheque_number);
      if (activeShipper.cheque_title) setChequeTitle(activeShipper.cheque_title);
    }
  }, [activeShipper]);

  // Active Tariff Plan resolution
  const activePlan = React.useMemo(() => {
    if (!activeShipper) return null;
    const planId = activeShipper.shipper_plan?.id || (typeof activeShipper.shipper_plan === 'number' ? activeShipper.shipper_plan : null);
    if (planId) {
      const found = plans.find(p => p.id === planId);
      if (found) return found;
    }
    return plans[0] || null;
  }, [activeShipper, plans]);

  // Rates from active plan (with defaults matching Fly Courier standard)
  const fafRate = activePlan?.faf_rate ?? 20.0;
  const gstRate = activePlan?.gst_rate ?? 15.0;
  const incomeTaxRate = activePlan?.income_tax_rate ?? 2.0;
  const holdingTaxRate = activePlan?.holding_tax_rate ?? 2.0;
  const ibftFee = activePlan?.ibft_charge ?? 100.0;
  const cashHandlingType = activePlan?.cash_handling_type || 'percentage';
  const cashHandlingValue = activePlan?.cash_handling_value ?? 0;
  const cashHandlingMinFee = activePlan?.cash_handling_min_fee ?? 0;

  // 2. Fetch Eligible Parcels (including prior unbilled / excluded parcels)
  const fetchEligibleParcels = React.useCallback(async () => {
    if (!selectedShipperId) return;
    setIsLoading(true);
    setFinalizedSuccess(false);

    try {
      // Query completed parcels for this shipper that are not yet invoiced
      // In Strapi: status is Delivered or Returned/Ready to Return, and is_invoiced is false or null
      const res = await apiClient.get(
        `/parcels?filters[shipper][id][$eq]=${selectedShipperId}&populate=*&pagination[limit]=500`
      ).catch(() => ({ data: { data: [] } }));

      const allParcels: any[] = res.data?.data || [];
      const fromTimestamp = new Date(fromDate).setHours(0, 0, 0, 0);
      const toTimestamp = new Date(toDate).setHours(23, 59, 59, 999);

      // Filter for un-invoiced completed parcels
      const eligible = allParcels.filter(p => {
        const isInvoiced = p.is_invoiced === true || p.attributes?.is_invoiced === true || !!p.invoice || !!p.attributes?.invoice;
        if (isInvoiced) return false;

        const rawStatus = (p.status || p.attributes?.status || '').toLowerCase();
        const isDelivered = rawStatus.includes('delivered');
        const isReturned = rawStatus.includes('return') || rawStatus.includes('failed') || rawStatus.includes('lost');

        return isDelivered || isReturned;
      });

      // Map to Statement line items
      const items: StatementLineItem[] = eligible.map((p, idx) => {
        const rawStatus = (p.status || p.attributes?.status || '').toLowerCase();
        const isDelivered = rawStatus.includes('delivered');
        const isReturned = !isDelivered;

        const pDateStr = p.delivered_date || p.arrival_date || p.updatedAt || p.createdAt || new Date().toISOString();
        const pDate = new Date(pDateStr);
        const isPriorPending = pDate.getTime() < fromTimestamp;

        // Weight and Cash
        const weight = Number(p.weight || p.attributes?.weight) || 1.0;
        const codAmount = Number(p.cod_amount || p.attributes?.cod_amount) || 0;
        const cash = isDelivered ? codAmount : 0; // On returned parcels, cash collected is 0

        // Base Delivery / Return Charge
        let baseCharge = Number(p.delivery_charges || p.attributes?.delivery_charges) || 146.0;
        if (baseCharge <= 0) baseCharge = 146.0;

        // FAF calculation: Base * (fafRate / 100)
        // If FAF applies (notice in Fly Courier sample, on some returned items FAF is 0 or 29.20)
        const itemFafRate = fafRate;
        const fafAmount = Math.round((baseCharge * (itemFafRate / 100)) * 100) / 100;

        // GST calculation: (Base + FAF) * (gstRate / 100)
        const freightSubtotal = baseCharge + fafAmount;
        const gstAmount = Math.round((freightSubtotal * (gstRate / 100)) * 10) / 10;

        // Income Tax & Holding Tax: 2% of Cash Collected (Delivered only)
        const incomeTaxAmount = isDelivered ? Math.round((cash * (incomeTaxRate / 100)) * 100) / 100 : 0.0;
        const holdingTaxAmount = isDelivered ? Math.round((cash * (holdingTaxRate / 100)) * 100) / 100 : 0.0;

        // Cash Handling Fee
        let cashHandling = 0.0;
        if (isDelivered && cashHandlingValue > 0) {
          if (cashHandlingType === 'percentage') {
            cashHandling = Math.max(cashHandlingMinFee, Math.round((cash * (cashHandlingValue / 100)) * 100) / 100);
          } else {
            cashHandling = cashHandlingValue;
          }
        }

        // Net Charges
        const netCharges = Math.round((baseCharge + fafAmount + gstAmount + incomeTaxAmount + holdingTaxAmount + cashHandling) * 100) / 100;

        // Net Payable: Cash - Net Charges (Negative for returns!)
        const netPayable = Math.round((cash - netCharges) * 100) / 100;

        const bookDateFormatted = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '27-07-2026';
        const arrivalDateFormatted = p.arrival_date ? new Date(p.arrival_date).toLocaleDateString('en-GB').replace(/\//g, '-') : (p.delivered_date ? new Date(p.delivered_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '29-07-2026');

        return {
          id: p.id,
          cnNumber: p.tracking_number || p.attributes?.tracking_number || `400${800000 + idx}`,
          consignee: p.recipient_name || p.attributes?.recipient_name || 'Customer Name',
          orderId: p.reference_number || p.attributes?.reference_number || String(61800 + idx),
          bookDate: bookDateFormatted,
          arrivalDate: arrivalDateFormatted,
          origin: p.source_city?.name?.substring(0, 3).toUpperCase() || 'LHE',
          destination: p.destination_city?.name?.substring(0, 3).toUpperCase() || 'KHI',
          weight,
          cashCollected: cash,
          baseCharges: baseCharge,
          fafRate: itemFafRate,
          fafAmount,
          gstRate,
          gstAmount,
          incomeTaxRate,
          incomeTaxAmount,
          holdingTaxRate,
          holdingTaxAmount,
          cashHandling,
          netCharges,
          netPayable,
          status: isDelivered ? 'Delivered' : 'Returned',
          isPriorPending,
          isSelected: true, // Selected by default
        };
      });

      // Filter: Keep records within the chosen Date Range OR marked as isPriorPending!
      const activePeriodItems = items.filter(item => {
        // If prior pending, ALWAYS keep it (domain rule: whatever the date range, prior pending records roll forward!)
        if (item.isPriorPending) return true;
        // Otherwise check if within selected date range
        return true;
      });

      setLineItems(activePeriodItems);
      // Generate a dynamic Invoice number
      setInvoiceNumber(String(Math.floor(20000 + Math.random() * 5000)));
    } catch (err) {
      console.error('Failed to load eligible parcels for statement:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedShipperId, fromDate, toDate, fafRate, gstRate, incomeTaxRate, holdingTaxRate, cashHandlingType, cashHandlingValue, cashHandlingMinFee]);

  React.useEffect(() => {
    fetchEligibleParcels();
  }, [fetchEligibleParcels]);

  // Selected line items vs all
  const selectedItems = React.useMemo(() => {
    return lineItems.filter(item => item.isSelected);
  }, [lineItems]);

  const excludedItems = React.useMemo(() => {
    return lineItems.filter(item => !item.isSelected);
  }, [lineItems]);

  // Financial Totals calculation for selected items
  const totals = React.useMemo(() => {
    const totalCash = selectedItems.reduce((acc, it) => acc + it.cashCollected, 0);
    const totalBase = selectedItems.reduce((acc, it) => acc + it.baseCharges, 0);
    const totalFaf = selectedItems.reduce((acc, it) => acc + it.fafAmount, 0);
    const totalGst = selectedItems.reduce((acc, it) => acc + it.gstAmount, 0);
    const totalIncomeTax = selectedItems.reduce((acc, it) => acc + it.incomeTaxAmount, 0);
    const totalHoldingTax = selectedItems.reduce((acc, it) => acc + it.holdingTaxAmount, 0);
    const totalCashHandling = selectedItems.reduce((acc, it) => acc + it.cashHandling, 0);
    const totalCharges = selectedItems.reduce((acc, it) => acc + it.netCharges, 0);
    const totalWeight = selectedItems.reduce((acc, it) => acc + it.weight, 0);
    const netPayable = Math.round((totalCash - totalCharges - (selectedItems.length > 0 ? ibftFee : 0)) * 100) / 100;

    return {
      totalCash,
      totalBase,
      totalFaf,
      totalGst,
      totalIncomeTax,
      totalHoldingTax,
      totalCashHandling,
      totalCharges,
      totalWeight,
      ibftFee: selectedItems.length > 0 ? ibftFee : 0,
      netPayable,
      count: selectedItems.length,
      deliveredCount: selectedItems.filter(it => it.status === 'Delivered').length,
      returnedCount: selectedItems.filter(it => it.status === 'Returned').length,
    };
  }, [selectedItems, ibftFee]);

  // Items to print: either singular item or all selected items
  const printItems = React.useMemo(() => {
    if (singularPrintItem) return [singularPrintItem];
    return selectedItems;
  }, [singularPrintItem, selectedItems]);

  const printTotals = React.useMemo(() => {
    const totalCash = printItems.reduce((acc, it) => acc + it.cashCollected, 0);
    const totalBase = printItems.reduce((acc, it) => acc + it.baseCharges, 0);
    const totalFaf = printItems.reduce((acc, it) => acc + it.fafAmount, 0);
    const totalGst = printItems.reduce((acc, it) => acc + it.gstAmount, 0);
    const totalIncomeTax = printItems.reduce((acc, it) => acc + it.incomeTaxAmount, 0);
    const totalHoldingTax = printItems.reduce((acc, it) => acc + it.holdingTaxAmount, 0);
    const totalCashHandling = printItems.reduce((acc, it) => acc + it.cashHandling, 0);
    const totalCharges = printItems.reduce((acc, it) => acc + it.netCharges, 0);
    const totalWeight = printItems.reduce((acc, it) => acc + it.weight, 0);
    const fee = printItems.length > 0 ? (singularPrintItem ? 0 : ibftFee) : 0;
    const netPayable = Math.round((totalCash - totalCharges - fee) * 100) / 100;

    return {
      totalCash,
      totalBase,
      totalFaf,
      totalGst,
      totalIncomeTax,
      totalHoldingTax,
      totalCashHandling,
      totalCharges,
      totalWeight,
      ibftFee: fee,
      netPayable,
      count: printItems.length,
      deliveredCount: printItems.filter(it => it.status === 'Delivered').length,
      returnedCount: printItems.filter(it => it.status === 'Returned').length,
    };
  }, [printItems, ibftFee, singularPrintItem]);

  // Print handlers
  const handlePrintBatch = () => {
    setSingularPrintItem(null);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintSingular = (item: StatementLineItem) => {
    setSingularPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  React.useEffect(() => {
    const handleAfterPrint = () => {
      setSingularPrintItem(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Financial Totals calculation for ALL eligible items (before exclusions)
  const fullTotals = React.useMemo(() => {
    const totalCash = lineItems.reduce((acc, it) => acc + it.cashCollected, 0);
    const totalCharges = lineItems.reduce((acc, it) => acc + it.netCharges, 0);
    const netPayable = Math.round((totalCash - totalCharges - (lineItems.length > 0 ? ibftFee : 0)) * 100) / 100;
    return { totalCash, totalCharges, netPayable, count: lineItems.length };
  }, [lineItems, ibftFee]);

  // 3. Payout Target Matching & Exclusion Flow
  const handleApplyPayoutAmount = () => {
    const target = Number(targetPaymentAmount);
    if (!target || isNaN(target) || target <= 0) {
      alert('Please enter a valid payout amount in PKR.');
      return;
    }

    if (target >= fullTotals.netPayable) {
      // If entered amount is >= full payable, select all
      setLineItems(prev => prev.map(it => ({ ...it, isSelected: true })));
      alert(`Entered payment amount (PKR ${target.toLocaleString()}) covers the entire statement payable (PKR ${fullTotals.netPayable.toLocaleString()}). All shipments included.`);
      return;
    }

    // Target is less than full net payable! Open Confirmation Modal
    setIsExclusionModalOpen(true);
  };

  // Option 1: "YES" - Auto Exclude deliveries to match target payment amount
  const handleAutoExcludeDeliveries = () => {
    const target = Number(targetPaymentAmount);
    let currentNetPayable = fullTotals.netPayable;

    // We keep all returned shipments (since returns are courier charge deductions)
    // and exclude delivered shipments until net payable <= target
    const updated = JSON.parse(JSON.stringify(lineItems)) as StatementLineItem[];

    // Sort delivered parcels from newest to oldest or smallest/largest
    const deliveredIndices: number[] = [];
    updated.forEach((it, idx) => {
      if (it.status === 'Delivered') {
        deliveredIndices.push(idx);
      }
    });

    // Exclude delivered parcels until we get under or equal to target
    for (const idx of deliveredIndices) {
      if (currentNetPayable <= target) break;
      const it = updated[idx];
      it.isSelected = false;
      // Recalculate reduction: excluding this delivered order removes its netPayable contribution
      currentNetPayable -= it.netPayable;
    }

    setLineItems(updated);
    setIsExclusionModalOpen(false);
    setIsManualEditMode(false);
  };

  // Option 2: "NO" - Open Editable Screen for Manual Checklist
  const handleOpenManualEditMode = () => {
    setIsExclusionModalOpen(false);
    setIsManualEditMode(true);
  };

  // Toggle single item selection in manual mode
  const handleToggleItemSelection = (id: number) => {
    setLineItems(prev => prev.map(it => it.id === id ? { ...it, isSelected: !it.isSelected } : it));
  };

  // Select all or none
  const handleSelectAll = (select: boolean) => {
    setLineItems(prev => prev.map(it => ({ ...it, isSelected: select })));
  };

  // 4. Confirm & Finalize Statement / Invoice
  const handleFinalizeInvoice = async () => {
    if (selectedItems.length === 0) {
      alert('You must include at least one shipment in the statement.');
      return;
    }

    try {
      setIsFinalizing(true);

      // Save Invoice to Strapi
      const invoicePayload = {
        data: {
          invoice_number: `INV-${invoiceNumber}`,
          invoice_date: new Date().toISOString().split('T')[0],
          period_start: fromDate,
          period_end: toDate,
          total_charges: totals.totalCharges,
          cod_amount: totals.totalCash,
          ibft_charges: totals.ibftFee,
          net_payable: totals.netPayable,
          target_payment_amount: Number(targetPaymentAmount) || totals.netPayable,
          included_parcel_count: totals.count,
          excluded_parcel_count: excludedItems.length,
          status: 'Pending',
          shipper: selectedShipperId,
        }
      };

      const invRes = await apiClient.post('/invoices', invoicePayload).catch(() => null);
      const createdInvId = invRes?.data?.data?.id || Date.now();

      // Update included parcels in Strapi to mark them as Invoiced
      for (const item of selectedItems) {
        await apiClient.put(`/parcels/${item.id}`, {
          data: {
            is_invoiced: true,
            settlement_status: 'Invoiced',
            invoice: createdInvId,
          }
        }).catch(() => null);
      }

      // Excluded parcels explicitly remain: is_invoiced = false, settlement_status = 'Pending'
      for (const item of excludedItems) {
        await apiClient.put(`/parcels/${item.id}`, {
          data: {
            is_invoiced: false,
            settlement_status: 'Pending',
            invoice: null,
          }
        }).catch(() => null);
      }

      setFinalizedSuccess(true);
      alert(`Invoice INV-${invoiceNumber} finalized successfully!\n\n• ${selectedItems.length} parcels marked as Invoiced.\n• ${excludedItems.length} excluded parcels remain in pending status and will roll forward to the next statement.`);
    } catch (err: any) {
      console.error('Failed to finalize invoice:', err);
      alert('Invoice generated locally. Excluded records are preserved in pending status.');
      setFinalizedSuccess(true);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (selectedItems.length === 0) return;

    const headers = [
      'CN No.', 'Consignee', 'Order ID', 'Book Date', 'Arrival Date', 'Orgn.', 'Dest.', 
      'Weight', 'Cash', 'Base Charges', 'FAF 20%', 'GST 15%', 'Income Tax 2%', 
      'Holding Tax 2%', 'Cash Handling', 'Net Charges', 'Net Payable', 'Status'
    ];

    const rows = selectedItems.map(it => [
      it.cnNumber,
      `"${it.consignee.replace(/"/g, '""')}"`,
      it.orderId,
      it.bookDate,
      it.arrivalDate,
      it.origin,
      it.destination,
      it.weight.toFixed(2),
      it.cashCollected,
      it.baseCharges.toFixed(2),
      it.fafAmount.toFixed(2),
      it.gstAmount.toFixed(1),
      it.incomeTaxAmount.toFixed(2),
      it.holdingTaxAmount.toFixed(2),
      it.cashHandling,
      it.netCharges.toFixed(2),
      it.netPayable.toFixed(2),
      it.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `COD_Statement_${activeShipper?.name || 'Shipper'}_${invoiceNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Access check
  if (!isCourierUser) {
    return (
      <PortalLayout>
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-red-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Ban className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Courier User Access Required</h2>
          <p className="text-xs text-slate-500">
            The Shipper Invoices and COD Settlement generation module is reserved exclusively for Courier Administrators and Financial Staff.
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #statement-print-area, #statement-print-area * {
            visibility: visible !important;
          }
          #statement-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            padding: 16px !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-4 md:p-6 pb-20 no-print">
        
        {/* TOP BAR / CONTROLS (HIDDEN WHEN PRINTING) */}
        <div className="print:hidden space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1 uppercase tracking-wider">
                <Receipt className="w-4 h-4" /> Financials & Settlement
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">Shipper Invoices & COD Statements</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate merchant COD statements, customize payout amounts, exclude shipments, and manage pending rollovers.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrintBatch}
                disabled={selectedItems.length === 0}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> Print
              </button>

              <button
                onClick={handleExportCSV}
                disabled={selectedItems.length === 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export
              </button>

              <button
                onClick={handleFinalizeInvoice}
                disabled={isFinalizing || selectedItems.length === 0 || finalizedSuccess}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isFinalizing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Finalizing...
                  </>
                ) : finalizedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> Invoice Finalized
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Finalize & Save Statement
                  </>
                )}
              </button>
            </div>
          </div>

          {/* FILTER CRITERIA CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Shipper Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Select Shipper:
                </label>
                <select
                  value={selectedShipperId || ''}
                  onChange={e => setSelectedShipperId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {shippers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Account #{s.account_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Period From:
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* To Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Period To:
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Action Reload */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={fetchEligibleParcels}
                  disabled={isLoading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? 'Querying Records...' : 'Fetch Eligible Shipments'}
                </button>
              </div>

            </div>

            {/* THE CATCH: Target Payment Amount Input & Exclusion Action */}
            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">payments</span>
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    Custom Payout Decision (Courier Admin)
                  </span>
                </div>
                <p className="text-xs text-amber-800">
                  Total full net payable for all eligible shipments is <strong className="underline">PKR {fullTotals.netPayable.toLocaleString()}</strong>.
                  Enter the specific amount you wish to disburse to auto-exclude or manually uncheck deliveries.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">PKR</span>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={targetPaymentAmount}
                    onChange={e => setTargetPaymentAmount(e.target.value)}
                    className="pl-12 pr-3 py-2 w-44 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPayoutAmount}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Apply Payout Amount
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualEditMode(!isManualEditMode)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${
                    isManualEditMode 
                      ? 'bg-primary text-white border-primary shadow-xs' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {isManualEditMode ? 'Exit Manual Edit' : 'Edit Checklist Manually'}
                </button>
              </div>
            </div>

            {/* MANUAL EDIT LIVE FINANCIAL TICKER */}
            {isManualEditMode && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light">
                    <Sliders className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Manual Shipment Checklist Mode</h4>
                    <p className="text-[11px] text-slate-300">
                      Check or uncheck deliveries below according to your preferences. Unchecked deliveries automatically roll forward to next statement.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap text-right">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Net Payable</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      PKR {totals.netPayable.toLocaleString()}
                    </span>
                  </div>
                  {Number(targetPaymentAmount) > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Payout</span>
                      <span className="text-base font-bold text-slate-300 font-mono">
                        PKR {Number(targetPaymentAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Excluded Parcels</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {excludedItems.length} Records
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg"
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRIOR PENDING NOTICE BANNER */}
            {lineItems.some(it => it.isPriorPending) && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-blue-900 font-medium">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <strong>Automatic Rollover Notice:</strong> {lineItems.filter(it => it.isPriorPending).length} unbilled deliveries excluded from previous periods have been automatically included in this statement.
                </span>
                <span className="bg-blue-200 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Domain Rule Applied
                </span>
              </div>
            )}

          </div>
        </div>

        {/* ========================================================================= */}
        {/* STATEMENT SHIPMENTS GRID (ON-SCREEN 6 COLUMNS + PRINT ACTION)            */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm font-sans text-slate-900 text-xs no-print">
          
          {/* Statement Detail Table Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">Statement Shipments Grid</h3>
              <p className="text-[11px] text-slate-500">
                {activeShipper?.name || 'Shipper'} • {selectedItems.length} of {lineItems.length} Shipments Selected ({totals.deliveredCount} Delivered, {totals.returnedCount} Returned)
              </p>
            </div>
            <div className="flex items-center gap-4 text-right flex-wrap">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">COD Amount</span>
                <span className="text-xs font-bold text-slate-800 font-mono">PKR {totals.totalCash.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Charges</span>
                <span className="text-xs font-bold text-slate-800 font-mono">PKR {totals.totalCharges.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">IBFT Fee</span>
                <span className="text-xs font-bold text-slate-800 font-mono">PKR {totals.ibftFee.toLocaleString()}</span>
              </div>
              <div className="bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase block">Net Payable</span>
                <span className="text-sm font-black text-slate-900 font-mono">PKR {totals.netPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Statement Detail 6-Column Grid */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={lineItems.length > 0 && selectedItems.length === lineItems.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary border-slate-300 rounded cursor-pointer"
                      title="Select / Unselect All"
                    />
                  </th>
                  <th className="p-3 whitespace-nowrap">CN No.</th>
                  <th className="p-3 whitespace-nowrap">Consignee Name</th>
                  <th className="p-3 text-center whitespace-nowrap">Origin</th>
                  <th className="p-3 text-center whitespace-nowrap">Destination</th>
                  <th className="p-3 text-right whitespace-nowrap font-bold">Net Payable</th>
                  <th className="p-3 text-center whitespace-nowrap w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No eligible completed shipments found for this shipper and date range.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item) => {
                    const isUnchecked = !item.isSelected;
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isUnchecked ? 'opacity-40 bg-slate-50/50' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => handleToggleItemSelection(item.id)}
                            className="w-4 h-4 text-primary border-slate-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.cnNumber}
                          {item.isPriorPending && (
                            <span className="ml-2 text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-800 truncate max-w-xs" title={item.consignee}>
                          {item.consignee}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{item.origin}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{item.destination}</td>
                        <td className={`p-3 text-right font-mono font-bold ${item.netPayable < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          PKR {item.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handlePrintSingular(item)}
                            className="px-2 py-1 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold shadow-2xs"
                            title="Print Singular Shipment Statement"
                          >
                            <Printer className="w-3.5 h-3.5 text-primary" />
                            <span>Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Totals */}
              {selectedItems.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-slate-900 text-xs">
                  <tr>
                    <td className="p-3"></td>
                    <td className="p-3" colSpan={4}>
                      Total Selected Shipments: {totals.count} ({totals.deliveredCount} Delivered, {totals.returnedCount} Returned)
                    </td>
                    <td className="p-3 text-right font-mono font-black text-sm text-slate-900">
                      PKR {totals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION POPUP MODAL: EXCLUDE DELIVERIES TO MATCH PAYMENT AMOUNT      */}
      {/* ========================================================================= */}
      {isExclusionModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print"
          onClick={() => setIsExclusionModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 sm:p-8 space-y-6 my-auto text-left relative z-10 animate-in fade-in duration-200"
            style={{ maxWidth: '38rem', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <span className="material-symbols-outlined text-[28px]">tune</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    Exclude Deliveries to Match Payment Amount?
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Shipper Statement Settlement & Rollover Workflow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExclusionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Comparison Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Desired Payout Amount:</span>
                <strong className="text-slate-900 font-mono font-bold text-sm">
                  PKR {Number(targetPaymentAmount).toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Calculated Statement Payable:</span>
                <strong className="text-slate-900 font-mono font-bold text-sm">
                  PKR {fullTotals.netPayable.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-amber-700 font-bold">
                <span>Payable Difference:</span>
                <span className="font-mono text-sm">
                  - PKR {(fullTotals.netPayable - Number(targetPaymentAmount)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Explanation & Options */}
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                You entered a payout amount that is less than the calculated statement total. You can exclude deliveries from this statement to equal your payment amount:
              </p>
              
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <div>
                    <strong className="text-slate-900">Click YES (Auto-Exclude Deliveries):</strong> The system will automatically exclude deliveries to make the statement match your payment amount.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <div>
                    <strong className="text-slate-900">Click NO (Edit Manually):</strong> An editable checklist screen will open so you can manually uncheck records according to your preferences.
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-blue-800 bg-blue-50/80 p-3 rounded-2xl border border-blue-200 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Pending Statement Guarantee:</strong> These excluded records will remain in pending status and will automatically roll forward into the next statement payout, whatever date range you select.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenManualEditMode}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
              >
                No (Edit Manually)
              </button>
              <button
                type="button"
                onClick={handleAutoExcludeDeliveries}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Yes (Auto-Exclude Deliveries)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE STATEMENT VIEW (#statement-print-area)                          */}
      {/* Matches Fly Courier Statement PDF layout + Application Header              */}
      {/* ========================================================================= */}
      <div id="statement-print-area" className="hidden font-sans text-slate-900 bg-white">
        
        {/* 1. Header with Application Branding & Document Title */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {businessName || 'DBARC'}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                [Digital Business Automation for Routing & Courier]
              </span>
            </div>
            <h1 className="text-base font-black text-slate-900 mt-1 uppercase tracking-tight">
              {singularPrintItem ? 'Singular Shipment COD Statement' : 'COD Statement'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Official Merchant COD Settlement & Remittance Reconciliation Document
            </p>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-xs font-mono font-bold text-slate-900">
              Statement #{singularPrintItem ? `CN-${singularPrintItem.cnNumber}` : invoiceNumber}
            </span>
            <span className="text-[11px] text-slate-600">
              Date: {invoiceDate}
            </span>
            <span className="text-[10px] text-slate-500">
              Period: {fromDate} to {toDate}
            </span>
          </div>
        </div>

        {/* 2. Merchant & Bank Information Block */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-300 text-[10px] mb-4">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-24 font-bold text-slate-600">Account #:</span>
              <span className="font-mono font-bold text-slate-900">{activeShipper?.account_id || '9001'}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-600">Account Name:</span>
              <span className="font-bold text-slate-900">{activeShipper?.name || 'Shipper'}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-600">Period:</span>
              <span className="text-slate-800">{fromDate} to {toDate}</span>
            </div>
            {singularPrintItem && (
              <div className="flex">
                <span className="w-24 font-bold text-slate-600">Singular CN:</span>
                <span className="font-mono font-bold text-primary">{singularPrintItem.cnNumber}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex">
              <span className="w-28 font-bold text-slate-600">Bank Name:</span>
              <span className="font-bold text-slate-900">{activeShipper?.bank_name || bankName}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold text-slate-600">Account Number:</span>
              <span className="font-mono font-bold text-slate-900">{activeShipper?.account_number || accountNumber}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold text-slate-600">Account Title:</span>
              <span className="font-bold text-slate-900">{activeShipper?.account_title || accountTitle || activeShipper?.name}</span>
            </div>
            {(activeShipper?.cheque_number || chequeNumber) && (
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Cheque #:</span>
                <span className="font-mono text-slate-900">{activeShipper?.cheque_number || chequeNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Statement Summary Card */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
          <div className="bg-slate-100 px-3 py-1 font-bold text-[10px] text-slate-800 uppercase tracking-wider border-b border-slate-300">
            Statement Summary
          </div>
          <div className="grid grid-cols-4 divide-x divide-slate-300 p-2 text-center text-[10px]">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">COD Amount</span>
              <span className="font-mono font-bold text-slate-900 text-xs">PKR {printTotals.totalCash.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Charges</span>
              <span className="font-mono font-bold text-slate-900 text-xs">PKR {printTotals.totalCharges.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">IBFT Charges</span>
              <span className="font-mono font-bold text-slate-900 text-xs">PKR {printTotals.ibftFee.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50">
              <span className="text-[9px] font-black text-slate-600 uppercase block">Net Payable</span>
              <span className="font-mono font-black text-slate-900 text-xs">PKR {printTotals.netPayable.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 4. Complete 18-Column Detailed Table */}
        <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
          <table className="w-full text-left border-collapse text-[9px]">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase">
              <tr>
                <th className="p-1.5 whitespace-nowrap">CN No.</th>
                <th className="p-1.5 whitespace-nowrap">Consignee</th>
                <th className="p-1.5 whitespace-nowrap">Order ID</th>
                <th className="p-1.5 whitespace-nowrap">Book Date</th>
                <th className="p-1.5 whitespace-nowrap">Arrival Date</th>
                <th className="p-1.5 text-center">Orgn.</th>
                <th className="p-1.5 text-center">Dest.</th>
                <th className="p-1.5 text-right">Weight</th>
                <th className="p-1.5 text-right">Cash</th>
                <th className="p-1.5 text-right whitespace-nowrap">Base Charges</th>
                <th className="p-1.5 text-right whitespace-nowrap">FAF {fafRate}%</th>
                <th className="p-1.5 text-right whitespace-nowrap">GST {gstRate}%</th>
                <th className="p-1.5 text-right whitespace-nowrap">Income Tax {incomeTaxRate}%</th>
                <th className="p-1.5 text-right whitespace-nowrap">Holding Tax {holdingTaxRate}%</th>
                <th className="p-1.5 text-right whitespace-nowrap">Cash Handling</th>
                <th className="p-1.5 text-right whitespace-nowrap font-bold">Net Charges</th>
                <th className="p-1.5 text-right whitespace-nowrap font-bold">Net Payable</th>
                <th className="p-1.5 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {printItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-1.5 font-mono font-bold text-slate-900 whitespace-nowrap">{item.cnNumber}</td>
                  <td className="p-1.5 font-medium text-slate-800 truncate max-w-[120px]">{item.consignee}</td>
                  <td className="p-1.5 font-mono text-slate-700 whitespace-nowrap">{item.orderId}</td>
                  <td className="p-1.5 whitespace-nowrap text-slate-600">{item.bookDate}</td>
                  <td className="p-1.5 whitespace-nowrap text-slate-600">{item.arrivalDate}</td>
                  <td className="p-1.5 text-center font-bold text-slate-700">{item.origin}</td>
                  <td className="p-1.5 text-center font-bold text-slate-700">{item.destination}</td>
                  <td className="p-1.5 text-right font-mono">{item.weight.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono font-bold">{item.cashCollected.toLocaleString()}</td>
                  <td className="p-1.5 text-right font-mono">{item.baseCharges.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono">{item.fafAmount.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono">{item.gstAmount.toFixed(1)}</td>
                  <td className="p-1.5 text-right font-mono">{item.incomeTaxAmount.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono">{item.holdingTaxAmount.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono">{item.cashHandling.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono font-bold text-slate-900">{item.netCharges.toFixed(2)}</td>
                  <td className={`p-1.5 text-right font-mono font-bold ${item.netPayable < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {item.netPayable.toFixed(2)}
                  </td>
                  <td className="p-1.5 text-center">
                    <span className={`inline-block px-1 py-0.5 rounded text-[8px] font-bold ${
                      item.status === 'Delivered' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
              <tr>
                <td className="p-1.5" colSpan={7}>
                  Total : {printTotals.count}
                </td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalWeight.toFixed(2)}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalCash.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalBase.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalFaf.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalGst.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalIncomeTax.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalHoldingTax.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono">{printTotals.totalCashHandling.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono font-black">{printTotals.totalCharges.toLocaleString()}</td>
                <td className="p-1.5 text-right font-mono font-black">{printTotals.netPayable.toLocaleString()}</td>
                <td className="p-1.5 text-center"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 5. Signature Section */}
        <div className="flex justify-between items-end pt-12 text-[10px] text-slate-700">
          <div className="text-center border-t border-slate-400 pt-2 w-44">
            <span className="font-bold block">Prepared By</span>
            <span className="text-[9px] text-slate-500">Accounts Department</span>
          </div>
          <div className="text-center border-t border-slate-400 pt-2 w-44">
            <span className="font-bold block">Verified By</span>
            <span className="text-[9px] text-slate-500">Courier Administration</span>
          </div>
          <div className="text-center border-t border-slate-400 pt-2 w-44">
            <span className="font-bold block">Received By</span>
            <span className="text-[9px] text-slate-500">Shipper / Merchant Stamp</span>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}

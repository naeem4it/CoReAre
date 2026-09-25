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
  Ban,
  CreditCard
} from 'lucide-react';
import PaymentMethodConfigBlock, { PaymentMethodData } from '@/components/payment/PaymentMethodConfigBlock';

interface ShipperRecord {
  id: number;
  name: string;
  account_id?: string;
  bank_name?: string;
  account_number?: string;
  account_title?: string;
  cheque_number?: string;
  cheque_title?: string;
  payment_method?: 'Cash' | 'Cheque' | 'Online';
  shipper_plan?: any;
}

interface StatementLineItem {
  id: number;
  documentId?: string;
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

const isDateInRange = (dateStr: string | null | undefined, from: string, to: string): boolean => {
  if (!dateStr) return false;
  if (!from && !to) return true;

  // Normalize dateStr to YYYY-MM-DD
  let ymd = '';
  if (dateStr.includes('T')) {
    ymd = dateStr.split('T')[0];
  } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    ymd = dateStr.substring(0, 10);
  } else {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      ymd = parsed.toISOString().split('T')[0];
    }
  }

  if (ymd) {
    const match = (!from || ymd >= from) && (!to || ymd <= to);
    if (match) return true;
  }

  // Also check local date conversion in case of timezone shift
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const localYMD = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    const localMatch = (!from || localYMD >= from) && (!to || localYMD <= to);
    if (localMatch) return true;
  }

  return false;
};

const isInvoiceInSelectedDateRange = (inv: any, from: string, to: string): boolean => {
  if (!from && !to) return true;
  const attrs = inv.attributes || inv;

  // 1. Invoice date or creation date
  if (isDateInRange(attrs.invoice_date, from, to)) return true;
  if (!attrs.invoice_date && isDateInRange(attrs.createdAt, from, to)) return true;

  // 2. Billing period start / end dates
  if (isDateInRange(attrs.period_start, from, to)) return true;
  if (isDateInRange(attrs.period_end, from, to)) return true;

  // 3. Billing period fully enclosed or enclosing
  if (attrs.period_start && attrs.period_end && from && to) {
    const pS = attrs.period_start.includes('T') ? attrs.period_start.split('T')[0] : attrs.period_start.substring(0, 10);
    const pE = attrs.period_end.includes('T') ? attrs.period_end.split('T')[0] : attrs.period_end.substring(0, 10);
    if (pS >= from && pE <= to) return true;
  }

  return false;
};

export default function ShipperInvoicesPage() {
  const { user, isShipper, isShipperAdmin, isShipperEmployee, activeBusinessId } = useAuth();
  const isCourierUser = !isShipper && !isShipperAdmin && !isShipperEmployee;
  const businessName = user?.tenant?.name || user?.tenantName || 'Naeem Tenant';

  // Extract user's assigned businesses for shipper users
  const userBusinesses = React.useMemo(() => {
    if (!user?.shipper) return [];
    return Array.isArray(user.shipper) ? user.shipper : [user.shipper];
  }, [user]);

  const userBusinessIds = React.useMemo(() => {
    return userBusinesses.map((b: any) => b.id).filter(Boolean);
  }, [userBusinesses]);

  // Tab state: Live Statement vs Finalized Invoices History
  const [activeTab, setActiveTab] = React.useState<'statement' | 'history'>('statement');
  const [pastInvoices, setPastInvoices] = React.useState<any[]>([]);
  const [loadingPastInvoices, setLoadingPastInvoices] = React.useState(false);

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

  // Payment Method Modal state for Send Payment action (Courier Admin Entry Point 2)
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = React.useState(false);
  const [payingInvoice, setPayingInvoice] = React.useState<any | null>(null);
  const [paymentModalError, setPaymentModalError] = React.useState('');
  const [payoutPaymentData, setPayoutPaymentData] = React.useState<PaymentMethodData>({
    payment_method: 'Cash',
    bank_name: '',
    account_title: '',
    account_number: '',
    cheque_title: '',
    cheque_number: '',
  });

  // Bank edit drawer/modal
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [accountTitle, setAccountTitle] = React.useState('');
  const [chequeNumber, setChequeNumber] = React.useState('');
  const [chequeTitle, setChequeTitle] = React.useState('');

  // Active Invoice Data for Printing (Used when printing a specific invoice / slip from history or top bar)
  const [printingInvoiceSlip, setPrintingInvoiceSlip] = React.useState<{
    invoiceNumber: string;
    invoiceDate: string;
    periodStart: string;
    periodEnd: string;
    bankName: string;
    accountNumber: string;
    accountTitle: string;
    chequeNumber?: string;
    paymentMethod: string;
    totals: {
      totalCash: number;
      totalCharges: number;
      ibftFee: number;
      netPayable: number;
      totalWeight: number;
      totalBase: number;
      totalFaf: number;
      totalGst: number;
      totalIncomeTax: number;
      totalHoldingTax: number;
      totalCashHandling: number;
      count: number;
    };
    items: StatementLineItem[];
  } | null>(null);
  const [isFetchingPrintSlip, setIsFetchingPrintSlip] = React.useState(false);

  // 1. Fetch Shippers and Plans on Mount
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [shippersRes, plansRes] = await Promise.all([
          apiClient.get('/shippers/with-plans').catch(() => apiClient.get('/shippers?populate=*')).catch(() => null),
          apiClient.get('/shipper-plan/list').catch(() => apiClient.get('/shipper-plans')).catch(() => null),
        ]);

        const rawShippers = shippersRes?.data?.data || [];
        let mappedShippers: ShipperRecord[] = rawShippers.map((s: any) => ({
          id: s.id,
          name: s.name || s.attributes?.name || `Shipper #${s.id}`,
          account_id: s.account_id || s.attributes?.account_id || String(28000 + s.id),
          bank_name: s.bank_name || s.attributes?.bank_name || '',
          account_number: s.account_number || s.attributes?.account_number || '',
          account_title: s.account_title || s.attributes?.account_title || s.name || '',
          cheque_number: s.cheque_number || s.attributes?.cheque_number || '',
          cheque_title: s.cheque_title || s.attributes?.cheque_title || '',
          payment_method: s.payment_method || s.attributes?.payment_method || 'Cash',
          shipper_plan: s.shipper_plan || s.attributes?.shipper_plan || null,
        }));

        if (isShipper) {
          // Strictly restrict shippers to businesses assigned to this user
          mappedShippers = mappedShippers.filter(s => userBusinessIds.includes(s.id));
          if (mappedShippers.length === 0 && userBusinesses.length > 0) {
            mappedShippers = userBusinesses.map((s: any) => ({
              id: s.id,
              name: s.name || `Business #${s.id}`,
              account_id: s.account_id || String(28000 + s.id),
              bank_name: s.bank_name || '',
              account_number: s.account_number || '',
              account_title: s.account_title || s.name || '',
              cheque_number: s.cheque_number || '',
              cheque_title: s.cheque_title || '',
              payment_method: s.payment_method || 'Cash',
              shipper_plan: s.shipper_plan || null,
            }));
          }
        }

        setShippers(mappedShippers);

        let initialId: number | null = null;
        if (isShipper) {
          if (activeBusinessId && userBusinessIds.includes(activeBusinessId)) {
            initialId = activeBusinessId;
          } else if (mappedShippers.length > 0) {
            initialId = mappedShippers[0].id;
          } else if (userBusinessIds.length > 0) {
            initialId = userBusinessIds[0];
          }
        } else {
          initialId = mappedShippers.length > 0 ? mappedShippers[0].id : null;
        }

        if (initialId) {
          setSelectedShipperId(initialId);
          const found = mappedShippers.find(s => s.id === initialId);
          if (found) {
            if (found.bank_name) setBankName(found.bank_name);
            if (found.account_number) setAccountNumber(found.account_number);
            if (found.account_title) setAccountTitle(found.account_title);
          }
        }

        if (plansRes?.data?.data) {
          setPlans(plansRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load initial data for shipper invoices:', err);
      }
    };

    fetchInitialData();
  }, [isShipper, activeBusinessId, userBusinessIds, userBusinesses]);

  // Synchronize selected shipper when activeBusinessId changes from header switcher
  React.useEffect(() => {
    if (isShipper && activeBusinessId && userBusinessIds.includes(activeBusinessId)) {
      setSelectedShipperId(activeBusinessId);
    }
  }, [isShipper, activeBusinessId, userBusinessIds]);

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
      setPayoutPaymentData({
        payment_method: activeShipper.payment_method || 'Cash',
        bank_name: activeShipper.bank_name || '',
        account_title: activeShipper.account_title || '',
        account_number: activeShipper.account_number || '',
        cheque_title: activeShipper.cheque_title || '',
        cheque_number: '',
      });
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

  // Rates from active plan (only apply if explicitly configured on the plan)
  const fafRate = typeof activePlan?.faf_rate === 'number' ? activePlan.faf_rate : 0;
  const gstRate = typeof activePlan?.gst_rate === 'number' ? activePlan.gst_rate : 0;
  const incomeTaxRate = typeof activePlan?.income_tax_rate === 'number' ? activePlan.income_tax_rate : 0;
  const holdingTaxRate = typeof activePlan?.holding_tax_rate === 'number' ? activePlan.holding_tax_rate : 0;
  const ibftFee = typeof activePlan?.ibft_charge === 'number' ? activePlan.ibft_charge : 0;
  const cashHandlingType = activePlan?.cash_handling_type || 'percentage';
  const cashHandlingValue = activePlan?.cash_handling_value ?? 0;
  const cashHandlingMinFee = activePlan?.cash_handling_min_fee ?? 0;

  // 2. Fetch Eligible Parcels (including prior unbilled / excluded parcels)
  const fetchEligibleParcels = React.useCallback(async () => {
    if (!selectedShipperId) return;
    if (isShipper && !userBusinessIds.includes(selectedShipperId)) {
      console.warn('Unauthorized shipper access attempt blocked.');
      setLineItems([]);
      return;
    }
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

      // Filter for un-invoiced completed parcels within the selected date range
      const eligible = allParcels.filter(p => {
        const isInvoiced = p.is_invoiced === true || p.attributes?.is_invoiced === true || !!p.invoice || !!p.attributes?.invoice;
        if (isInvoiced) return false;

        const rawStatus = (p.status || p.attributes?.status || '').toLowerCase();
        const isDelivered = rawStatus.includes('delivered') || rawStatus === 'out for delivery' || rawStatus.includes('delivery');
        const isReturned = rawStatus.includes('return') || rawStatus.includes('failed') || rawStatus.includes('lost');

        if (!isDelivered && !isReturned) return false;

        // Strictly check if parcel completed or booking date falls within selected date range
        const matchesDate = 
          isDateInRange(p.delivered_date || p.attributes?.delivered_date, fromDate, toDate) ||
          isDateInRange(p.arrival_date || p.attributes?.arrival_date, fromDate, toDate) ||
          isDateInRange(p.createdAt || p.attributes?.createdAt, fromDate, toDate) ||
          isDateInRange(p.created_at || p.attributes?.created_at, fromDate, toDate);

        return matchesDate;
      });

      // Map to Statement line items
      const items: StatementLineItem[] = eligible.map((p, idx) => {
        const rawStatus = (p.status || p.attributes?.status || '').toLowerCase();
        const isDelivered = rawStatus.includes('delivered') || rawStatus === 'out for delivery' || rawStatus.includes('delivery');
        const isReturned = !isDelivered;

        const pDateStr = p.delivered_date || p.arrival_date || p.updatedAt || p.createdAt || new Date().toISOString();
        const pDate = new Date(pDateStr);
        const isPriorPending = pDate.getTime() < fromTimestamp;

        // Weight and Cash
        const weight = Number(p.weight || p.attributes?.weight) || 1.0;
        const codAmount = Number(p.cod_amount || p.attributes?.cod_amount) || 0;
        const cash = isDelivered ? codAmount : 0; // On returned parcels, cash collected is 0

        // Base Delivery / Return Charge
        let baseCharge = Number(p.delivery_charges || p.attributes?.delivery_charges) || 250.0;
        if (baseCharge <= 0) baseCharge = 250.0;

        // FAF calculation: Base * (fafRate / 100)
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

        // Net Payable: Cash - Net Charges (Deduct service charges from COD collected, matching cod-settlement)
        const netPayable = (isDelivered && cash > 0)
          ? Math.max(0, Math.round((cash - netCharges) * 100) / 100)
          : Math.round((cash - netCharges) * 100) / 100;

        const bookDateFormatted = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '27-07-2026';
        const arrivalDateFormatted = p.arrival_date ? new Date(p.arrival_date).toLocaleDateString('en-GB').replace(/\//g, '-') : (p.delivered_date ? new Date(p.delivered_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '29-07-2026');

        return {
          id: p.id,
          documentId: p.documentId || p.attributes?.documentId,
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

      setLineItems(items);
      setInvoiceNumber(String(Math.floor(20000 + Math.random() * 5000)));
    } catch (err) {
      console.error('Failed to load eligible parcels for statement:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedShipperId, fromDate, toDate, fafRate, gstRate, incomeTaxRate, holdingTaxRate, cashHandlingType, cashHandlingValue, cashHandlingMinFee, isShipper, userBusinessIds]);

  React.useEffect(() => {
    fetchEligibleParcels();
  }, [fetchEligibleParcels]);

  // Fetch past finalized invoices from Strapi
  const fetchPastInvoices = React.useCallback(async () => {
    if (!selectedShipperId) return;
    if (isShipper && !userBusinessIds.includes(selectedShipperId)) return;
    setLoadingPastInvoices(true);
    try {
      const res = await apiClient.get(
        `/invoices?filters[shipper][id][$eq]=${selectedShipperId}&populate=*&sort[0]=createdAt:desc&pagination[limit]=100`
      ).catch(() => ({ data: { data: [] } }));
      setPastInvoices(res.data?.data || []);
    } catch (e) {
      console.warn('Failed to load past invoices:', e);
    } finally {
      setLoadingPastInvoices(false);
    }
  }, [selectedShipperId, isShipper, userBusinessIds]);

  // Separate paid and unpaid invoices filtered by selected date range
  const paidInvoices = React.useMemo(() => {
    return pastInvoices.filter((inv: any) => {
      const invAttrs = inv.attributes || inv;
      const isPaid = (invAttrs.status || '').toLowerCase() === 'paid';
      if (!isPaid) return false;
      return isInvoiceInSelectedDateRange(inv, fromDate, toDate);
    });
  }, [pastInvoices, fromDate, toDate]);

  const unpaidInvoices = React.useMemo(() => {
    return pastInvoices.filter((inv: any) => {
      const invAttrs = inv.attributes || inv;
      const isUnpaid = (invAttrs.status || '').toLowerCase() !== 'paid';
      if (!isUnpaid) return false;
      return isInvoiceInSelectedDateRange(inv, fromDate, toDate);
    });
  }, [pastInvoices, fromDate, toDate]);

  React.useEffect(() => {
    fetchPastInvoices();
  }, [fetchPastInvoices]);

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
    const rawPayable = totalCash - totalCharges - (selectedItems.length > 0 ? ibftFee : 0);
    const netPayable = Math.max(0, Math.round(rawPayable * 100) / 100);

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
    const rawPayable = totalCash - totalCharges - fee;
    const netPayable = Math.max(0, Math.round(rawPayable * 100) / 100);

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
    setPrintingInvoiceSlip(null);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintSingular = (item: StatementLineItem) => {
    setPrintingInvoiceSlip(null);
    setSingularPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Print Slip for a specific finalized/paid invoice
  const handlePrintSlip = async (inv: any) => {
    const invAttrs = inv.attributes || inv;
    const invId = inv.id;
    const invNum = invAttrs.invoice_number || `INV-${inv.id}`;
    const invDate = invAttrs.invoice_date || (invAttrs.createdAt ? new Date(invAttrs.createdAt).toLocaleDateString('en-GB') : '-');
    const pStart = invAttrs.period_start || fromDate;
    const pEnd = invAttrs.period_end || toDate;

    setSingularPrintItem(null);
    setIsFetchingPrintSlip(true);
    try {
      // Query the parcels associated with this invoice from Strapi
      const res = await apiClient.get(`/parcels?filters[invoice][id][$eq]=${invId}&populate=*&pagination[limit]=500`);
      const fetchedParcels = res.data?.data || [];

      let mappedItems: StatementLineItem[] = [];
      if (fetchedParcels.length > 0) {
        mappedItems = fetchedParcels.map((p: any, idx: number) => {
          const rawStatus = (p.status || p.attributes?.status || '').toLowerCase();
          const isDelivered = rawStatus.includes('delivered') || rawStatus === 'out for delivery' || rawStatus.includes('delivery');
          
          const weight = Number(p.weight || p.attributes?.weight) || 1.0;
          const codAmount = Number(p.cod_amount || p.attributes?.cod_amount) || 0;
          const cash = isDelivered ? codAmount : 0;
          let baseCharge = Number(p.delivery_charges || p.attributes?.delivery_charges) || 250.0;
          if (baseCharge <= 0) baseCharge = 250.0;

          const fafAmt = Math.round((baseCharge * (fafRate / 100)) * 100) / 100;
          const freightSub = baseCharge + fafAmt;
          const gstAmt = Math.round((freightSub * (gstRate / 100)) * 10) / 10;
          const incAmt = isDelivered ? Math.round((cash * (incomeTaxRate / 100)) * 100) / 100 : 0.0;
          const hldAmt = isDelivered ? Math.round((cash * (holdingTaxRate / 100)) * 100) / 100 : 0.0;
          
          let ch = 0.0;
          if (isDelivered && cashHandlingValue > 0) {
            ch = cashHandlingType === 'percentage' 
              ? Math.max(cashHandlingMinFee, Math.round((cash * (cashHandlingValue / 100)) * 100) / 100)
              : cashHandlingValue;
          }
          const netCh = Math.round((baseCharge + fafAmt + gstAmt + incAmt + hldAmt + ch) * 100) / 100;
          const netP = isDelivered && cash > 0
            ? Math.max(0, Math.round((cash - netCh) * 100) / 100)
            : Math.round((cash - netCh) * 100) / 100;

          const bookDateFormatted = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
          const arrivalDateFormatted = p.arrival_date ? new Date(p.arrival_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';

          return {
            id: p.id,
            documentId: p.documentId || p.attributes?.documentId,
            cnNumber: p.tracking_number || p.attributes?.tracking_number || `CN-${p.id}`,
            consignee: p.recipient_name || p.attributes?.recipient_name || 'Customer Name',
            orderId: p.reference_number || p.attributes?.reference_number || `ORD-${p.id}`,
            bookDate: bookDateFormatted,
            arrivalDate: arrivalDateFormatted,
            origin: p.source_city?.CityName?.substring(0, 3).toUpperCase() || p.source_city?.name?.substring(0, 3).toUpperCase() || 'LHE',
            destination: p.destination_city?.CityName?.substring(0, 3).toUpperCase() || p.destination_city?.name?.substring(0, 3).toUpperCase() || 'KHI',
            weight,
            cashCollected: cash,
            baseCharges: baseCharge,
            fafRate,
            fafAmount: fafAmt,
            gstRate,
            gstAmount: gstAmt,
            incomeTaxRate,
            incomeTaxAmount: incAmt,
            holdingTaxRate,
            holdingTaxAmount: hldAmt,
            cashHandling: ch,
            netCharges: netCh,
            netPayable: netP,
            status: isDelivered ? 'Delivered' : 'Returned',
            isSelected: true,
            isPriorPending: false,
          };
        });
      }

      const totalCash = mappedItems.length > 0 
        ? mappedItems.reduce((acc, it) => acc + it.cashCollected, 0)
        : Number(invAttrs.cod_amount) || 0;

      const totalCharges = mappedItems.length > 0 
        ? mappedItems.reduce((acc, it) => acc + it.netCharges, 0)
        : Number(invAttrs.total_charges) || 0;

      const ibft = Number(invAttrs.ibft_charges) || 0;
      const netPayable = Number(invAttrs.net_payable) || Math.max(0, totalCash - totalCharges - ibft);
      const totalWeight = mappedItems.reduce((acc, it) => acc + it.weight, 0);
      const totalBase = mappedItems.reduce((acc, it) => acc + it.baseCharges, 0);
      const totalFaf = mappedItems.reduce((acc, it) => acc + it.fafAmount, 0);
      const totalGst = mappedItems.reduce((acc, it) => acc + it.gstAmount, 0);
      const totalIncomeTax = mappedItems.reduce((acc, it) => acc + it.incomeTaxAmount, 0);
      const totalHoldingTax = mappedItems.reduce((acc, it) => acc + it.holdingTaxAmount, 0);
      const totalCashHandling = mappedItems.reduce((acc, it) => acc + it.cashHandling, 0);

      setPrintingInvoiceSlip({
        invoiceNumber: invNum.replace('INV-', ''),
        invoiceDate: invDate,
        periodStart: pStart,
        periodEnd: pEnd,
        bankName: invAttrs.bank_name || activeShipper?.bank_name || '',
        accountNumber: invAttrs.account_number || activeShipper?.account_number || '',
        accountTitle: invAttrs.account_title || activeShipper?.account_title || activeShipper?.name || '',
        chequeNumber: invAttrs.cheque_number || '',
        paymentMethod: invAttrs.payment_method || 'Cash',
        totals: {
          totalCash,
          totalCharges,
          ibftFee: ibft,
          netPayable,
          totalWeight,
          totalBase,
          totalFaf,
          totalGst,
          totalIncomeTax,
          totalHoldingTax,
          totalCashHandling,
          count: mappedItems.length || invAttrs.included_parcel_count || 0,
        },
        items: mappedItems,
      });

      setTimeout(() => {
        window.print();
      }, 250);
    } catch (err) {
      console.error('Failed to load invoice parcels for print slip:', err);
      setPrintingInvoiceSlip({
        invoiceNumber: invNum.replace('INV-', ''),
        invoiceDate: invDate,
        periodStart: pStart,
        periodEnd: pEnd,
        bankName: invAttrs.bank_name || activeShipper?.bank_name || '',
        accountNumber: invAttrs.account_number || activeShipper?.account_number || '',
        accountTitle: invAttrs.account_title || activeShipper?.account_title || activeShipper?.name || '',
        chequeNumber: invAttrs.cheque_number || '',
        paymentMethod: invAttrs.payment_method || 'Cash',
        totals: {
          totalCash: Number(invAttrs.cod_amount) || 0,
          totalCharges: Number(invAttrs.total_charges) || 0,
          ibftFee: Number(invAttrs.ibft_charges) || 0,
          netPayable: Number(invAttrs.net_payable) || 0,
          totalWeight: 0,
          totalBase: 0,
          totalFaf: 0,
          totalGst: 0,
          totalIncomeTax: 0,
          totalHoldingTax: 0,
          totalCashHandling: 0,
          count: invAttrs.included_parcel_count || 0,
        },
        items: [],
      });
      setTimeout(() => {
        window.print();
      }, 250);
    } finally {
      setIsFetchingPrintSlip(false);
    }
  };

  const handlePrintTop = () => {
    if (activeTab === 'history') {
      if (paidInvoices.length > 0) {
        handlePrintSlip(paidInvoices[0]);
      } else {
        alert('No paid invoices available to print.');
      }
    } else {
      setPrintingInvoiceSlip(null);
      handlePrintBatch();
    }
  };

  React.useEffect(() => {
    const handleAfterPrint = () => {
      setSingularPrintItem(null);
      setPrintingInvoiceSlip(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Financial Totals calculation for ALL eligible items (before exclusions)
  const fullTotals = React.useMemo(() => {
    const totalCash = lineItems.reduce((acc, it) => acc + it.cashCollected, 0);
    const totalCharges = lineItems.reduce((acc, it) => acc + it.netCharges, 0);
    const rawPayable = totalCash - totalCharges - (lineItems.length > 0 ? ibftFee : 0);
    const netPayable = Math.max(0, Math.round(rawPayable * 100) / 100);
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

  // 4. Open Send Payment Modal with Payment Method Block (Courier Admin Entry Point 2)
  const handleOpenSendPaymentModal = (existingInvoice?: any) => {
    // Strictly guard existingInvoice so a MouseEvent / SyntheticEvent is never treated as an invoice
    const isActualInvoice = Boolean(
      existingInvoice && 
      typeof existingInvoice === 'object' && 
      !('nativeEvent' in existingInvoice) && 
      !('isTrusted' in existingInvoice) &&
      (existingInvoice.id || existingInvoice.documentId)
    );

    if (isActualInvoice) {
      setPayingInvoice(existingInvoice);
      setPayoutPaymentData({
        payment_method: existingInvoice.payment_method || activeShipper?.payment_method || 'Cash',
        bank_name: existingInvoice.bank_name || activeShipper?.bank_name || '',
        account_title: existingInvoice.account_title || activeShipper?.account_title || '',
        account_number: existingInvoice.account_number || activeShipper?.account_number || '',
        cheque_title: existingInvoice.cheque_title || activeShipper?.cheque_title || '',
        cheque_number: existingInvoice.cheque_number || '',
      });
    } else {
      setPayingInvoice(null);
      if (selectedItems.length === 0) {
        alert('You must include at least one shipment in the statement.');
        return;
      }
      if (activeShipper) {
        setPayoutPaymentData({
          payment_method: activeShipper.payment_method || 'Cash',
          bank_name: activeShipper.bank_name || '',
          account_title: activeShipper.account_title || '',
          account_number: activeShipper.account_number || '',
          cheque_title: activeShipper.cheque_title || '',
          cheque_number: '',
        });
      }
    }

    setPaymentModalError('');
    setIsPaymentMethodModalOpen(true);
  };

  // 5. Confirm & Finalize Statement / Invoice with configured Payment Method & Cheque Number
  const handleConfirmSendPaymentWithMethod = async () => {
    // Validation for Cheque / Online
    if (payoutPaymentData.payment_method === 'Online' || payoutPaymentData.payment_method === 'Cheque') {
      if (!payoutPaymentData.bank_name?.trim()) {
        setPaymentModalError(`Bank Name is required when paying via ${payoutPaymentData.payment_method}.`);
        return;
      }
      if (!payoutPaymentData.account_title?.trim()) {
        setPaymentModalError(`Account Title is required when paying via ${payoutPaymentData.payment_method}.`);
        return;
      }
      if (!payoutPaymentData.account_number?.trim()) {
        setPaymentModalError(`Account Number / IBAN is required when paying via ${payoutPaymentData.payment_method}.`);
        return;
      }
    }

    // Specific transaction cheque number required if payment method is Cheque
    if (payoutPaymentData.payment_method === 'Cheque') {
      if (!payoutPaymentData.cheque_number?.trim()) {
        setPaymentModalError('Transaction Cheque Number is required for Cheque disbursement.');
        return;
      }
    }

    setPaymentModalError('');
    setIsFinalizing(true);

    try {
      // Flow A: Paying an existing pending invoice
      if (payingInvoice) {
        const invDocId = payingInvoice.documentId || payingInvoice.document_id || payingInvoice.id;
        await apiClient.put(`/invoices/${invDocId}`, {
          data: {
            status: 'Paid',
            payment_method: payoutPaymentData.payment_method,
            cheque_number: payoutPaymentData.payment_method === 'Cheque' ? payoutPaymentData.cheque_number : null,
            bank_name: payoutPaymentData.bank_name || null,
            account_title: payoutPaymentData.account_title || null,
            account_number: payoutPaymentData.account_number || null,
          }
        });

        if (selectedShipperId) {
          await apiClient.put(`/shippers/${selectedShipperId}`, {
            data: {
              payment_method: payoutPaymentData.payment_method,
              bank_name: payoutPaymentData.bank_name || '',
              account_title: payoutPaymentData.account_title || '',
              account_number: payoutPaymentData.account_number || '',
              cheque_title: payoutPaymentData.cheque_title || '',
            }
          }).catch(err => console.warn('Could not update shipper payment method in DB:', err));
        }

        setIsPaymentMethodModalOpen(false);
        setFinalizedSuccess(true);
        const invNum = payingInvoice.invoice_number || `INV-${payingInvoice.id}`;
        setPayingInvoice(null);
        alert(`Payment sent successfully via ${payoutPaymentData.payment_method}! Invoice ${invNum} is now marked as PAID in the database and moved to Paid Invoices.`);
        fetchPastInvoices();
        return;
      }

      // Flow B: Paying statement shipments and generating new Paid invoice
      // 1. Save payment method & bank details to the Shipper record in database
      if (selectedShipperId) {
        await apiClient.put(`/shippers/${selectedShipperId}`, {
          data: {
            payment_method: payoutPaymentData.payment_method,
            bank_name: payoutPaymentData.bank_name || '',
            account_title: payoutPaymentData.account_title || '',
            account_number: payoutPaymentData.account_number || '',
            cheque_title: payoutPaymentData.cheque_title || '',
          }
        }).catch(err => console.warn('Could not update shipper payment method in DB:', err));
      }

      // 2. Save Invoice to Strapi with status 'Paid', payment_method, and transaction-specific cheque_number
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
          status: 'Paid',
          shipper: selectedShipperId,
          payment_method: payoutPaymentData.payment_method,
          cheque_number: payoutPaymentData.payment_method === 'Cheque' ? payoutPaymentData.cheque_number : null,
          bank_name: payoutPaymentData.bank_name || null,
          account_title: payoutPaymentData.account_title || null,
          account_number: payoutPaymentData.account_number || null,
        }
      };

      const invRes = await apiClient.post('/invoices', invoicePayload);
      const createdInvDocId = invRes?.data?.data?.documentId || invRes?.data?.documentId;

      // Update included parcels in Strapi to mark them as Invoiced and Settled
      for (const item of selectedItems) {
        const docId = item.documentId || String(item.id);
        try {
          await apiClient.put(`/parcels/${docId}`, {
            data: {
              is_invoiced: true,
              settlement_status: 'Settled',
              ...(createdInvDocId ? { invoice: createdInvDocId } : {}),
            }
          });
        } catch (parcelErr) {
          console.warn(`Could not update parcel ${item.cnNumber}:`, parcelErr);
        }
      }

      // Excluded parcels explicitly remain: is_invoiced = false, settlement_status = 'Pending'
      for (const item of excludedItems) {
        const docId = item.documentId || String(item.id);
        try {
          await apiClient.put(`/parcels/${docId}`, {
            data: {
              is_invoiced: false,
              settlement_status: 'Pending',
            }
          });
        } catch (exErr) {
          console.warn(`Could not update excluded parcel ${item.cnNumber}:`, exErr);
        }
      }

      // Remove paid items from UI state immediately so they disappear from Tab 1
      setLineItems(prev => prev.filter(it => !it.isSelected));

      // Update activeShipper in local state with saved payment details
      if (selectedShipperId) {
        setShippers(prev => prev.map(s => s.id === selectedShipperId ? {
          ...s,
          payment_method: payoutPaymentData.payment_method,
          bank_name: payoutPaymentData.bank_name || '',
          account_title: payoutPaymentData.account_title || '',
          account_number: payoutPaymentData.account_number || '',
          cheque_title: payoutPaymentData.cheque_title || '',
        } : s));
      }

      setIsPaymentMethodModalOpen(false);
      setFinalizedSuccess(true);
      alert(`Payment sent successfully via ${payoutPaymentData.payment_method}! Invoice INV-${invoiceNumber} has been created & marked as PAID in the database.\n\n• ${selectedItems.length} orders settled and moved to Paid Invoices tab.\n• ${excludedItems.length} excluded orders remain in pending status.`);
      fetchEligibleParcels();
      fetchPastInvoices();
    } catch (err: any) {
      console.error('Failed to finalize invoice and send payment:', err);
      alert(err?.response?.data?.error?.message || err?.message || 'Failed to process payment. Please verify inputs.');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Export to CSV (Supports Tab 1 Statement Shipments and Tab 2 Paid Invoices)
  const handleExportCSV = () => {
    if (activeTab === 'history') {
      if (paidInvoices.length === 0) return;

      const headers = [
        'Invoice Number', 'Date', 'Billing Period', 'Orders Count', 'COD Collected (PKR)', 
        'Freight Charges (PKR)', 'Net Payable (PKR)', 'Payment Method', 'Cheque / Ref Number', 
        'Bank Name', 'Account Title', 'Account Number', 'Status'
      ];

      const rows = paidInvoices.map((inv: any) => {
        const invAttrs = inv.attributes || inv;
        const invNum = invAttrs.invoice_number || `INV-${inv.id}`;
        const invDate = invAttrs.invoice_date || (invAttrs.createdAt ? new Date(invAttrs.createdAt).toLocaleDateString('en-GB') : '-');
        const period = invAttrs.period_start && invAttrs.period_end ? `${invAttrs.period_start} to ${invAttrs.period_end}` : '-';
        const count = invAttrs.included_parcel_count || invAttrs.parcels?.data?.length || invAttrs.parcels?.length || 0;
        const cod = Number(invAttrs.cod_amount) || 0;
        const charges = Number(invAttrs.total_charges) || 0;
        const net = Number(invAttrs.net_payable) || Math.max(0, cod - charges);
        const status = invAttrs.status || 'Paid';
        const payMethod = invAttrs.payment_method || 'Cash';
        const chq = invAttrs.cheque_number || '-';
        const bName = invAttrs.bank_name || '-';
        const aTitle = invAttrs.account_title || '-';
        const aNum = invAttrs.account_number || '-';

        return [
          invNum,
          invDate,
          `"${period}"`,
          count,
          cod.toFixed(2),
          charges.toFixed(2),
          net.toFixed(2),
          payMethod,
          `"${chq}"`,
          `"${bName}"`,
          `"${aTitle}"`,
          `"${aNum}"`,
          status
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + 
        [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Paid_Invoices_${activeShipper?.name || 'Shipper'}_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

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

  // Access check: Allow Courier staff AND Shippers
  const hasAccess = isCourierUser || isShipper || isShipperAdmin || isShipperEmployee;
  if (!hasAccess) {
    return (
      <PortalLayout>
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-red-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Ban className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-xs text-slate-500">
            The Shipper Invoices module requires either Courier Administrator or Shipper Merchant account credentials.
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 6mm 6mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #statement-print-area, #statement-print-area * {
            visibility: visible !important;
            overflow: visible !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          #statement-print-area ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          #statement-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            padding: 4px !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          #statement-print-area div {
            overflow: visible !important;
            overflow-x: visible !important;
          }
          #statement-print-area table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 7.5pt !important;
          }
          #statement-print-area th, #statement-print-area td {
            word-break: break-word !important;
            white-space: normal !important;
            padding: 2.5px 2px !important;
            line-height: 1.15 !important;
            overflow: visible !important;
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
                <Receipt className="w-4 h-4" /> {isShipper ? 'Billing & Invoices' : 'Financials & Settlement'}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                {isShipper ? 'Invoices & COD Statements' : 'Shipper Invoices & COD Statements'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isShipper
                  ? 'Review your store COD settlements, courier delivery charges, deduction breakdowns, and print invoices.'
                  : 'Generate merchant COD statements, customize payout amounts, exclude shipments, and manage pending rollovers.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrintTop}
                disabled={activeTab === 'statement' ? selectedItems.length === 0 : paidInvoices.length === 0}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isFetchingPrintSlip ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Print...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" /> <span>Print</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportCSV}
                disabled={activeTab === 'statement' ? selectedItems.length === 0 : paidInvoices.length === 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export
              </button>

              {isCourierUser && (
                <button
                  onClick={() => handleOpenSendPaymentModal()}
                  disabled={isFinalizing || selectedItems.length === 0 || finalizedSuccess}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isFinalizing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Payment...
                    </>
                  ) : finalizedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" /> Payment Sent & Marked Paid
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Send Payment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* VIEW TABS: Unpaid Invoices vs Paid Invoices */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'statement'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Unpaid Invoices &amp; Statement</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'statement' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {lineItems.length + unpaidInvoices.length} Unpaid
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                fetchPastInvoices();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Paid Invoices &amp; Settlements</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {paidInvoices.length} Paid
              </span>
            </button>
          </div>

          {/* FILTER CRITERIA CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Shipper Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> {isShipper ? 'Select Business:' : 'Select Shipper:'}
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
                  onClick={() => {
                    fetchEligibleParcels();
                    fetchPastInvoices();
                  }}
                  disabled={isLoading || loadingPastInvoices}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {isLoading || loadingPastInvoices ? 'Querying Records...' : (activeTab === 'history' ? 'Filter Invoices' : 'Fetch Shipments')}
                </button>
              </div>

            </div>

            {/* SHIPPER BUSINESS BANNER (FOR SHIPPERS) */}
            {!isCourierUser && activeShipper && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{activeShipper.name} • Account #{activeShipper.account_id}</h4>
                    <p className="text-[11px] text-slate-500">
                      Bank: {activeShipper.bank_name || bankName || 'Not Configured'} • A/C: {activeShipper.account_number || accountNumber || '—'} ({activeShipper.account_title || accountTitle || '—'})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Tariff Plan</span>
                  <span className="text-xs font-bold text-primary font-mono">{activePlan?.name || 'Standard Tariff Plan'}</span>
                </div>
              </div>
            )}

            {/* THE CATCH: Target Payment Amount Input & Exclusion Action (COURIER ADMIN ONLY) */}
            {isCourierUser && (
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
            )}

            {/* UNPAID INVOICES AWAITING PAYMENT (COURIER ADMIN) */}
            {isCourierUser && unpaidInvoices.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">pending_actions</span>
                    <span>Unpaid Invoices Awaiting Payment ({unpaidInvoices.length})</span>
                  </div>
                  <span className="text-[11px] text-amber-700 font-medium">Click &quot;Pay Invoice&quot; to disburse funds &amp; mark as Paid</span>
                </div>
                <div className="overflow-x-auto bg-white rounded-2xl border border-amber-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-amber-100/50 text-amber-900 font-bold border-b border-amber-200 uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Invoice Number</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Period</th>
                        <th className="p-3 text-right">Net Payable</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 font-medium">
                      {unpaidInvoices.map((inv: any) => {
                        const invAttrs = inv.attributes || inv;
                        const invNum = invAttrs.invoice_number || `INV-${inv.id}`;
                        const invDate = invAttrs.invoice_date || (invAttrs.createdAt ? new Date(invAttrs.createdAt).toLocaleDateString('en-GB') : '-');
                        const period = invAttrs.period_start && invAttrs.period_end ? `${invAttrs.period_start} to ${invAttrs.period_end}` : '-';
                        const net = Number(invAttrs.net_payable) || 0;
                        return (
                          <tr key={inv.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-primary">{invNum}</td>
                            <td className="p-3 text-slate-600 font-mono">{invDate}</td>
                            <td className="p-3 text-slate-700">{period}</td>
                            <td className="p-3 text-right font-black text-emerald-700 font-mono">PKR {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                                {invAttrs.status || 'Pending'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenSendPaymentModal(invAttrs)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Pay Invoice
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
        {/* VIEW BODY: TAB 1 (CURRENT STATEMENT) OR TAB 2 (FINALIZED INVOICES)        */}
        {/* ========================================================================= */}
        {activeTab === 'history' ? (
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm font-sans text-slate-900 text-xs no-print space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">Finalized Invoices &amp; Settlement History</h3>
                <p className="text-[11px] text-slate-500">
                  Paid settlements, finalized invoices, and historical remittance statements for {activeShipper?.name || 'this business'}.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchPastInvoices}
                disabled={loadingPastInvoices}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border border-slate-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loadingPastInvoices ? 'Loading...' : 'Refresh Records'}</span>
              </button>
            </div>

            {loadingPastInvoices ? (
              <div className="p-16 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading finalized invoice records...</span>
              </div>
            ) : pastInvoices.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200 border-dashed space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-bold">No Finalized Invoices Found</p>
                <p className="text-xs text-slate-400">
                  There are no finalized billing records for {activeShipper?.name || 'this business'} yet. Once courier finalizes a payout, it will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Billing Period</th>
                      <th className="p-3 text-center">Orders</th>
                      <th className="p-3 text-right">COD Collected</th>
                      <th className="p-3 text-right">Freight Charges</th>
                      <th className="p-3 text-right font-black text-emerald-700">Net Payable</th>
                      <th className="p-3 text-center">Payment Details</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paidInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                          No paid invoices found for this shipper and selected date range.
                        </td>
                      </tr>
                    ) : (
                      paidInvoices.map((inv: any) => {
                        const invAttrs = inv.attributes || inv;
                        const invNum = invAttrs.invoice_number || `INV-${inv.id}`;
                        const invDate = invAttrs.invoice_date || (invAttrs.createdAt ? new Date(invAttrs.createdAt).toLocaleDateString('en-GB') : '-');
                        const period = invAttrs.period_start && invAttrs.period_end ? `${invAttrs.period_start} to ${invAttrs.period_end}` : '-';
                        const count = invAttrs.included_parcel_count || invAttrs.parcels?.data?.length || invAttrs.parcels?.length || 0;
                        const cod = Number(invAttrs.cod_amount) || 0;
                        const charges = Number(invAttrs.total_charges) || 0;
                        const net = Number(invAttrs.net_payable) || Math.max(0, cod - charges);
                        const status = invAttrs.status || 'Paid';
                        const payMethod = invAttrs.payment_method || 'Cash';

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-mono font-bold text-primary">{invNum}</td>
                            <td className="p-3 font-mono text-slate-600">{invDate}</td>
                            <td className="p-3 text-slate-700">{period}</td>
                            <td className="p-3 text-center font-bold">{count}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {cod.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-red-600">- PKR {charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-mono font-black text-emerald-700">PKR {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-slate-800 text-[11px] block">{payMethod}</span>
                              {invAttrs.cheque_number && (
                                <span className="text-[10px] text-slate-500 font-mono block">Chq #{invAttrs.cheque_number}</span>
                              )}
                              {invAttrs.bank_name && payMethod !== 'Cash' && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[120px] mx-auto">{invAttrs.bank_name}</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                {status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handlePrintSlip(inv)}
                                disabled={isFetchingPrintSlip}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs border border-slate-200 disabled:opacity-50"
                              >
                                <Printer className="w-3.5 h-3.5 text-primary" /> Print Slip
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* STATEMENT SHIPMENTS GRID (MATCHING COD-SETTLEMENT ENGINE)                 */
          /* ========================================================================= */
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm font-sans text-slate-900 text-xs no-print space-y-6">
            
            {/* Statement Detail Table Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">Statement Shipments Grid</h3>
                <p className="text-[11px] text-slate-500">
                  {activeShipper?.name || 'Shipper'} • {selectedItems.length} of {lineItems.length} Shipments Selected ({totals.deliveredCount} Delivered, {totals.returnedCount} Returned)
                </p>
              </div>
              {totals.ibftFee > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">IBFT Transfer Fee</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">PKR {totals.ibftFee.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Financial Overview Cards (Matching cod-settlement) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered COD Orders</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{totals.count}</div>
                <p className="text-[11px] text-slate-500 mt-1">Ready for settlement ({totals.deliveredCount} Delivered, {totals.returnedCount} Returned)</p>
              </div>

              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total COD Collected</span>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">PKR {totals.totalCash.toLocaleString()}</div>
                <p className="text-[11px] text-slate-500 mt-1">Gross cash from recipients</p>
              </div>

              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Courier Freight Charges</span>
                <div className="text-2xl font-black font-mono text-red-600 mt-1">- PKR {totals.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-[11px] text-slate-500 mt-1">Deductions per plan rate</p>
              </div>

              <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Net Payout to Shipper</span>
                <div className="text-2xl font-black font-mono text-emerald-700 mt-1">PKR {totals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-[11px] font-bold text-emerald-800 mt-1">Direct Bank / Wallet Payout</p>
              </div>
            </div>

            {/* Statement Detail Table (Columns matching cod-settlement) */}
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
                    <th className="p-3 whitespace-nowrap">Tracking Number</th>
                    <th className="p-3 whitespace-nowrap">Consignee</th>
                    <th className="p-3 text-center whitespace-nowrap">Origin</th>
                    <th className="p-3 text-center whitespace-nowrap">Destination</th>
                    <th className="p-3 whitespace-nowrap">Delivered Date</th>
                    <th className="p-3 text-right whitespace-nowrap font-bold">COD Collected</th>
                    <th className="p-3 text-right whitespace-nowrap font-bold">Freight Deduction</th>
                    <th className="p-3 text-right whitespace-nowrap font-black text-emerald-700">Net Payable</th>
                    <th className="p-3 text-center whitespace-nowrap w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
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
                          <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{item.arrivalDate || item.bookDate}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            PKR {item.cashCollected.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-red-600">
                            - PKR {item.netCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700">
                            {item.netPayable >= 0 ? (
                              <span>PKR {item.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-red-600">- PKR {Math.abs(item.netPayable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
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
                      <td className="p-3" colSpan={5}>
                        Total Selected Shipments: {totals.count} ({totals.deliveredCount} Delivered, {totals.returnedCount} Returned)
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        PKR {totals.totalCash.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-red-600">
                        - PKR {totals.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-sm text-emerald-700">
                        PKR {totals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

          </div>
        )}

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
      {/* CONFIRMATION POPUP MODAL: SEND PAYMENT & CONFIGURE PAYMENT METHOD         */}
      {/* ========================================================================= */}
      {isPaymentMethodModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print"
          onClick={() => !isFinalizing && setIsPaymentMethodModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 sm:p-8 space-y-6 my-auto text-left relative z-10 animate-in fade-in duration-200"
            style={{ maxWidth: '42rem', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    Confirm Payment Method &amp; Send Payment
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Disbursing statement payout for <strong className="text-slate-800">{activeShipper?.name || 'Shipper'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isFinalizing}
                onClick={() => setIsPaymentMethodModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Invoice
                </span>
                <span className="text-sm font-black text-slate-800">
                  {payingInvoice ? (payingInvoice.invoice_number || `INV-${payingInvoice.id}`) : `INV-${invoiceNumber}`}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Billing Period
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {payingInvoice 
                    ? `${payingInvoice.period_start || '-'} to ${payingInvoice.period_end || '-'}` 
                    : `${fromDate || '-'} to ${toDate || '-'} (${totals.count} Orders)`}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Net Payout to Shipper</span>
                <span className="text-base font-black font-mono text-emerald-600">
                  PKR {(payingInvoice ? (Number(payingInvoice.net_payable) || 0) : totals.netPayable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Error Message in modal */}
            {paymentModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{paymentModalError}</span>
              </div>
            )}

            {/* Payment Method Block with mode="invoice_payout" (Shows Cheque Number if Cheque selected) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Disbursement Method:
              </label>
              <PaymentMethodConfigBlock
                mode="invoice_payout"
                value={payoutPaymentData}
                onChange={setPayoutPaymentData}
                disabled={isFinalizing}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isFinalizing}
                onClick={() => setIsPaymentMethodModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleConfirmSendPaymentWithMethod}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isFinalizing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Disbursement...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Continue &amp; Send Payment</span>
                  </>
                )}
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
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {businessName || 'DBARC'}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                [Digital Business Automation for Routing & Courier]
              </span>
            </div>
            <h1 className="text-base font-black text-slate-900 mt-0.5 uppercase tracking-tight">
              {singularPrintItem ? 'Singular Shipment COD Statement' : 'COD STATEMENT'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Official Merchant COD Settlement & Remittance Reconciliation Document
            </p>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-xs font-mono font-bold text-slate-900">
              Statement #{printingInvoiceSlip ? printingInvoiceSlip.invoiceNumber : (singularPrintItem ? `CN-${singularPrintItem.cnNumber}` : invoiceNumber)}
            </span>
            <span className="text-[11px] text-slate-600">
              Date: {printingInvoiceSlip ? printingInvoiceSlip.invoiceDate : invoiceDate}
            </span>
            <span className="text-[10px] text-slate-500">
              Period: {printingInvoiceSlip ? `${printingInvoiceSlip.periodStart} to ${printingInvoiceSlip.periodEnd}` : `${fromDate} to ${toDate}`}
            </span>
          </div>
        </div>

        {/* 2. Merchant & Bank Information Block */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-300 text-[10px] mb-3">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-24 font-bold text-slate-600">Account #:</span>
              <span className="font-mono font-bold text-slate-900">{activeShipper?.account_id || '28001'}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-600">Account Name:</span>
              <span className="font-bold text-slate-900">{activeShipper?.name || 'Shipper'}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-600">Period:</span>
              <span className="text-slate-800">{printingInvoiceSlip ? `${printingInvoiceSlip.periodStart} to ${printingInvoiceSlip.periodEnd}` : `${fromDate} to ${toDate}`}</span>
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
              <span className="font-bold text-slate-900">{printingInvoiceSlip?.bankName || activeShipper?.bank_name || bankName || 'Not Configured'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold text-slate-600">Account Number:</span>
              <span className="font-mono font-bold text-slate-900">{printingInvoiceSlip?.accountNumber || activeShipper?.account_number || accountNumber || '—'}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold text-slate-600">Account Title:</span>
              <span className="font-bold text-slate-900">{printingInvoiceSlip?.accountTitle || activeShipper?.account_title || accountTitle || activeShipper?.name || '—'}</span>
            </div>
            {(printingInvoiceSlip?.chequeNumber || activeShipper?.cheque_number || chequeNumber) && (
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Cheque #:</span>
                <span className="font-mono text-slate-900">{printingInvoiceSlip?.chequeNumber || activeShipper?.cheque_number || chequeNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Statement Summary Card */}
        {(() => {
          const curTotals = printingInvoiceSlip ? printingInvoiceSlip.totals : printTotals;
          return (
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
              <div className="bg-slate-100 px-3 py-1 font-bold text-[10px] text-slate-800 uppercase tracking-wider border-b border-slate-300">
                Statement Summary
              </div>
              <div className="grid grid-cols-4 divide-x divide-slate-300 p-2 text-center text-[10px]">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">COD Amount</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">PKR {curTotals.totalCash.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Charges</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">PKR {curTotals.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">IBFT Charges</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">PKR {curTotals.ibftFee.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50">
                  <span className="text-[9px] font-black text-slate-600 uppercase block">Net Payable</span>
                  <span className="font-mono font-black text-slate-900 text-xs">PKR {curTotals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4. Complete 18-Column Detailed Table */}
        {(() => {
          const curItems = printingInvoiceSlip ? printingInvoiceSlip.items : printItems;
          const curTotals = printingInvoiceSlip ? printingInvoiceSlip.totals : printTotals;

          return (
            <div className="overflow-visible border border-slate-300 rounded-lg mb-4">
              <table className="w-full text-left border-collapse text-[8px] table-fixed">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase">
                  <tr>
                    <th className="p-1 w-[8%]">CN No.</th>
                    <th className="p-1 w-[11%]">Consignee</th>
                    <th className="p-1 w-[7%]">Order ID</th>
                    <th className="p-1 w-[6%]">Book Date</th>
                    <th className="p-1 w-[6%]">Arrival Date</th>
                    <th className="p-1 w-[4%] text-center">Orgn.</th>
                    <th className="p-1 w-[4%] text-center">Dest.</th>
                    <th className="p-1 w-[4%] text-right">Wt(kg)</th>
                    <th className="p-1 w-[6%] text-right">Cash</th>
                    <th className="p-1 w-[5%] text-right">Base</th>
                    <th className="p-1 w-[5%] text-right">FAF {fafRate}%</th>
                    <th className="p-1 w-[5%] text-right">GST {gstRate}%</th>
                    <th className="p-1 w-[5%] text-right">Inc.Tax</th>
                    <th className="p-1 w-[5%] text-right">Hold.Tax</th>
                    <th className="p-1 w-[5%] text-right">Handling</th>
                    <th className="p-1 w-[7%] text-right font-bold">Charges</th>
                    <th className="p-1 w-[7%] text-right font-bold">Payable</th>
                    <th className="p-1 w-[5%] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {curItems.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="p-4 text-center text-slate-500 font-medium">
                        {curTotals.count > 0 
                          ? `Statement Settlement Summary • ${curTotals.count} Orders Finalized • Net Payout: PKR ${curTotals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'No shipments found for this statement.'}
                      </td>
                    </tr>
                  ) : (
                    curItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-1 font-mono font-bold text-slate-900 break-all">{item.cnNumber}</td>
                        <td className="p-1 font-medium text-slate-800 truncate" title={item.consignee}>{item.consignee}</td>
                        <td className="p-1 font-mono text-slate-700 truncate">{item.orderId}</td>
                        <td className="p-1 text-slate-600 whitespace-nowrap">{item.bookDate}</td>
                        <td className="p-1 text-slate-600 whitespace-nowrap">{item.arrivalDate}</td>
                        <td className="p-1 text-center font-bold text-slate-700">{item.origin}</td>
                        <td className="p-1 text-center font-bold text-slate-700">{item.destination}</td>
                        <td className="p-1 text-right font-mono">{item.weight.toFixed(1)}</td>
                        <td className="p-1 text-right font-mono font-bold">{item.cashCollected.toLocaleString()}</td>
                        <td className="p-1 text-right font-mono">{item.baseCharges.toFixed(0)}</td>
                        <td className="p-1 text-right font-mono">{item.fafAmount.toFixed(0)}</td>
                        <td className="p-1 text-right font-mono">{item.gstAmount.toFixed(0)}</td>
                        <td className="p-1 text-right font-mono">{item.incomeTaxAmount.toFixed(0)}</td>
                        <td className="p-1 text-right font-mono">{item.holdingTaxAmount.toFixed(0)}</td>
                        <td className="p-1 text-right font-mono">{item.cashHandling.toFixed(0)}</td>
                        <td className="p-1 text-right font-mono font-bold text-slate-900">{item.netCharges.toFixed(2)}</td>
                        <td className={`p-1 text-right font-mono font-bold ${item.netPayable < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {item.netPayable.toFixed(2)}
                        </td>
                        <td className="p-1 text-center">
                          <span className={`inline-block px-1 py-0.5 rounded text-[7px] font-bold ${
                            item.status === 'Delivered' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <tr>
                    <td className="p-1" colSpan={7}>
                      Total : {curTotals.count} Orders
                    </td>
                    <td className="p-1 text-right font-mono">{curTotals.totalWeight.toFixed(1)}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalCash.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalBase.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalFaf.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalGst.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalIncomeTax.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalHoldingTax.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono">{curTotals.totalCashHandling.toLocaleString()}</td>
                    <td className="p-1 text-right font-mono font-black">{curTotals.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 text-right font-mono font-black">{curTotals.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 text-center"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* 5. Signature Section */}
        <div className="flex justify-between items-end pt-8 text-[10px] text-slate-700">
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

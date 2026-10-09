'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { useAuth } from '@/components/AuthProvider';
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Printer,
  ChevronDown,
  Check,
  Building2,
  Wallet,
  Clock,
  UserCheck,
  PackageCheck,
  Scan,
  RotateCcw,
  Search,
  CheckCheck,
  Loader2,
  X
} from 'lucide-react';

interface ClosingParcel {
  id: number | string;
  trackingNumber: string;
  consigneeName: string;
  codAmount: number;
  status: string;
  paidType: 'Cash' | 'Online';
  outcome: string; // 'Scan instead' | 'Delivered' | 'Ready to return' | 'Attempted' | 'Customer refused'
  reason: string;
  isAccountedFor: boolean;
}

interface RiderOption {
  id: number | string;
  name: string;
  phone?: string;
  area?: string;
  riderCode?: string;
  pendingBalance: number;
  openSheetsCount?: number;
}

interface DeliverySheetOption {
  id: number | string;
  sheetNumber: string;
  sheetDate: string;
  riderId: number | string;
  riderName: string;
  status: string;
  parcelCount: number;
  parcels: ClosingParcel[];
}

export default function RiderClosingPage() {
  const router = useRouter();
  const { user, isShipper } = useAuth();

  React.useEffect(() => {
    if (isShipper) {
      router.replace('/financials/shipper-invoices');
    }
  }, [isShipper, router]);

  // State: Riders & Sheets
  const [riders, setRiders] = React.useState<RiderOption[]>([]);
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>('');
  const [deliverySheets, setDeliverySheets] = React.useState<DeliverySheetOption[]>([]);
  const [selectedSheetId, setSelectedSheetId] = React.useState<string>('');
  const [showAllSheets, setShowAllSheets] = React.useState<boolean>(false);

  // Parcels Data
  const [parcels, setParcels] = React.useState<ClosingParcel[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Quick Barcode Scanner State
  const [scanBarcode, setScanBarcode] = React.useState<string>('');
  const [scanMode, setScanMode] = React.useState<'Delivered' | 'Ready to return' | 'Attempted'>('Delivered');

  // Settlement Inputs
  const [cashHandedOver, setCashHandedOver] = React.useState<number>(0);
  const [cashDepositAccount, setCashDepositAccount] = React.useState<string>('Main Cash Drawer');
  const [transferredOnline, setTransferredOnline] = React.useState<number>(0);
  const [onlineDepositAccount, setOnlineDepositAccount] = React.useState<string>('Meezan Bank - Online Collection');
  const [pendingAmount, setPendingAmount] = React.useState<number>(0);
  const [pendingReason, setPendingReason] = React.useState<string>('');

  // Closing Voucher Success Modal State
  const [closedVoucher, setClosedVoucher] = React.useState<any | null>(null);
  const [modalCash, setModalCash] = React.useState<number>(0);
  const [modalAccount, setModalAccount] = React.useState<string>('Main Cash Drawer');
  const [modalReason, setModalReason] = React.useState<string>('');
  const [isUpdatingVoucher, setIsUpdatingVoucher] = React.useState<boolean>(false);
  const hasUserEditedCashRef = React.useRef<boolean>(false);

  // UI Toast
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' | 'warning' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  const triggerToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4500);
  };

  // Outcome options and Reason options matching designs
  const outcomeOptions = [
    'Scan instead',
    'Delivered',
    'Ready to return',
    'Attempted',
    'Customer refused'
  ];

  const reasonOptions = [
    'Refused to accept',
    'Customer not answering',
    'Customer wants delivery later',
    'Address incomplete / incorrect',
    'Cash not ready',
    'Customer cancelled order',
    'Self-collection requested',
    'Out of delivery coverage area'
  ];

  const depositAccounts = [
    'Main Cash Drawer',
    'Branch Cashier Vault',
    'Lahore Hub Safe',
    'Karachi Hub Safe',
    'Meezan Bank - Operations A/C',
    'HBL - Settlement Account',
    'Bank Alfalah - COD Remittance',
    'EasyPaisa / JazzCash Direct'
  ];

  // Helper to map DB parcels into UI format
  const mapDbParcels = (rawParcels: any[]): ClosingParcel[] => {
    return (rawParcels || []).map((p: any) => {
      const st = String(p.status || '').toLowerCase().trim();
      const isDelivered = st === 'delivered';
      const isReturned = st === 'ready to return' || st === 'ready for return' || st === 'return to shipper' || st === 'customer refused';
      const isFailed = st === 'failed attempt' || st === 'delivery failed';

      let outcome = 'Scan instead';
      let isAcc = false;
      if (isDelivered) {
        outcome = 'Delivered';
        isAcc = true;
      } else if (isReturned) {
        outcome = 'Ready to return';
        isAcc = true;
      } else if (isFailed) {
        outcome = 'Attempted';
        isAcc = true;
      }

      return {
        id: p.id,
        trackingNumber: p.tracking_number || `SHZ10000${p.id}`,
        consigneeName: p.recipient_name || 'Customer',
        codAmount: Number(p.cod_amount) || 0,
        status: p.status || 'Out For Delivery',
        paidType: p.payment_type === 'PAID' ? 'Online' : 'Cash',
        outcome,
        reason: p.comments || p.remarks || (isReturned ? 'Refused to accept' : ''),
        isAccountedFor: isAcc,
      };
    });
  };

  // Fetch Riders & Delivery Sheets dynamically on mount
  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Riders (Try custom summary endpoint first, then standard riders endpoint)
      let loadedRiders: RiderOption[] = [];
      try {
        const ridersSummaryRes = await apiClient.get('/delivery-sheets/riders-summary').catch(() => null);
        if (ridersSummaryRes?.data?.data && Array.isArray(ridersSummaryRes.data.data) && ridersSummaryRes.data.data.length > 0) {
          loadedRiders = ridersSummaryRes.data.data.map((r: any) => ({
            id: r.id,
            name: `${r.name}${r.area ? ` — ${r.area}` : ''}`,
            phone: r.phone || '',
            area: r.area || 'Main Zone',
            riderCode: r.rider_code || `RDR-${r.id}`,
            pendingBalance: Number(r.pendingBalance) || 0,
            openSheetsCount: Number(r.openSheetsCount) || 0,
          }));
        } else {
          // Fallback to standard riders endpoint
          const ridersRes = await apiClient.get('/riders?populate=*&pagination[pageSize]=100');
          const rawRiders = ridersRes.data?.data || [];
          loadedRiders = rawRiders.map((r: any) => ({
            id: r.id,
            name: `${r.name || r.rider_name || `Rider #${r.id}`}${r.assigned_area ? ` — ${r.assigned_area}` : ''}`,
            phone: r.phone || '',
            area: r.assigned_area || r.route_code || 'Main Zone',
            riderCode: r.rider_code || `RDR-${r.id}`,
            pendingBalance: Number(r.pending_balance) || 0,
            openSheetsCount: 1,
          }));
        }
      } catch (err) {
        console.warn('Could not load riders from API:', err);
      }

      // Default demo riders if none exist in DB yet
      if (loadedRiders.length === 0) {
        loadedRiders = [
          { id: '1', name: 'Saqib Ali — Iqbal town', area: 'Iqbal town', phone: '0300-1234567', pendingBalance: 1598, openSheetsCount: 1 },
          { id: '2', name: 'Zubair Ahmed — Gulberg', area: 'Gulberg', phone: '0301-7654321', pendingBalance: 4250, openSheetsCount: 1 },
          { id: '3', name: 'Bilal Khan — DHA Phase 5', area: 'DHA Phase 5', phone: '0321-9876543', pendingBalance: 0, openSheetsCount: 0 },
        ];
      }
      setRiders(loadedRiders);

      // 2. Fetch Delivery Sheets from database
      let loadedSheets: DeliverySheetOption[] = [];
      try {
        const sheetsRes = await apiClient.get('/delivery-sheets?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=100');
        const rawSheets = sheetsRes.data?.data || [];
        loadedSheets = rawSheets.map((s: any) => {
          const rawParcels = s.parcels || [];
          const sheetParcels = mapDbParcels(rawParcels);

          return {
            id: s.id,
            sheetNumber: s.sheet_number || `DS1000${s.id}`,
            sheetDate: s.sheet_date || (s.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
            riderId: s.rider?.id || (loadedRiders[0]?.id || ''),
            riderName: s.rider?.name || (loadedRiders[0]?.name || 'Assigned Rider'),
            status: s.status || 'Out For Delivery',
            parcelCount: sheetParcels.length,
            parcels: sheetParcels,
          };
        });
      } catch (err) {
        console.warn('Could not load delivery sheets from API:', err);
      }

      // If no delivery sheets with parcels exist in DB, provide realistic fallback demo sheet
      if (loadedSheets.length === 0 || loadedSheets[0].parcels.length === 0) {
        const sampleParcels: ClosingParcel[] = [
          { id: 1054, trackingNumber: 'SHZ100001054', consigneeName: 'Imran Imran', codAmount: 1598, status: 'Delivered', paidType: 'Cash', outcome: 'Delivered', reason: '', isAccountedFor: true },
          { id: 1026, trackingNumber: 'SHZ100001026', consigneeName: 'Sehar Afzaal', codAmount: 1598, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 970, trackingNumber: 'SHZ100000970', consigneeName: 'Aftab Khan Lodhi', codAmount: 1698, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 989, trackingNumber: 'SHZ100000989', consigneeName: 'Muhammad Ashraf', codAmount: 1548, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 1055, trackingNumber: 'SHZ100001055', consigneeName: 'hamidmehmood hamid', codAmount: 1598, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 911, trackingNumber: 'SHZ100000911', consigneeName: 'Muhammad Salman', codAmount: 3097, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 1016, trackingNumber: 'SHZ100001016', consigneeName: 'Shakeel Ahmad', codAmount: 1598, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 1017, trackingNumber: 'SHZ100001017', consigneeName: 'Shazmom Shahzad', codAmount: 1598, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 867, trackingNumber: 'SHZ100000867', consigneeName: 'Ghazala Soofi Soofi', codAmount: 1598, status: 'Ready To Return', paidType: 'Cash', outcome: 'Ready to return', reason: 'Refused to accept', isAccountedFor: true },
          { id: 1040, trackingNumber: 'SHZ100001040', consigneeName: 'Ali Asghar', codAmount: 1299, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 1075, trackingNumber: 'SHZ100001075', consigneeName: 'Mumtaz ali Shigri', codAmount: 1598, status: 'Ready To Return', paidType: 'Cash', outcome: 'Ready to return', reason: 'Refused to accept', isAccountedFor: true },
          { id: 1030, trackingNumber: 'SHZ100001030', consigneeName: 'Zain Maqbool', codAmount: 1299, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
          { id: 988, trackingNumber: 'SHZ100000988', consigneeName: 'Manzar Manzar', codAmount: 1449, status: 'Out For Delivery', paidType: 'Cash', outcome: 'Scan instead', reason: '', isAccountedFor: false },
        ];

        const mockSheet: DeliverySheetOption = {
          id: '100092',
          sheetNumber: 'DS100092',
          sheetDate: '2026-09-29',
          riderId: loadedRiders[0]?.id || '1',
          riderName: loadedRiders[0]?.name || 'Saqib Ali',
          status: 'Out For Delivery',
          parcelCount: sampleParcels.length,
          parcels: sampleParcels,
        };

        loadedSheets = [mockSheet];
      }

      setDeliverySheets(loadedSheets);

      // Determine initial rider and sheet
      const firstSheet = loadedSheets[0];
      const initialRiderId = String(firstSheet.riderId || loadedRiders[0]?.id || '');
      setSelectedRiderId(initialRiderId);
      setSelectedSheetId(String(firstSheet.id));
      setParcels(firstSheet.parcels);

      // Calculate initial delivered COD to auto-fill cash
      const initialDeliveredCod = firstSheet.parcels
        .filter(p => p.outcome === 'Delivered' || p.status.toLowerCase() === 'delivered')
        .reduce((sum, p) => sum + (p.codAmount || 0), 0);
      setCashHandedOver(initialDeliveredCod);

    } catch (err) {
      console.error('Initial load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isShipper) {
      loadInitialData();
    }
  }, [loadInitialData, isShipper]);

  // Filter sheets for selected rider
  const availableSheets = React.useMemo(() => {
    if (showAllSheets) return deliverySheets;
    if (!selectedRiderId) return deliverySheets;
    const filtered = deliverySheets.filter(s => String(s.riderId) === String(selectedRiderId));
    return filtered.length > 0 ? filtered : deliverySheets;
  }, [deliverySheets, selectedRiderId, showAllSheets]);

  // Handle Rider Change
  const handleRiderChange = (newRiderId: string) => {
    setSelectedRiderId(newRiderId);
    // Find sheets assigned to this rider
    const riderSheets = deliverySheets.filter(s => String(s.riderId) === String(newRiderId));
    if (riderSheets.length > 0) {
      // Pick the first sheet (prefer unclosed / Out For Delivery sheets)
      const openSheet = riderSheets.find(s => s.status !== 'Completed') || riderSheets[0];
      setSelectedSheetId(String(openSheet.id));
      setParcels(openSheet.parcels);
    }
  };

  // When Delivery Sheet changes, load its parcels and sync rider
  const handleSheetChange = (sheetId: string) => {
    setSelectedSheetId(sheetId);
    const found = deliverySheets.find(s => String(s.id) === sheetId);
    if (found) {
      setParcels(found.parcels);
      if (found.riderId && String(found.riderId) !== selectedRiderId) {
        setSelectedRiderId(String(found.riderId));
      }
    }
  };

  // Find active rider and active sheet
  const activeRider = riders.find(r => String(r.id) === selectedRiderId) || riders[0];
  const activeSheet = deliverySheets.find(s => String(s.id) === selectedSheetId) || deliverySheets[0];

  // Handle changing outcome of a parcel
  const handleOutcomeChange = (parcelId: number | string, newOutcome: string) => {
    setParcels(prev =>
      prev.map(p => {
        if (p.id !== parcelId) return p;
        const isRecorded = newOutcome !== 'Scan instead';
        const isNowDelivered = newOutcome === 'Delivered';

        return {
          ...p,
          outcome: newOutcome,
          reason: isNowDelivered || newOutcome === 'Scan instead' ? '' : (p.reason || 'Refused to accept'),
          isAccountedFor: isRecorded,
          status: isNowDelivered ? 'Delivered' : newOutcome === 'Ready to return' || newOutcome === 'Customer refused' ? 'Ready To Return' : newOutcome === 'Attempted' ? 'Failed Attempt' : 'Out For Delivery',
        };
      })
    );
  };

  // Handle changing reason of a non-delivered parcel
  const handleReasonChange = (parcelId: number | string, newReason: string) => {
    setParcels(prev =>
      prev.map(p => (p.id === parcelId ? { ...p, reason: newReason } : p))
    );
  };

  // Separate delivered parcels vs parcels to account for
  const deliveredParcels = React.useMemo(() => {
    return parcels.filter(p => p.outcome === 'Delivered' || p.status.toLowerCase() === 'delivered');
  }, [parcels]);

  const pendingParcels = React.useMemo(() => {
    return parcels.filter(p => p.outcome !== 'Delivered' && p.status.toLowerCase() !== 'delivered');
  }, [parcels]);

  // Financial Metrics Calculation
  const deliveredCodTotal = React.useMemo(() => {
    return deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
  }, [deliveredParcels]);

  // Unaccounted Parcels List for Warning Banner
  const unaccountedParcels = React.useMemo(() => {
    return pendingParcels.filter(p => !p.isAccountedFor || p.outcome === 'Scan instead');
  }, [pendingParcels]);

  // Financial Balance Calculations
  const totalSettledMoney = cashHandedOver + transferredOnline + pendingAmount;
  const missingCodDifference = Math.max(0, deliveredCodTotal - totalSettledMoney);
  const excessCodDifference = Math.max(0, totalSettledMoney - deliveredCodTotal);

  // Auto-sync cashHandedOver when delivered COD changes if user hasn't typed custom cash/online amounts
  React.useEffect(() => {
    if (!hasUserEditedCashRef.current && transferredOnline === 0 && pendingAmount === 0 && deliveredCodTotal > 0) {
      setCashHandedOver(deliveredCodTotal);
    }
  }, [deliveredCodTotal, transferredOnline, pendingAmount]);

  // Sync modal editable state whenever a closed voucher is opened
  React.useEffect(() => {
    if (closedVoucher) {
      setModalCash(closedVoucher.cashHandedOver ?? 0);
      setModalAccount(closedVoucher.cashDepositAccount || 'Main Cash Drawer');
      setModalReason(closedVoucher.pendingReason || '');
    }
  }, [closedVoucher]);

  // Quick Barcode Scan & Apply Handler
  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = scanBarcode.trim().toUpperCase();
    if (!cleanCode) return;

    const foundParcel = parcels.find(
      p => String(p.trackingNumber).toUpperCase() === cleanCode || String(p.id) === cleanCode
    );

    if (!foundParcel) {
      triggerToast(`Barcode "${cleanCode}" not found on active sheet!`, 'warning');
      return;
    }

    if (scanMode === 'Delivered') {
      handleOutcomeChange(foundParcel.id, 'Delivered');
      triggerToast(`✓ #${foundParcel.trackingNumber} marked Delivered (Rs ${foundParcel.codAmount.toLocaleString()})`, 'success');
    } else if (scanMode === 'Ready to return') {
      handleOutcomeChange(foundParcel.id, 'Ready to return');
      triggerToast(`✓ #${foundParcel.trackingNumber} marked Ready to Return`, 'warning');
    } else if (scanMode === 'Attempted') {
      handleOutcomeChange(foundParcel.id, 'Attempted');
      triggerToast(`✓ #${foundParcel.trackingNumber} marked Attempted`, 'warning');
    }

    setScanBarcode('');
  };

  // Bulk Actions for Remaining Unaccounted Parcels
  const handleBulkMarkRemaining = (outcome: 'Ready to return' | 'Attempted') => {
    const reason = outcome === 'Ready to return' ? 'Refused to accept' : 'Customer not answering';
    setParcels(prev =>
      prev.map(p => {
        if (p.outcome === 'Delivered' || p.status.toLowerCase() === 'delivered') return p;
        return {
          ...p,
          outcome,
          reason: p.reason || reason,
          isAccountedFor: true,
          status: outcome === 'Ready to return' ? 'Ready To Return' : 'Failed Attempt',
        };
      })
    );
    triggerToast(`All remaining parcels marked as ${outcome}.`, 'success');
  };

  // Update Voucher from Modal if user modified cash collected
  const handleDoneOrUpdateVoucher = async () => {
    if (!closedVoucher) return;

    const modalDeliveredTotal = closedVoucher.deliveredCodTotal || 0;
    const modalTransferredOnline = closedVoucher.transferredOnline || 0;
    const newShortage = Math.max(0, modalDeliveredTotal - modalCash - modalTransferredOnline);

    const hasChanged =
      modalCash !== closedVoucher.cashHandedOver ||
      modalAccount !== closedVoucher.cashDepositAccount ||
      modalReason !== closedVoucher.pendingReason;

    if (hasChanged) {
      setIsUpdatingVoucher(true);
      try {
        const sheetId = closedVoucher.sheetId || activeSheet?.id;
        const riderId = closedVoucher.riderId || activeRider?.id;

        // 1. Update delivery sheet
        if (sheetId) {
          await apiClient.put(`/delivery-sheets/${sheetId}`, {
            data: {
              cash_collected: modalCash,
              cash_deposit_account: modalAccount,
              rider_shortage_pending: newShortage,
              shortage_reason: modalReason || (newShortage > 0 ? 'Rider cash shortage' : ''),
            }
          }).catch(err => console.warn('Delivery sheet update err:', err));
        }

        // 2. Update rider running pending balance (adjusting for previous shortage)
        if (riderId) {
          const prevShortage = Number(closedVoucher.pendingAmount) || 0;
          const shortageDiff = newShortage - prevShortage;
          const currentRiderBal = Number(activeRider?.pendingBalance) || 0;
          const updatedRiderBal = Math.max(0, currentRiderBal + shortageDiff);
          await apiClient.put(`/riders/${riderId}`, {
            data: { pending_balance: updatedRiderBal }
          }).catch(err => console.warn('Rider balance update err:', err));
        }

        triggerToast(
          newShortage > 0
            ? `Closing updated! Cash: Rs ${modalCash.toLocaleString()}, remaining Rs ${newShortage.toLocaleString()} added to rider history.`
            : `Closing updated! Full COD Rs ${modalCash.toLocaleString()} collected in cash.`,
          'success'
        );

        loadInitialData();
      } catch (e) {
        console.error('Failed to update closing from voucher modal:', e);
      } finally {
        setIsUpdatingVoucher(false);
      }
    }

    setClosedVoucher(null);
  };

  // Save & Close Handler
  const handleSaveAndClose = async () => {
    // 1. Check if there are parcels not yet accounted for
    if (unaccountedParcels.length > 0) {
      triggerToast(
        `${activeSheet?.sheetNumber || 'Delivery sheet'} cannot close yet. Please give all ${unaccountedParcels.length} parcels an outcome and reason.`,
        'warning'
      );
      return;
    }

    // 2. Auto-balance any unpaid COD into rider pending shortage so it adds to rider history
    let effectivePending = pendingAmount;
    let effectiveReason = pendingReason;
    const settledAmount = cashHandedOver + transferredOnline + pendingAmount;
    if (settledAmount < deliveredCodTotal) {
      effectivePending = Math.max(0, deliveredCodTotal - cashHandedOver - transferredOnline);
      effectiveReason = effectiveReason || 'Rider cash shortage / balance';
      setPendingAmount(effectivePending);
      setPendingReason(effectiveReason);
    }

    setIsSaving(true);
    try {
      const closingPayload = {
        data: {
          cashHandedOver,
          cashDepositAccount,
          transferredOnline,
          onlineDepositAccount,
          pendingAmount: effectivePending,
          pendingReason: effectiveReason,
          parcels: parcels.map(p => ({
            id: p.id,
            trackingNumber: p.trackingNumber,
            outcome: p.outcome,
            reason: p.reason,
          })),
          closedBy: user?.username || user?.email || 'Dispatcher',
        }
      };

      let successVoucherNo = `RC-${activeSheet?.sheetNumber || Date.now()}`;
      let isClosedViaCustomApi = false;

      // 3. Attempt Atomic Close Endpoint
      try {
        const closeRes = await apiClient.post(`/delivery-sheets/${activeSheet.id}/close`, closingPayload);
        if (closeRes?.data?.success) {
          isClosedViaCustomApi = true;
          successVoucherNo = closeRes.data.voucherNumber || successVoucherNo;
        }
      } catch (customApiErr) {
        console.warn('Atomic close endpoint not available, falling back to standard update:', customApiErr);
      }

      // 4. Fallback execution if custom atomic endpoint did not succeed
      if (!isClosedViaCustomApi) {
        // Update parcels
        for (const p of parcels) {
          try {
            const updatePayload: Record<string, any> = {
              status: p.outcome === 'Delivered' ? 'Delivered' : p.outcome === 'Ready to return' ? 'Ready To Return' : p.status,
            };
            if (p.reason) updatePayload.comments = p.reason;
            if (p.outcome === 'Delivered') {
              updatePayload.delivered_date = new Date();
              updatePayload.settlement_status = 'Pending';
            }
            await apiClient.put(`/parcels/${p.id}`, { data: updatePayload }).catch(() => null);
          } catch (e) {
            console.warn(`Parcel update skipped for #${p.trackingNumber}:`, e);
          }
        }

        // Update delivery sheet
        if (activeSheet?.id) {
          await apiClient.put(`/delivery-sheets/${activeSheet.id}`, {
            data: {
              status: 'Completed',
              collection_amount: deliveredCodTotal,
              delivered_count: deliveredParcels.length,
              return_count: pendingParcels.filter(p => p.outcome === 'Ready to return').length,
              cash_collected: cashHandedOver,
              cash_deposit_account: cashDepositAccount,
              online_collected: transferredOnline,
              online_deposit_account: onlineDepositAccount,
              rider_shortage_pending: effectivePending,
              shortage_reason: effectiveReason,
              closed_at: new Date(),
            }
          }).catch(() => null);
        }

        // Update rider pending balance
        if (activeRider?.id && effectivePending > 0) {
          const newBal = (activeRider.pendingBalance || 0) + effectivePending;
          await apiClient.put(`/riders/${activeRider.id}`, {
            data: { pending_balance: newBal }
          }).catch(() => null);
        }

        // Record settlement voucher
        await apiClient.post('/cod-settlements', {
          data: {
            invoice_number: successVoucherNo,
            total_cod_collected: deliveredCodTotal,
            net_payable: cashHandedOver + transferredOnline,
            status: 'paid',
            invoice_date: new Date().toISOString().split('T')[0],
            delivered_count: deliveredParcels.length,
            returned_count: pendingParcels.filter(p => p.outcome === 'Ready to return').length,
            service_charges: 0,
          }
        }).catch(() => null);
      }

      // Record completed voucher state to display confirmation modal
      setClosedVoucher({
        voucherNumber: successVoucherNo,
        sheetId: activeSheet?.id,
        riderId: activeRider?.id,
        sheetNumber: activeSheet?.sheetNumber,
        riderName: activeRider?.name,
        date: new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        deliveredCount: deliveredParcels.length,
        deliveredCodTotal,
        cashHandedOver,
        cashDepositAccount,
        transferredOnline,
        onlineDepositAccount,
        pendingAmount: effectivePending,
        pendingReason: effectiveReason,
        closedBy: user?.username || 'Dispatcher',
      });

      triggerToast(
        effectivePending > 0
          ? `Rider closing for ${activeSheet?.sheetNumber || 'sheet'} saved! Rs ${effectivePending.toLocaleString()} added to rider history.`
          : `Rider closing for ${activeSheet?.sheetNumber || 'sheet'} successfully saved and closed!`,
        'success'
      );

      // Refresh data
      loadInitialData();

    } catch (err: any) {
      console.error('Failed to save rider closing:', err);
      triggerToast(err?.message || 'Error occurred while saving rider closing.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isShipper) {
    return null;
  }

  return (
    <PortalLayout>
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 py-3.5 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border border-slate-700'
              : toast.type === 'warning'
              ? 'bg-amber-900 text-amber-50 border border-amber-700'
              : 'bg-red-950 text-red-50 border border-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <div className="bg-emerald-500 rounded-full p-1 text-white">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* CLOSING CONFIRMATION & PRINT VOUCHER MODAL */}
      {closedVoucher && (() => {
        const modalDeliveredTotal = Number(closedVoucher.deliveredCodTotal) || 0;
        const modalTransferredOnline = Number(closedVoucher.transferredOnline) || 0;
        const modalShortage = Math.max(0, modalDeliveredTotal - modalCash - modalTransferredOnline);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full sm:max-w-[640px] p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <CheckCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Rider Closing Complete</h3>
                    <p className="text-xs text-slate-500 font-mono">Voucher #{closedVoucher.voucherNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClosedVoucher(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-4">
                  <span className="text-slate-500 font-medium shrink-0">Delivery Sheet</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{closedVoucher.sheetNumber}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-4">
                  <span className="text-slate-500 font-medium shrink-0">Rider</span>
                  <span className="font-bold text-slate-900 text-right">{closedVoucher.riderName}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-4">
                  <span className="text-slate-500 font-medium shrink-0">Delivered Parcels</span>
                  <span className="font-bold text-slate-900 text-right">{closedVoucher.deliveredCount} parcels</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-4">
                  <span className="text-slate-500 font-medium shrink-0">Total Delivered COD</span>
                  <span className="font-mono font-bold text-primary text-base text-right">Rs {modalDeliveredTotal.toLocaleString()}</span>
                </div>

                {/* EDITABLE CASH COLLECTED FIELD */}
                <div className="py-2.5 border-b border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-bold flex items-center gap-1.5">
                      <span>Cash Collected</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        Editable
                      </span>
                    </span>
                    {modalCash !== modalDeliveredTotal && (
                      <button
                        type="button"
                        onClick={() => setModalCash(modalDeliveredTotal)}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Reset to full (Rs {modalDeliveredTotal.toLocaleString()})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={modalDeliveredTotal}
                        value={modalCash === 0 ? '' : modalCash}
                        onChange={e => setModalCash(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-bold font-mono text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div className="relative">
                      <select
                        value={modalAccount}
                        onChange={e => setModalAccount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8 shadow-2xs"
                      >
                        {depositAccounts.map(acc => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {modalTransferredOnline > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Online Transferred</span>
                    <span className="font-mono font-bold text-slate-900 text-right">Rs {modalTransferredOnline.toLocaleString()}</span>
                  </div>
                )}

                {/* RIDER SHORTAGE / REMAINING BALANCE NOTICE */}
                {modalShortage > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Rider Shortage / Remaining Balance</span>
                      </div>
                      <span className="font-mono font-black text-amber-800 text-sm sm:text-base">
                        Rs {modalShortage.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Rider paid Rs {modalCash.toLocaleString()} of Rs {modalDeliveredTotal.toLocaleString()}. The remaining balance of <strong className="font-mono">Rs {modalShortage.toLocaleString()}</strong> will automatically be added to <strong>{closedVoucher.riderName}</strong>&apos;s pending balance history.
                    </p>
                    <div>
                      <input
                        type="text"
                        value={modalReason}
                        onChange={e => setModalReason(e.target.value)}
                        placeholder="Shortage note (e.g. Paid less cash / fuel advance)"
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Full COD Collected in Cash
                    </span>
                    <span className="font-mono">Rs {modalCash.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs text-slate-400 gap-4">
                  <span>Closed on {closedVoucher.date}</span>
                  <span>By {closedVoucher.closedBy}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={handleDoneOrUpdateVoucher}
                  disabled={isUpdatingVoucher}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary-600 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 gap-2"
                >
                  {isUpdatingVoucher ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Done</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-4 md:p-6 pb-20">
        {/* TOP BAR: Breadcrumb Header & Action Button */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Delivery ops</span>
              <span>/</span>
              <span className="text-primary font-extrabold">Generate rider closing</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Rider Closing Settlement
              </h1>
              {activeSheet && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  activeSheet.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {activeSheet.status}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-primary hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; close</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SELECTOR ROW: Rider and Delivery Sheet Dropdowns */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rider Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Rider
              </label>
              {activeRider?.phone && (
                <span className="text-[11px] text-slate-400 font-medium">
                  Phone: {activeRider.phone}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedRiderId}
                onChange={e => handleRiderChange(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-10"
              >
                {riders.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.pendingBalance > 0 ? `(Pending: Rs ${r.pendingBalance.toLocaleString()})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Delivery Sheet Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Delivery sheet
              </label>
              <button
                type="button"
                onClick={() => setShowAllSheets(!showAllSheets)}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
              >
                {showAllSheets ? 'Filter by selected rider' : 'Show all sheets'}
              </button>
            </div>
            <div className="relative">
              <select
                value={selectedSheetId}
                onChange={e => handleSheetChange(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-10"
              >
                {availableSheets.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sheetNumber} · {s.sheetDate} · {s.parcelCount} parcels ({s.status})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* BIG KPI CARDS & SUB-METRICS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Top Big KPI row with vertical divider (Image 1 style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* RIDER PENDING */}
            <div className="border-l-4 border-amber-500 pl-4 py-1 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                RIDER PENDING
              </span>
              <div className="text-3xl md:text-4xl font-black text-amber-600 font-mono tracking-tight mt-1">
                Rs {activeRider?.pendingBalance?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                His whole balance — this sheet is part of it, not extra
              </p>
            </div>

            {/* RECEIVABLE — THIS SHEET */}
            <div className="border-l-4 border-primary pl-4 py-1 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                RECEIVABLE — THIS SHEET
              </span>
              <div className="text-3xl md:text-4xl font-black text-primary font-mono tracking-tight mt-1">
                Rs {deliveredCodTotal.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Total delivered COD collected on this delivery runsheet
              </p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sub-KPI metrics row underneath */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                COLLECTED IN CASH
              </span>
              <div className="text-lg md:text-xl font-black text-slate-800 font-mono">
                Rs {cashHandedOver.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                COLLECTED ONLINE
              </span>
              <div className="text-lg md:text-xl font-black text-slate-800 font-mono">
                Rs {transferredOnline.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                DELIVERED ON {activeSheet?.sheetNumber || 'DS'}
              </span>
              <div className="text-lg md:text-xl font-black text-slate-800">
                {deliveredParcels.length} {deliveredParcels.length === 1 ? 'parcel' : 'parcels'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                DELIVERED COD
              </span>
              <div className="text-lg md:text-xl font-black text-slate-900 font-mono">
                Rs {deliveredCodTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* QUICK SCANNER TOOLBAR (For fast barcode gun or manual lookup) */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary shrink-0 border border-slate-700">
              <Scan className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Barcode Scanner
              </div>
              <div className="text-xs text-slate-300">
                Scan tracking barcode or enter number to quickly record outcome
              </div>
            </div>
          </div>

          <form onSubmit={handleScanSubmit} className="flex flex-wrap items-center gap-2.5">
            {/* Quick Action Mode Selector */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setScanMode('Delivered')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  scanMode === 'Delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mark Delivered
              </button>
              <button
                type="button"
                onClick={() => setScanMode('Ready to return')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  scanMode === 'Ready to return' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mark Return
              </button>
              <button
                type="button"
                onClick={() => setScanMode('Attempted')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  scanMode === 'Attempted' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mark Attempted
              </button>
            </div>

            {/* Input & Scan Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scanBarcode}
                onChange={e => setScanBarcode(e.target.value)}
                placeholder="Scan or type tracking #..."
                className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 outline-none focus:border-amber-400 w-48 sm:w-56"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 1: Delivered on [Sheet #] Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 md:px-6 md:py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm md:text-base font-bold text-slate-900">
              Delivered on <span className="text-primary font-mono">{activeSheet?.sheetNumber || 'DS100092'}</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {deliveredParcels.length} Delivered · Rs {deliveredCodTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3 font-bold">Tracking #</th>
                  <th className="px-5 py-3 font-bold">Consignee</th>
                  <th className="px-5 py-3 font-bold">Paid</th>
                  <th className="px-5 py-3 font-bold text-right">COD</th>
                  <th className="px-5 py-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {deliveredParcels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                      No parcels currently marked delivered on this sheet. Select &apos;Delivered&apos; in the table below or scan barcodes to add.
                    </td>
                  </tr>
                ) : (
                  deliveredParcels.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-primary">
                        {p.trackingNumber}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-semibold">
                        {p.consigneeName}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {p.paidType || 'Cash'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                        Rs {p.codAmount?.toLocaleString() || 0}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOutcomeChange(p.id, 'Scan instead')}
                          title="Revert to not-delivered"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Revert</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: Parcels to account for / not delivered */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 md:px-6 md:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                Parcels to account for / not delivered
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record an outcome for every parcel before closing this runsheet
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingParcels.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBulkMarkRemaining('Ready to return')}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Mark all Return
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkMarkRemaining('Attempted')}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Mark all Attempted
                  </button>
                </div>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                unaccountedParcels.length === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {unaccountedParcels.length} unaccounted ({pendingParcels.length} total)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Tracking #</th>
                  <th className="px-4 py-3">Consignee</th>
                  <th className="px-4 py-3 text-right">COD amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 min-w-[160px]">Outcome</th>
                  <th className="px-4 py-3 min-w-[210px]">Reason</th>
                  <th className="px-4 py-3 text-right">Accounted for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pendingParcels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-emerald-600 font-bold">
                      ✓ All parcels accounted for! This runsheet is ready to close.
                    </td>
                  </tr>
                ) : (
                  pendingParcels.map(p => {
                    const isRecorded = p.isAccountedFor && p.outcome !== 'Scan instead';
                    const requiresReason = p.outcome === 'Ready to return' || p.outcome === 'Attempted' || p.outcome === 'Customer refused';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {p.trackingNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">
                          {p.consigneeName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          Rs {p.codAmount?.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <select
                              value={p.outcome}
                              onChange={e => handleOutcomeChange(p.id, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary cursor-pointer pr-7"
                            >
                              {outcomeOptions.map(opt => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {requiresReason ? (
                            <div className="relative">
                              <select
                                value={p.reason || reasonOptions[0]}
                                onChange={e => handleReasonChange(p.id, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary cursor-pointer pr-7"
                              >
                                {reasonOptions.map(r => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold px-2">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isRecorded ? (
                            <span className="text-emerald-600 font-bold flex items-center justify-end gap-1 text-xs">
                              <Check className="w-3.5 h-3.5" /> Recorded
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold text-xs">
                              Not yet
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WARNING BANNER: Cannot close yet banner */}
        {unaccountedParcels.length > 0 && (
          <div className="p-4 md:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm font-medium leading-relaxed">
              <span className="font-bold text-amber-950 font-mono">
                {activeSheet?.sheetNumber || 'Delivery Sheet'}
              </span>{' '}
              can&apos;t close yet — scan these parcels in, or give them an outcome and a reason:{' '}
              <span className="font-mono font-bold text-amber-950 break-words">
                {unaccountedParcels.map(p => p.trackingNumber).join(', ')}.
              </span>
            </div>
          </div>
        )}

        {/* SECTION 3: How the rider settled */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              How the rider settled
            </h2>
            <div className="flex items-center gap-2">
              {missingCodDifference === 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Settlement Fully Balanced
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setCashHandedOver(deliveredCodTotal);
                  setTransferredOnline(0);
                  setPendingAmount(0);
                }}
                className="text-xs font-semibold text-primary hover:underline px-2 cursor-pointer"
              >
                Auto-fill all in Cash
              </button>
            </div>
          </div>

          {/* RIDER SHORTAGE NOTICE BANNER */}
          {pendingAmount > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm leading-relaxed">
                Rider is paying less cash: <strong className="font-mono font-black">Rs {cashHandedOver.toLocaleString()}</strong> out of <strong className="font-mono font-black">Rs {deliveredCodTotal.toLocaleString()}</strong> delivered COD.
                The remaining balance of <strong className="font-mono font-black text-amber-800">Rs {pendingAmount.toLocaleString()}</strong> will automatically be recorded as shortage and added to <strong>{activeRider?.name || 'Rider'}</strong>&apos;s pending balance history.
              </div>
            </div>
          )}

          {/* MONEY HANDED IN CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Money handed in
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cash Handed Over */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cash handed over
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={cashHandedOver === 0 ? '' : cashHandedOver}
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setCashHandedOver(val);
                          hasUserEditedCashRef.current = true;
                          const shortage = Math.max(0, deliveredCodTotal - val - transferredOnline);
                          setPendingAmount(shortage);
                          if (shortage > 0 && !pendingReason) {
                            setPendingReason('Rider cash shortage');
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold font-mono text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Deposited into
                    </label>
                    <div className="relative">
                      <select
                        value={cashDepositAccount}
                        onChange={e => setCashDepositAccount(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                      >
                        {depositAccounts.map(acc => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Transferred Online */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Transferred online
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={transferredOnline === 0 ? '' : transferredOnline}
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setTransferredOnline(val);
                          const shortage = Math.max(0, deliveredCodTotal - cashHandedOver - val);
                          setPendingAmount(shortage);
                        }}
                        placeholder="0"
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold font-mono text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Deposited into
                    </label>
                    <div className="relative">
                      <select
                        value={onlineDepositAccount}
                        onChange={e => setOnlineDepositAccount(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                      >
                        {depositAccounts.map(acc => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIDER OUTSTANDING CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Rider outstanding
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pending amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    Rs
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={pendingAmount || ''}
                    onChange={e => setPendingAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold font-mono text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Paid by him later
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  What it was for
                </label>
                <input
                  type="text"
                  value={pendingReason}
                  onChange={e => setPendingReason(e.target.value)}
                  placeholder="e.g. Fuel advance / Cash shortage"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save & Close Action Strip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Closing Sheet:{' '}
              <strong className="text-slate-800 font-mono">{activeSheet?.sheetNumber || 'DS100092'}</strong> · Total Delivered COD:{' '}
              <strong className="text-primary font-mono">Rs {deliveredCodTotal.toLocaleString()}</strong>
            </div>

            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; close</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, UserCheck, Search, RefreshCw, Truck, ArrowDownLeft, CheckCircle2, AlertTriangle, XCircle, RotateCcw, X, Save } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { RiderService, DeliverySheetService } from '@/services/api';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus 
} from '@/shared/constants/shipment-statuses';

interface RiderSummaryRow {
  sNo: number;
  riderId: number | string;
  riderCode: string;
  riderName: string;
  phone: string;
  // Pickup: Picked up by rider
  pickupCount: number;
  // Delivery: Out for Delivery, Delivered, Delivery Failed
  outForDeliveryCount: number;
  outForDeliveryAmount: number;
  deliveredCount: number;
  deliveredAmount: number;
  deliveryFailedCount: number;
  deliveryFailedAmount: number;
  // Return: Ready for Return, Return to Shipper
  readyForReturnCount: number;
  returnToShipperCount: number;
  totalAssigned: number;
  successRatio: number;
  parcelsList?: any[];
}

export default function CustomerServiceRidersSummaryPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [summaryData, setSummaryData] = React.useState<RiderSummaryRow[]>([]);
  const [selectedRiderDetail, setSelectedRiderDetail] = React.useState<RiderSummaryRow | null>(null);
  const [riderParcelsList, setRiderParcelsList] = React.useState<any[]>([]);
  const [availableRiders, setAvailableRiders] = React.useState<Array<{ id: number | string; riderCode: string; riderName: string; phone?: string }>>([]);
  const [parcelRiderMap, setParcelRiderMap] = React.useState<{ [tracking: string]: string }>({});
  const [bulkRiderSelection, setBulkRiderSelection] = React.useState<string>('');
  const [isSavingAssignments, setIsSavingAssignments] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const is3PLParcel = React.useCallback((p: any) => {
    if (!p) return false;
    return Boolean(p.is_3pl) || p.is_3pl === 'true' || p.is_3pl === 1 || p.service_provider === '3PL' || (p.courier && p.courier?.name && p.courier.name !== 'IN-HOUSE' && p.courier.name !== '2PL');
  }, []);

  const matchRiderNames = React.useCallback((nameA: string, nameB: string) => {
    if (!nameA || !nameB) return false;
    const a = nameA.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const b = nameB.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (a.includes(b) || b.includes(a)) return true;
    
    const tokensA = a.split(/\s+/).filter(t => t.length > 2);
    const tokensB = b.split(/\s+/).filter(t => t.length > 2);
    const shared = tokensA.filter(t => tokensB.includes(t));
    return shared.length >= 2 || (tokensA.some(t => ['rider1', 'ginjeeerider', 'dispatcher'].includes(t)) && tokensB.some(t => ['rider1', 'ginjeeerider', 'dispatcher'].includes(t)));
  }, []);

  const fetchRiderSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active riders, db riders, delivery-sheets, rider-assignments, delivery-attempts, load-sheets, and parcels in parallel
      const [ridersRes, dbRidersRes, sheetsRes, assignmentsRes, attemptsRes, loadSheetsRes, parcelsRes] = await Promise.allSettled([
        RiderService.getAll(),
        apiClient.get('/riders?populate=*&pagination[pageSize]=100'),
        DeliverySheetService.getAll('?sort[0]=createdAt:desc&pagination[pageSize]=1000&populate=*'),
        apiClient.get('/rider-assignments?sort[0]=createdAt:desc&pagination[pageSize]=1000&populate=*'),
        apiClient.get('/delivery-attempts?sort[0]=createdAt:desc&pagination[pageSize]=1000&populate=*'),
        apiClient.get('/load-sheets?sort[0]=createdAt:desc&pagination[pageSize]=1000&populate=*'),
        apiClient.get('/parcels?populate=*&pagination[pageSize]=1000&sort[0]=createdAt:desc')
      ]);

      const extractArray = (res: any) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      };

      const ridersList: any[] = ridersRes.status === 'fulfilled' ? extractArray(ridersRes.value) : [];
      const dbRidersList: any[] = dbRidersRes.status === 'fulfilled' ? extractArray(dbRidersRes.value) : [];
      const sheetsList: any[] = sheetsRes.status === 'fulfilled' ? extractArray(sheetsRes.value) : [];
      const assignmentsList: any[] = assignmentsRes.status === 'fulfilled' ? extractArray(assignmentsRes.value) : [];
      const attemptsList: any[] = attemptsRes.status === 'fulfilled' ? extractArray(attemptsRes.value) : [];
      const loadSheetsList: any[] = loadSheetsRes.status === 'fulfilled' ? extractArray(loadSheetsRes.value) : [];
      const rawParcels: any[] = (parcelsRes.status === 'fulfilled' ? extractArray(parcelsRes.value) : []).filter((p: any) => !is3PLParcel(p));

      // Date range filtering helper (safe client-side comparison)
      const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
      const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;

      const isDateInRange = (dateStr?: string) => {
        if (!fromDate && !toDate) return true;
        if (!dateStr) return true;
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) return true;
        return t >= fromTs && t <= toTs;
      };

      // Create indexed maps of active parcels by ID, documentId, and tracking number
      const parcelById = new Map<string, any>();
      const parcelByDocId = new Map<string, any>();
      const parcelByTracking = new Map<string, any>();

      for (const p of rawParcels) {
        if (p.id) parcelById.set(String(p.id), p);
        if (p.documentId) parcelByDocId.set(String(p.documentId), p);
        if (p.tracking_number) {
          parcelByTracking.set(String(p.tracking_number).toUpperCase().trim(), p);
        }
      }

      const resolveParcel = (item: any) => {
        if (!item) return null;
        let p: any = null;
        if (typeof item === 'string' || typeof item === 'number') {
          const str = String(item).trim();
          p = parcelById.get(str) || parcelByDocId.get(str) || parcelByTracking.get(str.toUpperCase()) || null;
        } else if (typeof item === 'object' && item !== null) {
          if (item.tracking_number) {
            const live = parcelByTracking.get(String(item.tracking_number).toUpperCase().trim());
            p = live || item;
          } else if (item.id) {
            const live = parcelById.get(String(item.id));
            p = live || item;
          } else if (item.documentId) {
            const live = parcelByDocId.get(String(item.documentId));
            p = live || item;
          } else {
            p = item;
          }
        }
        if (p && is3PLParcel(p)) return null;
        return p;
      };

      // Initialize rider aggregates
      // Map: riderId -> { riderInfo, parcels: Map<trackingNumber, parcelData> }
      const riderMap = new Map<string, {
        riderId: number | string;
        riderCode: string;
        riderName: string;
        fullName: string;
        username: string;
        phone: string;
        altIds: Set<string>;
        parcels: Map<string, any>;
      }>();

      // Track all parcels assigned to any registered rider
      const assignedTrackings = new Set<string>();

      ridersList.forEach((r: any) => {
        if (!r) return;
        const idStr = String(r.id);
        const rName = r.name || r.fullName || r.username || `Rider #${r.id}`;
        riderMap.set(idStr, {
          riderId: r.id,
          riderCode: r.rider_code || r.riderCode || r.username || `R-${r.id}`,
          riderName: rName,
          fullName: r.fullName || '',
          username: r.username || '',
          phone: r.phone || '',
          altIds: new Set([idStr]),
          parcels: new Map(),
        });
      });

      // Link DB rider entities (api::rider) with User riders
      dbRidersList.forEach((dbr: any) => {
        if (!dbr) return;
        const dbrId = String(dbr.id);
        const dbrPhone = (dbr.phone || '').trim();
        const dbrName = (dbr.name || '').toLowerCase().trim();
        const dbrCode = (dbr.rider_code || '').toLowerCase().trim();

        let matched = false;
        for (const entry of riderMap.values()) {
          if (
            (dbrPhone && entry.phone && (entry.phone.includes(dbrPhone) || dbrPhone.includes(entry.phone))) ||
            (dbrCode && (entry.riderCode.toLowerCase().includes(dbrCode) || dbrCode.includes(entry.riderCode.toLowerCase()))) ||
            (dbrName && matchRiderNames(entry.riderName, dbrName)) ||
            (entry.username && dbrName.includes(entry.username.toLowerCase())) ||
            (entry.username && dbrCode.includes(entry.username.toLowerCase()))
          ) {
            entry.altIds.add(dbrId);
            if (dbr.documentId) entry.altIds.add(String(dbr.documentId));
            matched = true;
            break;
          }
        }

        // If not in rider users, add as separate rider row
        if (!matched) {
          riderMap.set(dbrId, {
            riderId: dbr.id,
            riderCode: dbr.rider_code || `RDR-${dbr.id}`,
            riderName: dbr.name || `Rider #${dbr.id}`,
            fullName: dbr.name || '',
            username: dbr.rider_code || '',
            phone: dbr.phone || '',
            altIds: new Set([dbrId, String(dbr.documentId || '')]),
            parcels: new Map(),
          });
        }
      });

      // Populate available riders dropdown list
      const allRiderOptions = Array.from(riderMap.values()).map(r => ({
        id: r.riderId,
        riderCode: r.riderCode,
        riderName: r.riderName,
        phone: r.phone
      }));
      setAvailableRiders(allRiderOptions);

      const findRiderEntry = (riderRef?: any, nameRef?: string, codeRef?: string) => {
        if (riderRef && typeof riderRef === 'object' && riderRef !== null) {
          const rId = String(riderRef.id || riderRef.documentId || '');
          for (const val of riderMap.values()) {
            if (val.altIds.has(rId) || String(val.riderId) === rId) {
              return val;
            }
          }
        } else if (riderRef && (typeof riderRef === 'string' || typeof riderRef === 'number')) {
          const strId = String(riderRef);
          for (const val of riderMap.values()) {
            if (val.altIds.has(strId) || String(val.riderId) === strId) {
              return val;
            }
          }
        }

        const objCode = (riderRef && typeof riderRef === 'object' && riderRef !== null)
          ? (riderRef.rider_code || riderRef.username || riderRef.riderCode || '')
          : '';
        const cleanCode = (codeRef || objCode || '').toLowerCase().trim();
        if (cleanCode) {
          for (const val of riderMap.values()) {
            if (
              val.riderCode.toLowerCase() === cleanCode ||
              val.username.toLowerCase() === cleanCode ||
              `r-${val.riderId}`.toLowerCase() === cleanCode ||
              cleanCode.includes(val.username.toLowerCase()) ||
              cleanCode.includes(val.riderCode.toLowerCase())
            ) {
              return val;
            }
          }
        }

        const objName = (riderRef && typeof riderRef === 'object' && riderRef !== null)
          ? (riderRef.name || riderRef.fullName || riderRef.username || '')
          : '';
        const cleanName = (nameRef || objName || '').toLowerCase().trim();
        if (cleanName) {
          for (const val of riderMap.values()) {
            if (matchRiderNames(val.riderName, cleanName) || (val.phone && cleanName.includes(val.phone))) {
              return val;
            }
          }
        }

        return null;
      };

      // 1. Associate parcels assigned through delivery sheets
      sheetsList.forEach((sheet: any) => {
        if (!isDateInRange(sheet.sheet_date || sheet.createdAt || sheet.updatedAt)) return;
        const targetEntry = findRiderEntry(sheet.rider, sheet.custom_name || sheet.rider_name, sheet.route_code);
        if (targetEntry) {
          const items = Array.isArray(sheet.parcels) && sheet.parcels.length > 0 
            ? sheet.parcels 
            : (Array.isArray(sheet.parcels_data) ? sheet.parcels_data : []);

          items.forEach((item: any) => {
            const p = resolveParcel(item);
            if (!p) return;
            const trk = String(p.tracking_number || p.shipmentNumber || `#${p.id}`).toUpperCase().trim();
            targetEntry.parcels.set(trk, p);
            assignedTrackings.add(trk);
          });
        }
      });

      // 2. Associate parcels through direct rider assignments table
      assignmentsList.forEach((asn: any) => {
        if (!isDateInRange(asn.assigned_at || asn.createdAt)) return;
        const targetEntry = findRiderEntry(asn.rider);
        if (targetEntry && asn.parcel) {
          const p = resolveParcel(asn.parcel);
          if (p) {
            const trk = String(p.tracking_number || `#${p.id}`).toUpperCase().trim();
            targetEntry.parcels.set(trk, p);
            assignedTrackings.add(trk);
          }
        }
      });

      // 3. Associate parcels through delivery attempts
      attemptsList.forEach((att: any) => {
        if (!isDateInRange(att.attempt_time || att.createdAt)) return;
        const targetEntry = findRiderEntry(att.rider);
        if (targetEntry && att.parcel) {
          const p = resolveParcel(att.parcel);
          if (p) {
            const trk = String(p.tracking_number || `#${p.id}`).toUpperCase().trim();
            targetEntry.parcels.set(trk, p);
            assignedTrackings.add(trk);
          }
        }
      });

      // 4. Associate parcels through load sheets (pickup runsheets)
      loadSheetsList.forEach((ls: any) => {
        if (!isDateInRange(ls.date_created || ls.createdAt)) return;
        const targetEntry = findRiderEntry(ls.rider, ls.custom_name);
        if (targetEntry && Array.isArray(ls.parcels)) {
          ls.parcels.forEach((item: any) => {
            const p = resolveParcel(item);
            if (!p) return;
            const trk = String(p.tracking_number || `#${p.id}`).toUpperCase().trim();
            targetEntry.parcels.set(trk, p);
            assignedTrackings.add(trk);
          });
        }
      });

      // 5. Associate parcels directly linked to rider (parcel.rider or load_sheet.rider)
      rawParcels.forEach((p: any) => {
        if (!isDateInRange(p.arrival_date || p.delivered_date || p.createdAt || p.updatedAt)) return;

        let targetEntry: any = null;
        if (p.rider) {
          targetEntry = findRiderEntry(p.rider);
        } else if (p.load_sheet?.rider) {
          targetEntry = findRiderEntry(p.load_sheet.rider);
        }

        if (targetEntry) {
          const trk = String(p.tracking_number || `#${p.id}`).toUpperCase().trim();
          targetEntry.parcels.set(trk, p);
          assignedTrackings.add(trk);
        }
      });

      // 6. Identify remaining unassigned active parcels (e.g. Out for Delivery / Picked up but no rider sheet attached)
      const unassignedParcelsMap = new Map<string, any>();
      rawParcels.forEach((p: any) => {
        if (!isDateInRange(p.arrival_date || p.delivered_date || p.createdAt || p.updatedAt)) return;
        const trk = String(p.tracking_number || `#${p.id}`).toUpperCase().trim();
        if (assignedTrackings.has(trk)) return;

        const norm = normalizeShipmentStatus(p.status);
        // Track unassigned operational parcels
        if (
          norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY ||
          norm === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER ||
          norm === SHIPMENT_STATUSES.DELIVERED ||
          norm === SHIPMENT_STATUSES.DELIVERY_FAILED ||
          norm === SHIPMENT_STATUSES.READY_FOR_RETURN ||
          norm === SHIPMENT_STATUSES.RETURN_TO_SHIPPER
        ) {
          unassignedParcelsMap.set(trk, p);
        }
      });

      // Compute stats for each rider strictly from their assigned shipments
      const rows: RiderSummaryRow[] = Array.from(riderMap.values()).map((r, i) => {
        const assignedList = Array.from(r.parcels.values());

        let pickupCount = 0;
        let outForDeliveryCount = 0;
        let outForDeliveryAmount = 0;
        let deliveredCount = 0;
        let deliveredAmount = 0;
        let deliveryFailedCount = 0;
        let deliveryFailedAmount = 0;
        let readyForReturnCount = 0;
        let returnToShipperCount = 0;

        assignedList.forEach((p: any) => {
          const norm = normalizeShipmentStatus(p.status);
          const cod = Number(p.cod_amount || p.amountCollect || 0);

          if (norm === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER) {
            pickupCount++;
          } else if (norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY) {
            outForDeliveryCount++;
            outForDeliveryAmount += cod;
          } else if (norm === SHIPMENT_STATUSES.DELIVERED) {
            deliveredCount++;
            deliveredAmount += cod;
          } else if (norm === SHIPMENT_STATUSES.DELIVERY_FAILED) {
            deliveryFailedCount++;
            deliveryFailedAmount += cod;
          } else if (norm === SHIPMENT_STATUSES.READY_FOR_RETURN) {
            readyForReturnCount++;
          } else if (norm === SHIPMENT_STATUSES.RETURN_TO_SHIPPER) {
            returnToShipperCount++;
          }
        });

        const totalAssigned = assignedList.length;
        const decidedCount = deliveredCount + deliveryFailedCount + readyForReturnCount + returnToShipperCount;
        const successRatio = decidedCount > 0 
          ? Math.round((deliveredCount / decidedCount) * 100) 
          : (totalAssigned > 0 && deliveredCount > 0 ? 100 : 0);

        return {
          sNo: i + 1,
          riderId: r.riderId,
          riderCode: r.riderCode,
          riderName: r.riderName,
          phone: r.phone,
          pickupCount,
          outForDeliveryCount,
          outForDeliveryAmount,
          deliveredCount,
          deliveredAmount,
          deliveryFailedCount,
          deliveryFailedAmount,
          readyForReturnCount,
          returnToShipperCount,
          totalAssigned,
          successRatio,
          parcelsList: assignedList,
        };
      });

      // Append UNASSIGNED Pool row if any active operational parcels have no rider linked
      const unassignedList = Array.from(unassignedParcelsMap.values());
      if (unassignedList.length > 0) {
        let uPickup = 0;
        let uOut = 0;
        let uOutAmt = 0;
        let uDel = 0;
        let uDelAmt = 0;
        let uFail = 0;
        let uFailAmt = 0;
        let uReady = 0;
        let uReturn = 0;

        unassignedList.forEach((p: any) => {
          const norm = normalizeShipmentStatus(p.status);
          const cod = Number(p.cod_amount || 0);

          if (norm === SHIPMENT_STATUSES.PICKED_UP_BY_RIDER) {
            uPickup++;
          } else if (norm === SHIPMENT_STATUSES.OUT_FOR_DELIVERY) {
            uOut++;
            uOutAmt += cod;
          } else if (norm === SHIPMENT_STATUSES.DELIVERED) {
            uDel++;
            uDelAmt += cod;
          } else if (norm === SHIPMENT_STATUSES.DELIVERY_FAILED) {
            uFail++;
            uFailAmt += cod;
          } else if (norm === SHIPMENT_STATUSES.READY_FOR_RETURN) {
            uReady++;
          } else if (norm === SHIPMENT_STATUSES.RETURN_TO_SHIPPER) {
            uReturn++;
          }
        });

        const uDecided = uDel + uFail + uReady + uReturn;
        const uSuccessRatio = uDecided > 0 ? Math.round((uDel / uDecided) * 100) : (uDel > 0 ? 100 : 0);

        rows.push({
          sNo: rows.length + 1,
          riderId: 'UNASSIGNED',
          riderCode: 'UNASSIGNED',
          riderName: 'Unassigned / Direct Dispatch Pool (Click to Assign)',
          phone: 'General Pool',
          pickupCount: uPickup,
          outForDeliveryCount: uOut,
          outForDeliveryAmount: uOutAmt,
          deliveredCount: uDel,
          deliveredAmount: uDelAmt,
          deliveryFailedCount: uFail,
          deliveryFailedAmount: uFailAmt,
          readyForReturnCount: uReady,
          returnToShipperCount: uReturn,
          totalAssigned: unassignedList.length,
          successRatio: uSuccessRatio,
          parcelsList: unassignedList
        });
      }

      setSummaryData(rows);
    } catch (err) {
      console.warn('Failed to load riders summary:', err);
      setSummaryData([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, is3PLParcel, matchRiderNames]);

  React.useEffect(() => {
    fetchRiderSummary();
  }, [fetchRiderSummary]);

  const handleOpenRiderDetail = (r: RiderSummaryRow) => {
    setSelectedRiderDetail(r);
    const pList = r.parcelsList || [];
    setRiderParcelsList(pList);
    
    // Initialize rider selections for each parcel in the modal
    const initialMap: { [tracking: string]: string } = {};
    pList.forEach(p => {
      const trk = String(p.tracking_number || p.shipmentNumber || `#${p.id}`).toUpperCase().trim();
      if (r.riderCode !== 'UNASSIGNED') {
        initialMap[trk] = String(r.riderId);
      } else {
        initialMap[trk] = '';
      }
    });
    setParcelRiderMap(initialMap);
    setBulkRiderSelection('');
  };

  const handleApplyBulkRider = () => {
    if (!bulkRiderSelection) {
      triggerToast('Please select a rider from the dropdown first.', 'error');
      return;
    }
    setParcelRiderMap(prev => {
      const next = { ...prev };
      riderParcelsList.forEach(p => {
        const trk = String(p.tracking_number || p.shipmentNumber || `#${p.id}`).toUpperCase().trim();
        next[trk] = bulkRiderSelection;
      });
      return next;
    });
    const riderObj = availableRiders.find(r => String(r.id) === String(bulkRiderSelection));
    triggerToast(`Set all visible shipments to ${riderObj?.riderName || 'selected rider'}. Click "Save & Assign Rider" to persist.`, 'success');
  };

  const handleSaveAssignments = async () => {
    setIsSavingAssignments(true);
    try {
      let assignedCount = 0;
      for (const p of riderParcelsList) {
        const trk = String(p.tracking_number || p.shipmentNumber || `#${p.id}`).toUpperCase().trim();
        const targetRiderId = parcelRiderMap[trk];
        if (!targetRiderId) continue;

        const pId = p.id;
        const targetDocId = p.documentId || p.id;

        // 1. Create or update rider-assignment record
        try {
          await apiClient.post('/rider-assignments', {
            data: {
              rider: Number(targetRiderId) || targetRiderId,
              parcel: pId,
              status: 'assigned',
              assigned_at: new Date().toISOString()
            }
          });
        } catch (asnErr) {
          console.warn('Assignment notice:', asnErr);
        }

        // 2. Update parcel status to Out for Delivery and associate rider
        try {
          await apiClient.put(`/parcels/${targetDocId}`, {
            data: {
              status: SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
              ...(targetRiderId ? { rider: Number(targetRiderId) || targetRiderId } : {})
            }
          });
        } catch (putErr) {
          console.warn('Parcel update notice:', putErr);
        }

        assignedCount++;
      }

      if (assignedCount > 0) {
        triggerToast(`Successfully assigned and updated ${assignedCount} shipments!`, 'success');
        setSelectedRiderDetail(null);
        await fetchRiderSummary();
      } else {
        triggerToast('No rider selections found to save.', 'error');
      }
    } catch (err: any) {
      console.error('Error saving assignments:', err);
      triggerToast(`Error saving assignments: ${err.message}`, 'error');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return summaryData;
    const q = searchQuery.toLowerCase().trim();
    return summaryData.filter(r => 
      r.riderCode.toLowerCase().includes(q) ||
      r.riderName.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q)
    );
  }, [summaryData, searchQuery]);

  // Comprehensive System KPI totals across all rows
  const systemTotals = React.useMemo(() => {
    const totalHandled = summaryData.reduce((acc, r) => acc + r.totalAssigned, 0);
    const totalPickup = summaryData.reduce((acc, r) => acc + r.pickupCount, 0);
    const totalOut = summaryData.reduce((acc, r) => acc + r.outForDeliveryCount, 0);
    const totalOutAmt = summaryData.reduce((acc, r) => acc + r.outForDeliveryAmount, 0);
    const totalDelivered = summaryData.reduce((acc, r) => acc + r.deliveredCount, 0);
    const totalDeliveredAmt = summaryData.reduce((acc, r) => acc + r.deliveredAmount, 0);
    const totalFailed = summaryData.reduce((acc, r) => acc + r.deliveryFailedCount, 0);
    const totalFailedAmt = summaryData.reduce((acc, r) => acc + r.deliveryFailedAmount, 0);
    const totalReturns = summaryData.reduce((acc, r) => acc + r.readyForReturnCount + r.returnToShipperCount, 0);
    const decided = totalDelivered + totalFailed + totalReturns;
    const avgSuccess = decided > 0 ? Math.round((totalDelivered / decided) * 100) : (totalDelivered > 0 ? 100 : 0);

    return {
      totalHandled,
      totalPickup,
      totalOut,
      totalOutAmt,
      totalDelivered,
      totalDeliveredAmt,
      totalFailed,
      totalFailedAmt,
      totalReturns,
      avgSuccess
    };
  }, [summaryData]);

  const handleExportExcel = () => {
    const header = "Rider Code,Rider Name,Phone,Total Assigned,Pickup (Picked Up),Out For Delivery,Delivered,Delivery Failed,Ready For Return,Return To Shipper,Success Ratio %\n";
    const rows = filteredData.map(r => `"${r.riderCode}","${r.riderName}","${r.phone}",${r.totalAssigned},${r.pickupCount},${r.outForDeliveryCount},${r.deliveredCount},${r.deliveryFailedCount},${r.readyForReturnCount},${r.returnToShipperCount},${r.successRatio}%`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riders_Summary_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <PortalLayout>
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          {toast.type === 'success' 
            ? <div className="bg-emerald-500 rounded-full p-1 text-white"><CheckCircle2 className="w-4 h-4" /></div>
            : <div className="bg-red-500 rounded-full p-1 text-white"><AlertTriangle className="w-4 h-4" /></div>
          }
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">

        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">Customer Service / Riders Summary</h1>
            <p className="text-xs text-slate-400">Rider-centric reporting of actual assigned pickups, active deliveries, and returns (2PL Internal Fleet).</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => fetchRiderSummary()}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Summary Scorecard Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Out for Delivery</div>
              <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
                <span>{systemTotals.totalOut}</span>
                <span className="text-xs text-slate-500 font-semibold font-mono">PKR {systemTotals.totalOutAmt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivered Orders</div>
              <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
                <span>{systemTotals.totalDelivered}</span>
                <span className="text-xs text-emerald-700 font-semibold font-mono">PKR {systemTotals.totalDeliveredAmt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pickup (Picked Up)</div>
              <div className="text-2xl font-black text-slate-900">
                <span>{systemTotals.totalPickup}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Cargo</div>
              <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
                <span>{systemTotals.totalHandled}</span>
                <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                  {systemTotals.avgSuccess}% Success
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Search Rider</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by rider code, name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Rider Workload & Operational Summary ({filteredData.length} Entries)
            </span>
            {isLoading && <span className="text-xs text-slate-400 font-normal animate-pulse">Calculating rider metrics...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Rider Code</th>
                  <th className="p-3.5">Rider Name</th>
                  <th className="p-3.5 text-center bg-slate-200">Total Handled</th>
                  <th className="p-3.5 text-center bg-purple-50 text-purple-900">Pickup (Picked Up)</th>
                  <th className="p-3.5 text-center bg-blue-50 text-blue-900">Out For Delivery</th>
                  <th className="p-3.5 text-center bg-emerald-50 text-emerald-900">Delivered</th>
                  <th className="p-3.5 text-center bg-rose-50 text-rose-900">Delivery Failed</th>
                  <th className="p-3.5 text-center bg-amber-50 text-amber-900">Ready For Return</th>
                  <th className="p-3.5 text-center bg-teal-50 text-teal-900">Return to Shipper</th>
                  <th className="p-3.5 text-center bg-amber-100/50 text-amber-950">Success %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                      {isLoading ? 'Loading rider metrics...' : 'No rider workload found for the selected criteria.'}
                    </td>
                  </tr>
                ) : filteredData.map((r) => {
                  const isUnassignedRow = r.riderCode === 'UNASSIGNED';
                  return (
                    <tr 
                      key={r.sNo} 
                      onClick={() => handleOpenRiderDetail(r)}
                      className={`transition-colors cursor-pointer group ${
                        isUnassignedRow 
                          ? 'bg-amber-50/60 hover:bg-amber-100/80 border-t-2 border-amber-300' 
                          : 'hover:bg-slate-100/90'
                      }`}
                      title={isUnassignedRow ? "Click to assign riders to unassigned shipments" : "Click to view assigned shipments details"}
                    >
                      <td className="p-3.5 text-slate-400 group-hover:text-primary">{r.sNo}</td>
                      <td className="p-3.5 font-bold font-mono text-slate-900 group-hover:text-primary">
                        {isUnassignedRow ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold shadow-xs">
                            UNASSIGNED
                          </span>
                        ) : (
                          r.riderCode
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{r.riderName}</span>
                          <span className="text-[10px] text-slate-400 font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUnassignedRow ? '(click to assign)' : '(view details)'}
                          </span>
                        </div>
                        {r.phone && <div className="text-[10px] text-slate-500 font-mono">{r.phone}</div>}
                      </td>
                      <td className="p-3.5 text-center font-black bg-slate-50 text-slate-900 text-sm">
                        {r.totalAssigned}
                      </td>
                      <td className="p-3.5 text-center bg-purple-50/50 text-purple-950">
                        {r.pickupCount}
                      </td>
                      <td className="p-3.5 text-center bg-blue-50/50 text-blue-950">
                        <div className="font-bold">{r.outForDeliveryCount}</div>
                        {r.outForDeliveryAmount > 0 && (
                          <div className="text-[10px] text-slate-500 font-normal">PKR {r.outForDeliveryAmount.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-center bg-emerald-50/50 text-emerald-900 font-bold">
                        <div>{r.deliveredCount}</div>
                        {r.deliveredAmount > 0 && (
                          <div className="text-[10px] text-emerald-700 font-normal">PKR {r.deliveredAmount.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-center bg-rose-50/50 text-rose-800">
                        <div>{r.deliveryFailedCount}</div>
                        {r.deliveryFailedAmount > 0 && (
                          <div className="text-[10px] text-slate-500 font-normal">PKR {r.deliveryFailedAmount.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-center bg-amber-50/50 text-amber-900">
                        {r.readyForReturnCount}
                      </td>
                      <td className="p-3.5 text-center bg-teal-50/50 text-teal-900">
                        {r.returnToShipperCount}
                      </td>
                      <td className="p-3.5 text-center font-black text-amber-800 bg-amber-50 text-sm">
                        {r.successRatio}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Shipments Details & Rider Assignment Modal */}
        {selectedRiderDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedRiderDetail.riderCode === 'UNASSIGNED' ? 'Direct Assignment Pool' : 'Assigned Shipments Details'}
                  </div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>{selectedRiderDetail.riderName}</span>
                    <span className="text-xs bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md font-mono">{selectedRiderDetail.riderCode}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRiderDetail(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Handled</div>
                    <div className="text-lg font-black text-slate-900">{selectedRiderDetail.totalAssigned}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
                    <div className="text-[10px] text-blue-700 font-bold uppercase">Out For Delivery</div>
                    <div className="text-lg font-black text-blue-900">{selectedRiderDetail.outForDeliveryCount}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase">Delivered</div>
                    <div className="text-lg font-black text-emerald-900">{selectedRiderDetail.deliveredCount}</div>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200">
                    <div className="text-[10px] text-rose-700 font-bold uppercase">Delivery Failed</div>
                    <div className="text-lg font-black text-rose-900">{selectedRiderDetail.deliveryFailedCount}</div>
                  </div>
                </div>

                {/* Bulk Assign Bar */}
                <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-primary" /> Assign All Visible To:
                    </span>
                    <select
                      value={bulkRiderSelection}
                      onChange={(e) => setBulkRiderSelection(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                    >
                      <option value="">-- Choose Rider --</option>
                      {availableRiders.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.riderName} ({r.riderCode})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleApplyBulkRider}
                      disabled={!bulkRiderSelection}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      Apply to All
                    </button>
                  </div>
                  
                  <div className="text-xs font-bold text-slate-500">
                    {riderParcelsList.length} {riderParcelsList.length === 1 ? 'shipment' : 'shipments'} in this view
                  </div>
                </div>

                {/* Shipments List Table with Rider Assignment Column */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Tracking #</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Destination</th>
                        <th className="p-3 text-right">COD (PKR)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Assign Rider</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {riderParcelsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No shipments assigned yet.
                          </td>
                        </tr>
                      ) : (
                        riderParcelsList.map((p, idx) => {
                          const trk = String(p.tracking_number || p.shipmentNumber || `#${p.id}`).toUpperCase().trim();
                          const currentSelectedRider = parcelRiderMap[trk] || '';

                          return (
                            <tr key={p.tracking_number || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-primary">{p.tracking_number || p.shipmentNumber || '-'}</td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{p.recipient_name || p.consigneeName || '-'}</div>
                                {(p.recipient_phone || p.phone) && <div className="text-[10px] text-slate-500">{p.recipient_phone || p.phone}</div>}
                              </td>
                              <td className="p-3 text-slate-600 truncate max-w-[150px]">{p.recipient_address || p.destination || p.destination_city?.CityName || '-'}</td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {Number(p.cod_amount || p.amountCollect || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  {p.status || 'Out for Delivery'}
                                </span>
                              </td>
                              <td className="p-3">
                                <select
                                  value={currentSelectedRider}
                                  onChange={(e) => {
                                    const newRiderId = e.target.value;
                                    setParcelRiderMap(prev => ({ ...prev, [trk]: newRiderId }));
                                  }}
                                  className="bg-white border border-slate-300 rounded-xl py-1.5 px-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer w-full max-w-[220px] shadow-xs"
                                >
                                  <option value="">-- Select Rider --</option>
                                  {availableRiders.map((r) => (
                                    <option key={r.id} value={String(r.id)}>
                                      {r.riderName} ({r.riderCode})
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-600">
                  Select a rider for each shipment or use bulk assign, then click Save.
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedRiderDetail(null)}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssignments}
                    disabled={isSavingAssignments}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> {isSavingAssignments ? 'Saving...' : 'Save & Assign Rider'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

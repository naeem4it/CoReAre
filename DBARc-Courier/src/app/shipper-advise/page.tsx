'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CornerUpLeft, 
  Truck, 
  User, 
  X, 
  FileText, 
  RefreshCw, 
  Send,
  HelpCircle,
  TrendingDown,
  ArrowRight,
  Filter,
  Download,
  BookOpen,
  Timer
} from 'lucide-react';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000; // 48 Hours in Milliseconds

export default function ShipperAdvisePage() {
  const [attempts, setAttempts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Dialog States
  const [selectedAttempt, setSelectedAttempt] = React.useState<any | null>(null);
  const [adviceType, setAdviceType] = React.useState<'reattempt' | 'return' | 'reroute'>('reattempt');
  const [adviceText, setAdviceText] = React.useState('');
  const [newAddress, setNewAddress] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filters
  const [filterReason, setFilterReason] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  // Toast
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Helper to evaluate 48-Hour SLA expiration
  const getSLAStatus = (createdAt: string, adviceStatus: string, attemptNum: string) => {
    if (adviceStatus === 'Resolved' || adviceStatus === 'Failed') {
      return { isExpired: false, hoursLeft: 0, label: 'Resolved' };
    }
    if (attemptNum === 'Attempt 3') {
      return { isExpired: true, hoursLeft: 0, label: '3-Attempt Return Auto-Triggered' };
    }

    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsed = now - createdTime;
    const timeLeft = FORTY_EIGHT_HOURS_MS - elapsed;

    if (timeLeft <= 0) {
      return { isExpired: true, hoursLeft: 0, label: 'Expired (Auto-Return to Shipper)' };
    }

    const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
    return { isExpired: false, hoursLeft, label: `${hoursLeft}h left to advise` };
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/delivery-attempts', {
        params: {
          populate: ['parcel', 'rider'],
          sort: ['createdAt:desc']
        }
      });
      const data = response.data?.data || [];
      if (data.length > 0) {
        setAttempts(data);
      } else {
        // Fallback to real parcels that need shipper advice
        const parcelsRes = await apiClient.get('/parcels', {
          params: {
            filters: {
              status: { $in: ['Failed Attempt', 'Ready To Return', 'Return to Shipper'] }
            },
            populate: '*',
            sort: ['createdAt:desc'],
            pagination: { pageSize: 50 }
          }
        });
        const failedParcels = parcelsRes.data?.data || [];
        const mappedAttempts = failedParcels.map((p: any) => ({
          id: p.id,
          isParcelOnly: true,
          attempt_time: p.updatedAt || p.createdAt,
          status: 'Attempt 1',
          failure_reason: p.comments || 'Delivery Attempt Failed',
          shipper_advice: null,
          advice_status: p.status === 'Ready To Return' || p.status === 'Return to Shipper' ? 'Failed' : 'Awaiting advice',
          createdAt: p.createdAt,
          parcel: p,
          rider: p.rider ? { name: p.rider.name || p.rider.user?.fullName || 'Courier Rider' } : null
        }));
        setAttempts(mappedAttempts);
      }
    } catch (error) {
      console.warn('Could not fetch delivery attempts:', error);
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAttempts();
  }, []);

  // Compute KPIs dynamically including 48h SLA auto-returns
  const kpiTotalFailed = attempts.length;
  const kpiPendingAdvice = attempts.filter(a => {
    const sla = getSLAStatus(a.createdAt || a.attempt_time, a.advice_status, a.status);
    return a.advice_status === 'Awaiting advice' && !sla.isExpired;
  }).length;
  const kpiResolved = attempts.filter(a => a.advice_status === 'Resolved').length;
  const kpiReturns = attempts.filter(a => {
    const sla = getSLAStatus(a.createdAt || a.attempt_time, a.advice_status, a.status);
    return a.advice_status === 'Failed' || sla.isExpired || a.status === 'Attempt 3';
  }).length;

  // Open advice Modal
  const handleOpenAdviceModal = (attempt: any) => {
    setSelectedAttempt(attempt);
    setAdviceType('reattempt');
    setAdviceText('');
    setNewAddress(attempt.parcel?.recipient_address || '');
  };

  // Submit shipper advice
  const handleSubmitAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt) return;

    setIsSubmitting(true);
    try {
      const isReturn = adviceType === 'return';
      const isReroute = adviceType === 'reroute';
      
      let finalAdvice = adviceText.trim();
      if (isReroute) {
        finalAdvice = `Rerouted to: ${newAddress}. Note: ${adviceText}`;
      } else if (isReturn) {
        finalAdvice = `Return requested by Shipper. Reason: ${adviceText || 'Not available'}`;
      }

      const attemptPayload = {
        shipper_advice: finalAdvice,
        advice_status: isReturn ? 'Failed' : 'Resolved',
      };

      // 1. Update delivery attempt status if record exists
      if (!selectedAttempt.isParcelOnly) {
        try {
          await apiClient.put(`/delivery-attempts/${selectedAttempt.id}`, { data: attemptPayload });
        } catch (attErr) {
          console.warn('Could not update delivery attempt entity:', attErr);
        }
      }

      // 2. Update parcel status & details
      const parcelId = selectedAttempt.parcel?.id || selectedAttempt.id;
      if (parcelId) {
        const parcelData: any = {};
        if (isReturn) {
          parcelData.status = 'Ready To Return';
        } else if (isReroute) {
          parcelData.recipient_address = newAddress;
        }
        if (finalAdvice) {
          parcelData.comments = finalAdvice;
        }
        if (Object.keys(parcelData).length > 0) {
          await apiClient.put(`/parcels/${parcelId}`, { data: parcelData });
        }
      }

      triggerToast(isReturn ? 'Initiated Return to Shipper.' : 'Delivery advice saved successfully.');
      setSelectedAttempt(null);
      fetchAttempts();
    } catch (err: any) {
      console.error('Failed to submit shipper advice:', err);
      triggerToast('Failed to submit advice.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process Return for 3rd attempt or 48h timeout
  const handleProcessReturnDirect = async (attempt: any, reasonText: string) => {
    if (!confirm(`Proceed to mark this parcel as Ready to Return to Shipper (${reasonText})?`)) {
      return;
    }

    try {
      if (!attempt.isParcelOnly) {
        try {
          await apiClient.put(`/delivery-attempts/${attempt.id}`, {
            data: {
              shipper_advice: `Return to Shipper processed automatically (${reasonText})`,
              advice_status: 'Failed'
            }
          });
        } catch (attErr) {
          console.warn('Could not update delivery attempt entity:', attErr);
        }
      }

      const parcelId = attempt.parcel?.id || attempt.id;
      if (parcelId) {
        await apiClient.put(`/parcels/${parcelId}`, {
          data: { status: 'Ready To Return' }
        });
      }

      triggerToast('Parcel marked as Ready to Return.');
      fetchAttempts();
    } catch (err: any) {
      console.error('Failed to initiate return:', err);
      triggerToast('Failed to initiate return workflow.', 'error');
    }
  };

  // Filter logic
  const filteredAttempts = attempts.filter(item => {
    const matchesReason = filterReason ? item.failure_reason?.toLowerCase().includes(filterReason.toLowerCase()) : true;
    const matchesStatus = filterStatus ? item.advice_status === filterStatus : true;
    return matchesReason && matchesStatus;
  });

  const renderAdviceStatusBadge = (attempt: any) => {
    const sla = getSLAStatus(attempt.createdAt || attempt.attempt_time, attempt.advice_status, attempt.status);

    if (attempt.advice_status === 'Resolved') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
        </span>
      );
    }

    if (sla.isExpired) {
      return (
        <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-xs bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
          <CornerUpLeft className="w-3.5 h-3.5" /> {sla.label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
        <Timer className="w-3.5 h-3.5" /> {sla.label}
      </span>
    );
  };

  return (
    <PortalLayout>
      <div className="p-lg max-w-[1920px] w-full mx-auto flex flex-col gap-lg pb-12">
        
        {/* Success / Error Toast */}
        {toast.show && (
          <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-200 border border-red-800'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500 rounded-full p-1 text-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="bg-red-500 rounded-full p-1 text-white">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div>
            <div className="flex items-center gap-1.5 text-primary mb-1 font-bold">
              <CornerUpLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Delivery Disruption Management</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Shipper Advice Listing & SLA Center</h2>
            <p className="text-on-surface-variant font-body-md text-body-md mt-1">
              Courier-entered returns and failed delivery attempt entries. Provide advice within 48 hours; otherwise, orders automatically convert to Ready To Return.
            </p>
          </div>
          
          <div className="flex items-center gap-sm">
            <button 
              onClick={fetchAttempts}
              className="flex items-center gap-1.5 h-11 px-4 border border-outline-variant bg-white text-secondary rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Tickets
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-outline uppercase tracking-wider">Courier Failed Attempts</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{kpiTotalFailed}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-outline uppercase tracking-wider">Awaiting Advice (&lt;48h)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{kpiPendingAdvice}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-outline uppercase tracking-wider">Shipper Advised / Resolved</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{kpiResolved}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <CornerUpLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-outline uppercase tracking-wider">Returns (3rd Attempt / 48h)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{kpiReturns}</h3>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-sm bg-white p-sm border border-outline-variant rounded-2xl shadow-sm">
          <div className="flex flex-col gap-xs">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Reason of Failure</label>
            <input 
              type="text" 
              placeholder="Filter by Reason (e.g. Not Available)..."
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/50 border border-outline-variant rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Advice Status</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50/50 border border-outline-variant rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer font-medium text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Awaiting advice">Awaiting advice</option>
              <option value="Resolved">Resolved</option>
              <option value="Failed">Failed / Return Required</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              onClick={fetchAttempts}
              className="w-full h-[42px] bg-slate-100 hover:bg-slate-200 text-secondary font-semibold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-outline-variant"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Failed Attempt Listing Table */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
            <h4 className="font-bold text-sm text-on-surface">Courier Entered Delivery Disruption Listing</h4>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredAttempts.length} ticket{filteredAttempts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <span className="material-symbols-outlined animate-spin text-[32px] mb-2">sync</span>
                <p className="text-sm font-medium">Loading failed attempts...</p>
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-20">assignment_turned_in</span>
                <p className="text-sm font-bold text-on-surface-variant">No failed delivery attempts found</p>
                <p className="text-xs mt-1">Adjust filters or reload.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase">
                    <th className="px-4 py-3">Tracking ID</th>
                    <th className="px-4 py-3">Consignee Name</th>
                    <th className="px-4 py-3">Rider Name</th>
                    <th className="px-4 py-3">Attempt Num</th>
                    <th className="px-4 py-3">Failure Reason</th>
                    <th className="px-4 py-3">48h SLA & Advice Status</th>
                    <th className="px-4 py-3">Shipper Instruction</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-xs font-medium">
                  {filteredAttempts.map((attempt) => {
                    const sla = getSLAStatus(attempt.createdAt || attempt.attempt_time, attempt.advice_status, attempt.status);
                    const isThirdAttempt = attempt.status === 'Attempt 3';
                    const isAwaiting = attempt.advice_status === 'Awaiting advice';
                    
                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-primary text-sm">{attempt.parcel?.tracking_number || 'N/A'}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{attempt.parcel?.recipient_name || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{attempt.parcel?.recipient_address}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700 font-semibold">{attempt.rider?.name || 'Unassigned'}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isThirdAttempt 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : attempt.status === 'Attempt 2'
                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {attempt.status || 'Attempt 1'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-800 font-semibold">{attempt.failure_reason || 'Not Specified'}</td>
                        <td className="px-4 py-4">
                          {renderAdviceStatusBadge(attempt)}
                        </td>
                        <td className="px-4 py-4">
                          {attempt.shipper_advice ? (
                            <span className="text-[10px] text-slate-600 font-medium italic bg-slate-50 p-1.5 rounded border border-outline-variant block max-w-[220px] truncate">
                              "{attempt.shipper_advice}"
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No advice given yet</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {isAwaiting && !sla.isExpired ? (
                            <button
                              onClick={() => handleOpenAdviceModal(attempt)}
                              className="px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold transition-all hover:shadow-md active:scale-95 cursor-pointer"
                            >
                              Provide Advice
                            </button>
                          ) : isAwaiting && sla.isExpired ? (
                            <button
                              onClick={() => handleProcessReturnDirect(attempt, isThirdAttempt ? '3 Failed Attempts' : '48h SLA Expired')}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                            >
                              Confirm Return
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* PROVIDE ADVICE MODAL */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200 p-5 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface">Provide Shipper Advice</h3>
                <p className="text-xs text-secondary font-mono mt-0.5">Shipment ID: {selectedAttempt.parcel?.tracking_number}</p>
              </div>
              <button onClick={() => setSelectedAttempt(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-outline hover:text-slate-900 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning if 2nd attempt */}
            {selectedAttempt.status === 'Attempt 2' && (
              <div className="bg-amber-50 text-amber-800 p-3 border border-amber-200 rounded-xl flex gap-2.5 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p>Attention: This is the 2nd attempt. A 3rd failed attempt or reaching 48 hours without advice will automatically return the parcel to shipper.</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitAdvice} className="flex flex-col gap-4">
              
              {/* Advice type selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Shipper Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdviceType('reattempt')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      adviceType === 'reattempt'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-outline-variant hover:bg-slate-50 text-secondary'
                    }`}
                  >
                    Re-attempt
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdviceType('reroute')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      adviceType === 'reroute'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-outline-variant hover:bg-slate-50 text-secondary'
                    }`}
                  >
                    Reroute Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdviceType('return')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      adviceType === 'return'
                        ? 'border-red-600 bg-red-50/50 text-red-600'
                        : 'border-outline-variant hover:bg-slate-50 text-secondary'
                    }`}
                  >
                    Return to Shipper
                  </button>
                </div>
              </div>

              {/* Reroute Address Input */}
              {adviceType === 'reroute' && (
                <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">New Delivery Address</label>
                  <textarea
                    rows={2}
                    className="w-full p-3 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Advice text/notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">
                  {adviceType === 'reattempt' ? 'Specific Instructions for Rider' : adviceType === 'return' ? 'Reason for Return Request' : 'Rerouting Instructions'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    adviceType === 'reattempt' 
                      ? 'e.g., Please deliver after 5 PM when consignee is home, call alternative contact...' 
                      : adviceType === 'return'
                        ? 'e.g., Consignee cancelled order, proceed to return immediately...'
                        : 'e.g., Deliver to office address instead...'
                  }
                  className="w-full p-3 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  value={adviceText}
                  onChange={(e) => setAdviceText(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-outline-variant pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-secondary hover:bg-slate-50 transition-all font-semibold text-xs active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-white rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
                    adviceType === 'return' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:shadow-lg'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Submit Advice'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </PortalLayout>
  );
}

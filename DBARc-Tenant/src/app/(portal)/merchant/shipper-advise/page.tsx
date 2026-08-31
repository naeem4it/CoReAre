'use client';

import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  FileText,
  Truck,
  XCircle,
  Calendar,
} from 'lucide-react';

interface DeliveryAttempt {
  id: number;
  attempt_time: string;
  status: string; // 'Attempt 1', 'Attempt 2', 'Attempt 3'
  failure_reason: string;
  rider_notes?: string;
  shipper_advice?: string;
  advice_status: 'Awaiting advice' | 'Re-attempt Requested' | 'Return to Shipper' | 'Failed' | 'Closed';
  createdAt: string;
  parcel?: {
    id: number;
    tracking_number: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    destination_city?: { name: string };
    status: string;
  };
  rider?: {
    name: string;
    phone?: string;
  };
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export default function ShipperAdvisePage() {
  const { user } = useAuthStore();
  const [attempts, setAttempts] = React.useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'awaiting' | 'scheduled' | 'rto' | 'all'>('awaiting');

  // Action Modals State
  const [selectedAttempt, setSelectedAttempt] = React.useState<DeliveryAttempt | null>(null);
  const [actionType, setActionType] = React.useState<'reattempt' | 'rto' | null>(null);
  const [adviceNotes, setAdviceNotes] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [preferredDate, setPreferredDate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Toast
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/delivery-attempts', {
        params: {
          populate: ['parcel', 'parcel.destination_city', 'rider'],
          sort: ['createdAt:desc'],
        },
      });
      const data = res.data?.data || [];
      setAttempts(data);
    } catch (err) {
      console.warn('Could not fetch delivery attempts from API:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAttempts();
  }, []);

  // Filter attempts based on search and tab
  const filteredAttempts = React.useMemo(() => {
    return attempts.filter((item) => {
      // Tab filter
      if (activeTab === 'awaiting' && item.advice_status !== 'Awaiting advice') return false;
      if (activeTab === 'scheduled' && item.advice_status !== 'Re-attempt Requested') return false;
      if (activeTab === 'rto' && item.advice_status !== 'Return to Shipper' && item.advice_status !== 'Failed') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = item.parcel?.tracking_number?.toLowerCase() || '';
        const name = item.parcel?.recipient_name?.toLowerCase() || '';
        const phone = item.parcel?.recipient_phone?.toLowerCase() || '';
        const reason = item.failure_reason?.toLowerCase() || '';
        return tracking.includes(q) || name.includes(q) || phone.includes(q) || reason.includes(q);
      }
      return true;
    });
  }, [attempts, activeTab, searchQuery]);

  // Counts
  const awaitingCount = attempts.filter((a) => a.advice_status === 'Awaiting advice').length;
  const scheduledCount = attempts.filter((a) => a.advice_status === 'Re-attempt Requested').length;
  const rtoCount = attempts.filter((a) => a.advice_status === 'Return to Shipper' || a.advice_status === 'Failed').length;

  // Calculate Remaining Time for 48h SLA
  const calculateRemainingSLA = (createdAtStr: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const elapsed = Date.now() - createdTime;
    const remaining = FORTY_EIGHT_HOURS_MS - elapsed;

    if (remaining <= 0) {
      return { expired: true, text: 'SLA Expired (Auto RTO Pending)' };
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${mins}m remaining` };
  };

  const handleOpenAction = (attempt: DeliveryAttempt, type: 'reattempt' | 'rto') => {
    setSelectedAttempt(attempt);
    setActionType(type);
    setAdviceNotes('');
    setNewPhone(attempt.parcel?.recipient_phone || '');
    setPreferredDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  };

  const handleCloseModal = () => {
    setSelectedAttempt(null);
    setActionType(null);
    setIsSubmitting(false);
  };

  const handleSubmitAdvice = async () => {
    if (!selectedAttempt) return;

    if (actionType === 'reattempt' && !adviceNotes.trim()) {
      showToast('Please provide instructions for the delivery rider.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isReattempt = actionType === 'reattempt';
      const updatedStatus = isReattempt ? 'Re-attempt Requested' : 'Return to Shipper';
      const adviceMessage = isReattempt
        ? `Re-attempt requested. Notes: ${adviceNotes.trim()} ${newPhone ? `| Alt Contact: ${newPhone}` : ''} ${preferredDate ? `| Preferred Date: ${preferredDate}` : ''}`
        : `Return Approved by Merchant. Notes: ${adviceNotes.trim() || 'Please return to merchant warehouse.'}`;

      // 1. Update delivery attempt
      await apiClient.put(`/delivery-attempts/${selectedAttempt.id}`, {
        data: {
          shipper_advice: adviceMessage,
          advice_status: updatedStatus,
        },
      });

      // 2. Update parcel status
      if (selectedAttempt.parcel?.id) {
        await apiClient.put(`/parcels/${selectedAttempt.parcel.id}`, {
          data: {
            status: isReattempt ? 'Out For delivery' : 'Ready To Return',
            comments: adviceMessage,
          },
        });
      }

      showToast(
        isReattempt
          ? 'Re-attempt instruction submitted successfully!'
          : 'Return to Shipper approved successfully!',
        'success'
      );

      handleCloseModal();
      fetchAttempts();
    } catch (err: any) {
      console.error('Failed to submit advice:', err);
      showToast('Failed to submit advice. Please check network connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
              : 'bg-rose-900/90 border-rose-700 text-rose-100'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Non-Delivery Reports (NDR)
            </span>
            <span className="text-xs text-slate-400">• 48h Action SLA</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Shipper Advise Portal</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Resolve delivery issues, schedule customer re-attempts, or approve returns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchAttempts}
            disabled={loading}
            className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50/70 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Awaiting Advice</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{awaitingCount}</h3>
                <p className="text-xs text-amber-600 mt-1">Requires immediate merchant action</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50/70 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Re-attempt Scheduled</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{scheduledCount}</h3>
                <p className="text-xs text-blue-600 mt-1">Dispatched for delivery re-try</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
                <RotateCcw className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-rose-200 bg-gradient-to-br from-rose-50/70 to-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Return to Shipper (RTO)</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{rtoCount}</h3>
                <p className="text-xs text-rose-600 mt-1">In transit back to warehouse</p>
              </div>
              <div className="p-3 bg-rose-100 rounded-xl text-rose-700">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('awaiting')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'awaiting'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Awaiting Action ({awaitingCount})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'scheduled'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Re-attempts ({scheduledCount})
          </button>
          <button
            onClick={() => setActiveTab('rto')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'rto'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Returns ({rtoCount})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All History ({attempts.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tracking, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white"
          />
        </div>
      </div>

      {/* Attempts List */}
      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500 font-medium">Loading non-delivery records...</p>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Non-Delivery Actions Pending</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              All delivery attempts have been successfully resolved or are on-track.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAttempts.map((item) => {
            const sla = calculateRemainingSLA(item.createdAt);
            const isAwaiting = item.advice_status === 'Awaiting advice';

            return (
              <Card
                key={item.id}
                className="rounded-2xl border-slate-200 hover:border-slate-300 shadow-sm transition-all overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Parcel & Recipient Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-sm">
                          {item.parcel?.tracking_number || `ATTEMPT-#${item.id}`}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          {item.status || 'Failed Attempt'}
                        </span>
                        {isAwaiting && (
                          <span
                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sla.expired
                                ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {sla.text}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{item.parcel?.recipient_name || 'Customer'}</span>
                          <span className="text-slate-400">({item.parcel?.destination_city?.name || 'Destination'})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.parcel?.recipient_phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>COD: PKR {item.parcel?.cod_amount?.toLocaleString() || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{item.parcel?.recipient_address || 'No address specified'}</span>
                      </div>

                      {/* Reason Box */}
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs mt-2">
                        <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rider Failure Reason: {item.failure_reason}</span>
                        </div>
                        {item.rider_notes && (
                          <p className="text-rose-700 mt-1 pl-5">Notes: "{item.rider_notes}"</p>
                        )}
                        {item.shipper_advice && (
                          <div className="mt-2 pt-2 border-t border-rose-200/60 text-slate-700 font-medium pl-5">
                            Merchant Advice Log: {item.shipper_advice}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row lg:flex-col items-center justify-end gap-2.5 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      {isAwaiting ? (
                        <>
                          <Button
                            onClick={() => handleOpenAction(item, 'reattempt')}
                            className="flex-1 lg:flex-none rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Request Re-attempt
                          </Button>
                          <Button
                            onClick={() => handleOpenAction(item, 'rto')}
                            variant="outline"
                            className="flex-1 lg:flex-none rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs px-4 py-2"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Approve Return (RTO)
                          </Button>
                        </>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Status: {item.advice_status}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Dialog Modal */}
      <Modal
        isOpen={!!selectedAttempt && !!actionType}
        onClose={handleCloseModal}
        title={actionType === 'reattempt' ? 'Schedule Customer Re-attempt' : 'Approve Return to Shipper'}
      >
        <div className="space-y-4 pt-2 text-sm text-slate-700">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
            <p className="font-semibold text-slate-900">
              Tracking #{selectedAttempt?.parcel?.tracking_number}
            </p>
            <p className="text-slate-600">
              Consignee: {selectedAttempt?.parcel?.recipient_name} ({selectedAttempt?.parcel?.recipient_phone})
            </p>
            <p className="text-rose-700 font-medium">
              Reported Issue: {selectedAttempt?.failure_reason}
            </p>
          </div>

          {actionType === 'reattempt' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternate Phone / Contact (Optional)
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Delivery Date
                </label>
                <Input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instructions for Rider / Branch <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={adviceNotes}
                  onChange={(e) => setAdviceNotes(e.target.value)}
                  placeholder="e.g. Customer will be available after 3:00 PM. Alternate gate entry code provided."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Remarks (Optional)
              </label>
              <textarea
                value={adviceNotes}
                onChange={(e) => setAdviceNotes(e.target.value)}
                placeholder="e.g. Order cancelled by customer; return back to warehouse."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={handleCloseModal} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdvice}
              disabled={isSubmitting}
              className={`rounded-xl text-white ${
                actionType === 'reattempt'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting
                ? 'Submitting...'
                : actionType === 'reattempt'
                ? 'Confirm Re-attempt'
                : 'Confirm Return'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

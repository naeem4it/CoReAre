'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import PaymentMethodConfigBlock, { PaymentMethodData } from '@/components/payment/PaymentMethodConfigBlock';
import { CreditCard, Building2, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ConfigurePaymentMethodPage() {
  const { user, isShipper, isShipperAdmin, activeBusinessId, setActiveBusinessId } = useAuth();

  const [businesses, setBusinesses] = React.useState<Array<{ id: number; name: string; account_id?: string }>>([]);
  const [selectedBizId, setSelectedBizId] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const [paymentData, setPaymentData] = React.useState<PaymentMethodData>({
    payment_method: 'Cash',
    bank_name: '',
    account_title: '',
    account_number: '',
    cheque_title: '',
  });

  // 1. Determine businesses available to this user
  React.useEffect(() => {
    let bizList: Array<{ id: number; name: string; account_id?: string }> = [];
    if (user?.shipper) {
      const arr = Array.isArray(user.shipper) ? user.shipper : [user.shipper];
      bizList = arr.map((s: any) => ({
        id: s.id,
        name: s.name || `Business #${s.id}`,
        account_id: s.account_id || '',
      }));
    }

    setBusinesses(bizList);

    if (activeBusinessId && bizList.some(b => b.id === activeBusinessId)) {
      setSelectedBizId(activeBusinessId);
    } else if (bizList.length > 0) {
      setSelectedBizId(bizList[0].id);
    }
  }, [user, activeBusinessId]);

  // 2. Fetch payment method and bank details for the selected business from Strapi
  const fetchShipperPaymentDetails = React.useCallback(async (bizId: number) => {
    setIsLoading(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const res = await apiClient.get(`/shippers/${bizId}`);
      const shipperData = res.data?.data?.attributes || res.data?.data || res.data || {};

      setPaymentData({
        // Default to Cash if not configured in database
        payment_method: shipperData.payment_method || 'Cash',
        bank_name: shipperData.bank_name || '',
        account_title: shipperData.account_title || '',
        account_number: shipperData.account_number || '',
        cheque_title: shipperData.cheque_title || '',
      });
    } catch (err: any) {
      console.warn('Failed to load shipper payment settings:', err);
      // Fallback default
      setPaymentData({
        payment_method: 'Cash',
        bank_name: '',
        account_title: '',
        account_number: '',
        cheque_title: '',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedBizId) {
      fetchShipperPaymentDetails(selectedBizId);
    } else {
      setIsLoading(false);
    }
  }, [selectedBizId, fetchShipperPaymentDetails]);

  // 3. Save Payment Method to Strapi Database
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizId) {
      setErrorMessage('Please select a business to configure payment method.');
      return;
    }

    // Validation for Cheque / Online
    if (paymentData.payment_method === 'Cheque' || paymentData.payment_method === 'Online') {
      if (!paymentData.bank_name?.trim()) {
        setErrorMessage('Bank Name is required for ' + paymentData.payment_method + ' payment.');
        return;
      }
      if (!paymentData.account_title?.trim()) {
        setErrorMessage('Account Title is required for ' + paymentData.payment_method + ' payment.');
        return;
      }
      if (!paymentData.account_number?.trim()) {
        setErrorMessage('Account Number / IBAN is required for ' + paymentData.payment_method + ' payment.');
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const payload = {
        data: {
          payment_method: paymentData.payment_method,
          bank_name: paymentData.bank_name || '',
          account_title: paymentData.account_title || '',
          account_number: paymentData.account_number || '',
          cheque_title: paymentData.cheque_title || '',
        },
      };

      await apiClient.put(`/shippers/${selectedBizId}`, payload);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to save payment method:', err);
      setErrorMessage(err.response?.data?.error?.message || 'Failed to save payment method to database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentBizName = businesses.find(b => b.id === selectedBizId)?.name || 'Your Business';

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-display">Configure Payment Method</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Set how your business receives COD remittances and payout settlements from courier operations.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-business selector (if user has multiple shipper stores) */}
        {businesses.length > 1 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-slate-700">Select Business:</span>
            </div>
            <select
              value={selectedBizId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedBizId(id);
                setActiveBusinessId(id);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name} {biz.account_id ? `(${biz.account_id})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Feedback Banners */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-200 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">Payment Method Saved Successfully!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                The disbursement preferences for <strong>{currentBizName}</strong> have been saved to the database.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-200 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">Configuration Notice</p>
              <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Configuration Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Remittance &amp; Disbursement Option
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configuring payment method for <strong className="text-slate-800">{currentBizName}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Method</span>
              <span className="text-xs font-black text-primary font-mono">{paymentData.payment_method}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-xs">Loading payment details from database...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Payment Method Selector (mode="profile", Cheque number NOT asked) */}
              <PaymentMethodConfigBlock
                mode="profile"
                value={paymentData}
                onChange={setPaymentData}
                disabled={isSaving}
              />

              {/* Action Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-primary hover:bg-[#003ec7] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Payment Method
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

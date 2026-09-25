'use client';

import * as React from 'react';
import { Banknote, FileText, CreditCard, Building2, User, Hash, CheckCircle2, AlertCircle } from 'lucide-react';

export type PaymentMethodType = 'Cash' | 'Cheque' | 'Online';

export interface PaymentMethodData {
  payment_method: PaymentMethodType;
  bank_name?: string;
  account_title?: string;
  account_number?: string;
  cheque_title?: string;
  cheque_number?: string;
}

interface PaymentMethodConfigBlockProps {
  mode?: 'profile' | 'booking' | 'invoice_payout';
  value: PaymentMethodData;
  onChange: (updated: PaymentMethodData) => void;
  disabled?: boolean;
}

export default function PaymentMethodConfigBlock({
  mode = 'profile',
  value,
  onChange,
  disabled = false,
}: PaymentMethodConfigBlockProps) {
  // Ensure a valid fallback to Cash if unconfigured
  const selectedMethod: PaymentMethodType = value?.payment_method || 'Cash';

  const handleSelectMethod = (method: PaymentMethodType) => {
    if (disabled) return;
    onChange({
      ...value,
      payment_method: method,
    });
  };

  const handleFieldChange = (field: keyof PaymentMethodData, val: string) => {
    if (disabled) return;
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className="space-y-4">
      {/* 3 Payment Method Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* CASH OPTION */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSelectMethod('Cash')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
            selectedMethod === 'Cash'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedMethod === 'Cash' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Banknote className="w-5 h-5" />
            </div>
            {selectedMethod === 'Cash' && (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="mt-3">
            <h4 className="font-bold text-sm text-slate-900">Cash</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Courier-handled COD cash disbursement. No bank details required.
            </p>
          </div>
        </button>

        {/* CHEQUE OPTION */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSelectMethod('Cheque')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
            selectedMethod === 'Cheque'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedMethod === 'Cheque' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            {selectedMethod === 'Cheque' && (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="mt-3">
            <h4 className="font-bold text-sm text-slate-900">Cheque</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Settlement disbursed by bank cheque. Requires bank &amp; title details.
            </p>
          </div>
        </button>

        {/* ONLINE OPTION */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSelectMethod('Online')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
            selectedMethod === 'Online'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedMethod === 'Online' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            {selectedMethod === 'Online' && (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="mt-3">
            <h4 className="font-bold text-sm text-slate-900">Online</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Direct IBFT / Online bank transfer. Requires account details.
            </p>
          </div>
        </button>
      </div>

      {/* CASH MODE NOTICE */}
      {selectedMethod === 'Cash' && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
          <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Cash on Courier:</strong> Payment will be settled in cash directly by courier operations. No bank credentials or account numbers are required.
          </span>
        </div>
      )}

      {/* BANK DETAILS FORM (FOR CHEQUE OR ONLINE) */}
      {(selectedMethod === 'Cheque' || selectedMethod === 'Online') && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-primary" />
              <span>{selectedMethod === 'Cheque' ? 'Cheque Beneficiary & Bank Details' : 'Online Remittance Bank Details'}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedMethod} Payment Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Bank Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={disabled}
                placeholder="e.g. Meezan Bank, HBL, Bank Alfalah"
                value={value.bank_name || ''}
                onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Account Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                Account Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={disabled}
                placeholder="e.g. Merchant Store Pvt Ltd"
                value={value.account_title || ''}
                onChange={(e) => handleFieldChange('account_title', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Account / IBAN Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                Account Number / IBAN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={disabled}
                placeholder="e.g. PK00MEZN0000001234567801"
                value={value.account_number || ''}
                onChange={(e) => handleFieldChange('account_number', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Cheque Title / Payee (Optional for Cheque) */}
            {selectedMethod === 'Cheque' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  Cheque Payee Title
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  placeholder="e.g. Cross Cheque Payee Name"
                  value={value.cheque_title || ''}
                  onChange={(e) => handleFieldChange('cheque_title', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                />
              </div>
            )}

            {/* SPECIFIC TRANSACTION CHEQUE NUMBER: Only displayed during Courier Admin Invoice Payout! */}
            {selectedMethod === 'Cheque' && mode === 'invoice_payout' && (
              <div className="sm:col-span-2 space-y-1 bg-amber-50/80 p-3 rounded-xl border border-amber-200 animate-in fade-in duration-200">
                <label className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    Transaction Cheque Number <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                    Invoice Remittance Specific
                  </span>
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  placeholder="e.g. CHQ-984210"
                  value={value.cheque_number || ''}
                  onChange={(e) => handleFieldChange('cheque_number', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
                <p className="text-[10px] text-amber-700">
                  Enter the issued physical cheque number for this statement payout.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

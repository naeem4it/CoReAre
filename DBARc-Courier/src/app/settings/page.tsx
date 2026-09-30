'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/components/TenantProvider';
import { 
  getTrackingSettings, 
  saveTrackingSettings, 
  persistTrackingSettingsToBackend,
  syncTrackingSettingsFromBackend,
  previewTrackingId,
  TrackingSettings,
  DEFAULT_TRACKING_SETTINGS 
} from '@/shared/utils/tracking';
import { SlipBarcode, SlipQRCode } from '@/features/shipper/ui/DispatchSlipCard';
import { 
  Settings as SettingsIcon,
  Barcode, 
  QrCode, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Tag, 
  Hash, 
  Layers, 
  Info,
  Shield,
  Store,
  Truck,
  Printer
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isShipper, isShipperAdmin, isShipperEmployee } = useAuth();
  const { businessName } = useTenant();
  const tenantId = user?.tenant?.id || user?.tenant;

  const [settings, setSettings] = React.useState<TrackingSettings>(DEFAULT_TRACKING_SETTINGS);
  const [shipperPrefix, setShipperPrefix] = React.useState<string>('SHZ');
  const [courierPrefix, setCourierPrefix] = React.useState<string>('SHZ');
  const [nextNumber, setNextNumber] = React.useState<number>(100001134);

  const [activeTab, setActiveTab] = React.useState<'tracking' | 'profile' | 'printing'>('tracking');
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Initialize settings
  React.useEffect(() => {
    const loaded = getTrackingSettings();
    setSettings(loaded);
    setShipperPrefix(loaded.shipperPrefix || 'SHZ');
    setCourierPrefix(loaded.courierPrefix || 'SHZ');
    setNextNumber(loaded.nextNumber || 100001134);

    if (tenantId) {
      syncTrackingSettingsFromBackend(tenantId).then((remote) => {
        setSettings(remote);
        setShipperPrefix(remote.shipperPrefix || 'SHZ');
        setCourierPrefix(remote.courierPrefix || 'SHZ');
        setNextNumber(remote.nextNumber || 100001134);
      });
    }
  }, [tenantId]);

  // Active prefix depending on role
  const activeEffectivePrefix = isShipper ? shipperPrefix : courierPrefix;

  // Sample sequence previews
  const previewList = React.useMemo(() => {
    const prefix = (activeEffectivePrefix || 'SHZ').toUpperCase().trim();
    const start = Number(nextNumber) || 100001134;
    return [0, 1, 2, 3, 4].map(idx => `${prefix}${start + idx}`);
  }, [activeEffectivePrefix, nextNumber]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    const cleanShipperPrefix = (shipperPrefix || 'SHZ').toUpperCase().trim().replace(/[^A-Z0-9]/g, '') || 'SHZ';
    const cleanCourierPrefix = (courierPrefix || 'SHZ').toUpperCase().trim().replace(/[^A-Z0-9]/g, '') || 'SHZ';
    const parsedNumber = Math.max(100000000, Number(nextNumber) || 100001134);

    try {
      const updated = saveTrackingSettings({
        shipperPrefix: cleanShipperPrefix,
        courierPrefix: cleanCourierPrefix,
        nextNumber: parsedNumber,
      });

      setSettings(updated);
      setShipperPrefix(updated.shipperPrefix);
      setCourierPrefix(updated.courierPrefix);
      setNextNumber(updated.nextNumber);

      if (tenantId) {
        await persistTrackingSettingsToBackend(tenantId, updated);
      }

      setSaveSuccess(`Settings updated successfully! Tracking IDs will now be generated with prefix "${isShipper ? cleanShipperPrefix : cleanCourierPrefix}" (e.g. ${isShipper ? cleanShipperPrefix : cleanCourierPrefix}${parsedNumber}).`);
      setTimeout(() => setSaveSuccess(null), 6000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMessage(err?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setShipperPrefix(DEFAULT_TRACKING_SETTINGS.shipperPrefix);
    setCourierPrefix(DEFAULT_TRACKING_SETTINGS.courierPrefix);
    setNextNumber(DEFAULT_TRACKING_SETTINGS.nextNumber);
    saveTrackingSettings(DEFAULT_TRACKING_SETTINGS);
    setSaveSuccess('Reset to system default settings (Prefix: SHZ, Starting Number: 100001134).');
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const handlePresetSelect = (prefix: string) => {
    if (isShipper) {
      setShipperPrefix(prefix);
    } else {
      setCourierPrefix(prefix);
      setShipperPrefix(prefix);
    }
  };

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>Settings &amp; Preferences</span>
              <span>/</span>
              <span className="text-primary font-bold">
                {isShipper ? 'Shipper Merchant Settings' : 'Courier Administration Settings'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <SettingsIcon className="w-6 h-6 text-primary" />
              System Settings &amp; Tracking Configuration
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure tracking ID prefixes, numerical sequences, dispatch formats, and operating rules for both Shipper and Courier modules.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
              isShipper 
                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {isShipper ? <Store className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
              {isShipper ? 'Shipper Merchant Portal' : 'Courier Operations Admin'}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Settings Successfully Applied</h4>
              <p className="text-xs text-emerald-800 mt-0.5">{saveSuccess}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Action Failed</h4>
              <p className="text-xs text-rose-800 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'tracking'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            Tracking ID Format &amp; Prefix
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Business &amp; Store Profile
          </button>
          <button
            onClick={() => setActiveTab('printing')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'printing'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            Dispatch Slip Printing
          </button>
        </div>

        {/* Tab 1: Tracking ID Settings (Primary) */}
        {activeTab === 'tracking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Controls */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Tracking Number Prefix &amp; Sequence Setup
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Control the format of parcel tracking numbers generated across Manual Booking, Bulk Uploads, Store orders, and API imports.
                  </p>
                </div>

                {/* Prefix Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shipper Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Shipper Tracking Prefix</span>
                      <span className="text-[10px] text-slate-400 font-normal uppercase">Required</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={shipperPrefix}
                        maxLength={8}
                        onChange={(e) => setShipperPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="e.g. SHZ"
                        className="w-full font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                        Prefix
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Primary prefix for shipper merchant orders (e.g. <strong>SHZ</strong> for Shipzo).
                    </p>
                  </div>

                  {/* Courier Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Courier Operations Prefix</span>
                      <span className="text-[10px] text-slate-400 font-normal uppercase">Required</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={courierPrefix}
                        maxLength={8}
                        disabled={isShipper && !isShipperAdmin}
                        onChange={(e) => setCourierPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="e.g. SHZ"
                        className="w-full font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                        Prefix
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Default prefix for in-house courier operational consignments.
                    </p>
                  </div>
                </div>

                {/* Preset Suggestions */}
                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-600 block mb-2">
                    Quick Prefix Presets:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {['SHZ', 'DBA', 'PKL', 'EXP', 'CSG'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          activeEffectivePrefix === preset
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset} {preset === 'SHZ' ? '(Shipzo - Recommended)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Next Numeric Sequence */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-primary" />
                      Next Sequence Number (Numeric Only)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Min: 100000000</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={100000000}
                      max={9999999999}
                      value={nextNumber}
                      onChange={(e) => setNextNumber(Number(e.target.value))}
                      placeholder="100001134"
                      className="w-full font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                      Sequence Counter
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Numeric suffix starts at this value and increments sequentially for each booked order (e.g. <strong>100001134</strong> &rarr; <strong>100001135</strong> &rarr; <strong>100001136</strong>).
                  </p>
                </div>

                {/* Format Summary Info Box */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-blue-950">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    Strict Alphanumeric-to-Numeric Standard
                  </div>
                  <p className="text-blue-800 leading-relaxed">
                    By default, tracking IDs in DBARc now strictly conform to the <strong>[PREFIX][NUMERIC]</strong> format like <strong className="font-mono font-bold">"{activeEffectivePrefix}{nextNumber}"</strong>. No dashes, symbols, or random alphabets are appended to the numeric sequence, making them easy to scan on mobile cameras, barcode scanners, and thermal dispatch slips.
                  </p>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Default (SHZ100001134)
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/95 active:scale-98 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Tracking Settings
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Operating Rules */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Where These Settings Take Effect
                </h3>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>Single Shipment Booking:</strong> Automatically generates tracking IDs starting with <span className="font-mono font-bold text-slate-900">"{activeEffectivePrefix}{nextNumber}"</span>.
                  </li>
                  <li>
                    <strong>Bulk Excel / CSV Booking:</strong> Generates consecutive numeric sequences for every row without collisions.
                  </li>
                  <li>
                    <strong>Dispatch Slips &amp; Airway Bills:</strong> Generates thermal-ready Barcodes and QR Codes with the configured prefix and number.
                  </li>
                  <li>
                    <strong>Online Store &amp; Order API:</strong> External WooCommerce orders and sample store orders inherit this format.
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Col: Real-Time Live Visual Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-24 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-primary" />
                    Live Visual Preview
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Real-time
                  </span>
                </div>

                {/* Primary ID Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-md text-center space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Next Generated Tracking ID
                  </span>
                  <div className="text-2xl font-black font-mono tracking-wider text-amber-400 py-1">
                    {previewList[0]}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Prefix: <strong className="text-white">{activeEffectivePrefix}</strong> &bull; Sequence: <strong className="text-white">{nextNumber}</strong>
                  </p>
                </div>

                {/* Rendered Barcode Preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Thermal Barcode (Code128 Vector)
                  </span>
                  <div className="w-full bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex justify-center">
                    <SlipBarcode text={previewList[0]} height={32} maxWidth={190} textSize={10} />
                  </div>
                </div>

                {/* Rendered QR Code Preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code Scan Target
                  </span>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <SlipQRCode value={previewList[0]} size={64} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">
                    Scans directly as: <strong>{previewList[0]}</strong>
                  </span>
                </div>

                {/* Upcoming Sequence List */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Next 5 Consecutive Tracking Numbers:
                  </span>
                  <div className="space-y-1">
                    {previewList.map((id, index) => (
                      <div
                        key={id}
                        className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg font-mono ${
                          index === 0
                            ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">Order #{index + 1}</span>
                        <span>{id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Profile & Store Info */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Store &amp; Merchant Identity
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your business details appear on all printed dispatch slips, customer invoices, and shipment tracking pages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Business / Store Name</label>
                <input
                  type="text"
                  readOnly
                  value={businessName || 'Shipzo Merchant'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Account User Email</label>
                <input
                  type="text"
                  readOnly
                  value={user?.email || 'user@dbarc.com'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                <input
                  type="text"
                  readOnly
                  value={isShipper ? 'Shipper Merchant' : 'Courier Administrator'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Default Origin City</label>
                <input
                  type="text"
                  readOnly
                  value={user?.shipper?.[0]?.city || 'Lahore'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Printing Preferences */}
        {activeTab === 'printing' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Dispatch Slip &amp; Thermal Printing Preferences
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure your default label sheet sizes, barcode height, and automatic receipt options.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex items-start gap-3">
                <input type="radio" name="printer_type" defaultChecked className="mt-1" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Thermal 4x6 Label (Recommended)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Optimized for standard 100mm x 150mm direct thermal label rolls.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                <input type="radio" name="printer_type" className="mt-1" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Standard A4 Sheet (4 Slips Per Page)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Prints 4 order dispatch slips on a single regular laser printer page.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

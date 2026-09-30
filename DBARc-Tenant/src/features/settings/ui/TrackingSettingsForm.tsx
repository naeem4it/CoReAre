'use client';

import * as React from 'react';
import { 
  getTrackingSettings, 
  saveTrackingSettings, 
  TrackingSettings, 
  DEFAULT_TRACKING_SETTINGS 
} from '@/shared/utils/tracking';
import { 
  Settings as SettingsIcon, 
  Tag, 
  Hash, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Barcode as BarcodeIcon,
  Store,
  Truck
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';

export function TrackingSettingsForm({ role = 'courier' }: { role?: 'shipper' | 'courier' | 'admin' }) {
  const [settings, setSettings] = React.useState<TrackingSettings>(DEFAULT_TRACKING_SETTINGS);
  const [shipperPrefix, setShipperPrefix] = React.useState<string>('SHZ');
  const [courierPrefix, setCourierPrefix] = React.useState<string>('SHZ');
  const [nextNumber, setNextNumber] = React.useState<number>(100001134);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  React.useEffect(() => {
    const loaded = getTrackingSettings();
    setSettings(loaded);
    setShipperPrefix(loaded.shipperPrefix || 'SHZ');
    setCourierPrefix(loaded.courierPrefix || 'SHZ');
    setNextNumber(loaded.nextNumber || 100001134);
  }, []);

  const activePrefix = role === 'shipper' ? shipperPrefix : courierPrefix;

  const previewList = React.useMemo(() => {
    const prefix = (activePrefix || 'SHZ').toUpperCase().trim();
    const start = Number(nextNumber) || 100001134;
    return [0, 1, 2, 3].map((idx) => `${prefix}${start + idx}`);
  }, [activePrefix, nextNumber]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const cleanShipperPrefix = (shipperPrefix || 'SHZ').toUpperCase().trim().replace(/[^A-Z0-9]/g, '') || 'SHZ';
    const cleanCourierPrefix = (courierPrefix || 'SHZ').toUpperCase().trim().replace(/[^A-Z0-9]/g, '') || 'SHZ';
    const cleanNum = Math.max(100000000, Number(nextNumber) || 100001134);

    const updated = saveTrackingSettings({
      shipperPrefix: cleanShipperPrefix,
      courierPrefix: cleanCourierPrefix,
      nextNumber: cleanNum,
    });

    setSettings(updated);
    setShipperPrefix(updated.shipperPrefix);
    setCourierPrefix(updated.courierPrefix);
    setNextNumber(updated.nextNumber);

    setIsSaving(false);
    setSaveSuccess(`Settings saved successfully! Tracking IDs will now generate as "${role === 'shipper' ? cleanShipperPrefix : cleanCourierPrefix}${cleanNum}".`);
    setTimeout(() => setSaveSuccess(null), 5000);
  };

  const handleReset = () => {
    setShipperPrefix('SHZ');
    setCourierPrefix('SHZ');
    setNextNumber(100001134);
    saveTrackingSettings(DEFAULT_TRACKING_SETTINGS);
    setSaveSuccess('Reset to system default settings (Prefix: SHZ, Starting Number: 100001134).');
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings &amp; Tracking Configuration
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure tracking ID prefix (e.g. "SHZ" for Shipzo) and numerical sequence generation across the platform.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Settings Updated</h4>
            <p className="text-xs text-emerald-800 mt-0.5">{saveSuccess}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Prefix &amp; Sequence Settings
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tracking numbers format: [PREFIX][NUMERIC] (e.g. <strong>SHZ100001134</strong>).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Shipper Prefix
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={shipperPrefix}
                  onChange={(e) => setShipperPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. SHZ"
                  className="w-full font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 uppercase outline-none focus:border-primary focus:bg-white"
                />
                <p className="text-[11px] text-slate-500">Prefix for merchant shipments (e.g. SHZ).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Courier Prefix
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={courierPrefix}
                  onChange={(e) => setCourierPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. SHZ"
                  className="w-full font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 uppercase outline-none focus:border-primary focus:bg-white"
                />
                <p className="text-[11px] text-slate-500">Prefix for courier operations consignments.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                Next Sequence Number (Numeric Only)
              </label>
              <input
                type="number"
                min={100000000}
                value={nextNumber}
                onChange={(e) => setNextNumber(Number(e.target.value))}
                placeholder="100001134"
                className="w-full font-mono font-bold text-base bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-primary focus:bg-white"
              />
              <p className="text-[11px] text-slate-500">
                Next consignment starts at this numeric value and auto-increments with each order.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Alphanumeric Prefix + Numeric ID:</strong> All generated tracking numbers strictly follow the pattern <span className="font-mono font-bold text-blue-950">"{activePrefix}{nextNumber}"</span> without hyphens or random letters.
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
              <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarcodeIcon className="w-4 h-4 text-primary" />
              Live ID Preview
            </h3>

            <div className="bg-slate-900 text-white rounded-xl p-4 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Generated Tracking ID</span>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                {previewList[0]}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Upcoming Sequential IDs:</span>
              <div className="space-y-1.5">
                {previewList.map((id, index) => (
                  <div
                    key={id}
                    className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg font-mono ${
                      index === 0
                        ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                        : 'bg-slate-50 text-slate-700'
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
    </div>
  );
}

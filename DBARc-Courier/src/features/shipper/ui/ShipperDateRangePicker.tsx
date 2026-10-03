'use client';

import * as React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface ShipperDateRangePickerProps {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
}

export function ShipperDateRangePicker({ fromDate, toDate, onChange }: ShipperDateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFrom, setLocalFrom] = React.useState(fromDate);
  const [localTo, setLocalTo] = React.useState(toDate);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const displayText = React.useMemo(() => {
    const fStr = formatDateDisplay(fromDate);
    const tStr = formatDateDisplay(toDate);
    if (fStr && tStr) return `${fStr} – ${tStr}`;
    return fStr || tStr || 'Select Date Range';
  }, [fromDate, toDate]);

  const setPreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

    if (preset === 'today') {
      onChange(todayIso, todayIso);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      onChange(past.toISOString().split('T')[0], todayIso);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      onChange(past.toISOString().split('T')[0], todayIso);
    } else if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      onChange(start.toISOString().split('T')[0], todayIso);
    } else if (preset === 'all') {
      onChange('2020-01-01', todayIso);
    }
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    onChange(localFrom, localTo);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
        <span>{displayText}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap gap-1.5 pb-3 mb-3 border-b border-slate-100">
            <button
              onClick={() => setPreset('today')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setPreset('7days')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPreset('30days')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setPreset('thisMonth')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => setPreset('all')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition cursor-pointer"
            >
              All Time
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

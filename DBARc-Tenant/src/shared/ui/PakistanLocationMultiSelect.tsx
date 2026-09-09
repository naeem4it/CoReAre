'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { 
  PAKISTAN_LOCATION_DATA, 
  FLAT_PAKISTAN_LOCATIONS, 
  FlatPakistanLocation, 
  findPakistanLocation 
} from '@/shared/data/pakistan-locations';
import { MapPin, Search, ChevronDown, Check, X, Layers, Plus } from 'lucide-react';

export interface PakistanLocationMultiSelectProps {
  value: (string | number)[];
  onChange: (selectedNames: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
  allDbCities?: any[];
}

export const PakistanLocationMultiSelect: React.FC<PakistanLocationMultiSelectProps> = ({
  value = [],
  onChange,
  label = 'Service Coverage Areas / Cities',
  placeholder = 'Search & select cities, tehsils, or whole districts...',
  error,
  required = false,
  className = ''
}) => {
  const [activeProvince, setActiveProvince] = React.useState<string>('All');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Normalize current values to string names
  const selectedSet = React.useMemo(() => {
    const set = new Set<string>();
    (value || []).forEach(v => {
      if (typeof v === 'number') {
        const found = FLAT_PAKISTAN_LOCATIONS.find(l => l.id === v);
        if (found) set.add(found.cityName);
        else set.add(String(v));
      } else if (typeof v === 'string' && v.trim()) {
        const found = findPakistanLocation(v);
        if (found) set.add(found.cityName);
        else set.add(v.trim());
      }
    });
    return set;
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLocations = React.useMemo(() => {
    return FLAT_PAKISTAN_LOCATIONS.filter(loc => {
      if (activeProvince !== 'All' && loc.province !== activeProvince) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          loc.cityName.toLowerCase().includes(q) ||
          loc.district.toLowerCase().includes(q) ||
          loc.province.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeProvince, searchTerm]);

  const toggleLocation = (cityName: string) => {
    const next = new Set(selectedSet);
    if (next.has(cityName)) {
      next.delete(cityName);
    } else {
      next.add(cityName);
    }
    onChange(Array.from(next));
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedSet);
    filteredLocations.forEach(loc => next.add(loc.cityName));
    onChange(Array.from(next));
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedSet);
    filteredLocations.forEach(loc => next.delete(loc.cityName));
    onChange(Array.from(next));
  };

  const addMajorHubs = () => {
    const majorCities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Sukkur'];
    const next = new Set(selectedSet);
    majorCities.forEach(c => next.add(c));
    onChange(Array.from(next));
  };

  const clearAll = () => {
    onChange([]);
  };

  const [isMounted, setIsMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={`w-full space-y-2 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addMajorHubs}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
          >
            + Add Major Hubs
          </button>
          {selectedSet.size > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
            >
              Clear All ({selectedSet.size})
            </button>
          )}
        </div>
      </div>

      {/* Trigger Button - clicking opens the full-screen selection popup */}
      <div 
        onClick={() => setIsOpen(true)}
        className="min-h-[48px] p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl flex flex-wrap items-center gap-1.5 cursor-pointer transition-all shadow-xs group"
        title="Click to open full location selection popup"
      >
        {selectedSet.size === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 px-1 py-0.5 select-none">
            <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span>{placeholder}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from(selectedSet).slice(0, 8).map(city => (
              <span
                key={city}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in"
              >
                <span>{city}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLocation(city);
                  }}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 rounded text-blue-500 hover:text-blue-900 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedSet.size > 8 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                +{selectedSet.size - 8} more
              </span>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 pl-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-all">
            {selectedSet.size > 0 ? `Manage (${selectedSet.size})` : 'Browse Cities'}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>

      {/* Spacious Location Picker Popup Modal */}
      {isOpen && isMounted && typeof document !== 'undefined' && (
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Select Covered Locations
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {selectedSet.size} Selected
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Search and choose cities, tehsils, and regional coverage zones across Pakistan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Province Tabs */}
              <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5 text-xs">
                {['All', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].map(prov => {
                  const label = prov === 'Islamabad Capital Territory' ? 'Islamabad' : prov === 'Azad Jammu & Kashmir' ? 'AJK' : prov === 'Khyber Pakhtunkhwa' ? 'KPK' : prov;
                  const isActive = activeProvince === prov;
                  return (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setActiveProvince(prov)}
                      className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Search & Action Bar */}
              <div className="p-4 sm:px-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by city, district, or province..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={addMajorHubs}
                    className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 whitespace-nowrap transition-colors"
                  >
                    + Major Metros
                  </button>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 whitespace-nowrap transition-colors"
                  >
                    Select Shown ({filteredLocations.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllFiltered}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 whitespace-nowrap transition-colors"
                  >
                    Unselect Shown
                  </button>
                  {selectedSet.size > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 whitespace-nowrap transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* City Selection Grid Area */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[52vh]">
                {filteredLocations.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <MapPin className="w-10 h-10 mb-2 opacity-30" />
                    <p className="font-semibold">No locations found matching &quot;{searchTerm}&quot;</p>
                    <p className="text-xs mt-1">Try another search keyword or switch province tabs.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {filteredLocations.map(loc => {
                      const isSelected = selectedSet.has(loc.cityName);
                      return (
                        <button
                          key={`${loc.province}-${loc.district}-${loc.tehsil}-${loc.cityName}`}
                          type="button"
                          onClick={() => toggleLocation(loc.cityName)}
                          className={`flex items-start justify-between p-2.5 text-left rounded-xl border text-xs transition-all ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-500 text-blue-950 dark:bg-blue-950/50 dark:border-blue-600 dark:text-blue-100 font-bold shadow-xs ring-1 ring-blue-500/30'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="min-w-0 pr-1.5 flex-1">
                            <div className="truncate text-sm font-semibold">{loc.cityName}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
                              {loc.district} • {loc.province === 'Islamabad Capital Territory' ? 'ICT' : loc.province}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            isSelected ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSet.size}</span> locations selected
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
                  >
                    Done / Apply Selection ({selectedSet.size})
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};


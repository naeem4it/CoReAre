'use client';

import * as React from 'react';
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

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered locations
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

      {/* Selected Tags Display */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`min-h-[46px] p-2 bg-white dark:bg-slate-900 border rounded-xl flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${
          isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
        }`}
      >
        {selectedSet.size === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 px-2 py-1 select-none">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{placeholder}</span>
          </div>
        ) : (
          Array.from(selectedSet).map(city => (
            <span
              key={city}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg group animate-in fade-in"
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
          ))
        )}
        <div className="ml-auto pr-1">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl space-y-3 z-50">
          {/* Province Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
            {['All', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].map(prov => (
              <button
                key={prov}
                type="button"
                onClick={() => setActiveProvince(prov)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeProvince === prov
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {prov === 'Islamabad Capital Territory' ? 'Islamabad' : prov === 'Azad Jammu & Kashmir' ? 'AJK' : prov === 'Khyber Pakhtunkhwa' ? 'KPK' : prov}
              </button>
            ))}
          </div>

          {/* Search bar & quick batch actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Type to filter cities..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100"
            >
              Select Shown ({filteredLocations.length})
            </button>
            <button
              type="button"
              onClick={deselectAllFiltered}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200"
            >
              Unselect
            </button>
          </div>

          {/* Grid of Locations */}
          <div className="max-h-60 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {filteredLocations.slice(0, 120).map(loc => {
              const isSelected = selectedSet.has(loc.cityName);
              return (
                <button
                  key={`${loc.province}-${loc.district}-${loc.tehsil}`}
                  type="button"
                  onClick={() => toggleLocation(loc.cityName)}
                  className={`flex items-center justify-between p-2 text-left rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-200 font-semibold'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate pr-1">
                    <div className="truncate">{loc.cityName}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                      {loc.district}
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredLocations.length > 120 && (
            <p className="text-[11px] text-center text-slate-400">
              Showing top 120 of {filteredLocations.length} locations. Type in search bar to narrow results.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

'use client';

import * as React from 'react';
import { 
  PAKISTAN_LOCATION_DATA, 
  FLAT_PAKISTAN_LOCATIONS, 
  FlatPakistanLocation, 
  findPakistanLocation 
} from '@/shared/data/pakistan-locations';
import { MapPin, Search, ChevronDown, Check, X, RotateCcw } from 'lucide-react';

export interface PakistanLocationDetails {
  province: string;
  district: string;
  tehsil: string;
  cityName: string;
  fullName: string;
  id?: number | string | undefined;
}

export interface PakistanLocationSelectProps {
  value?: number | string | undefined | null;
  onChange: (value: string | number, details?: any, location?: any) => void;
  label?: string | undefined;
  placeholder?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  showLabels?: boolean | undefined;
  layout?: 'horizontal' | 'vertical' | undefined;
}

export const PakistanLocationSelect: React.FC<PakistanLocationSelectProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select or search Pakistan location...',
  error,
  required = false,
  className = '',
  showLabels = true,
  layout = 'horizontal'
}) => {
  const [selectedProvince, setSelectedProvince] = React.useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>('');
  const [selectedTehsil, setSelectedTehsil] = React.useState<string>('');

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = React.useState<'province' | 'district' | 'tehsil' | 'search' | null>(null);

  // Search filter inputs within dropdowns
  const [provinceSearch, setProvinceSearch] = React.useState('');
  const [districtSearch, setDistrictSearch] = React.useState('');
  const [tehsilSearch, setTehsilSearch] = React.useState('');
  const [directSearch, setDirectSearch] = React.useState('');

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync internal state when external value changes
  React.useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const match = findPakistanLocation(value);
      if (match) {
        setSelectedProvince(match.province);
        setSelectedDistrict(match.district);
        setSelectedTehsil(match.tehsil);
      } else if (typeof value === 'string') {
        setSelectedTehsil(value);
      }
    } else {
      setSelectedProvince('');
      setSelectedDistrict('');
      setSelectedTehsil('');
    }
  }, [value]);

  // Province list
  const provinces = React.useMemo(() => {
    return PAKISTAN_LOCATION_DATA.map(p => p.name).filter(p => 
      p.toLowerCase().includes(provinceSearch.toLowerCase())
    );
  }, [provinceSearch]);

  // District list (filtered by province if chosen)
  const districts = React.useMemo(() => {
    let list: { name: string; province: string }[] = [];
    PAKISTAN_LOCATION_DATA.forEach(prov => {
      if (!selectedProvince || prov.name === selectedProvince) {
        prov.districts.forEach(dist => {
          list.push({ name: dist.name, province: prov.name });
        });
      }
    });

    if (districtSearch.trim()) {
      const q = districtSearch.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q));
    }
    return list;
  }, [selectedProvince, districtSearch]);

  // Tehsil list (filtered by district and province if chosen)
  const tehsils = React.useMemo(() => {
    let list: FlatPakistanLocation[] = [];
    PAKISTAN_LOCATION_DATA.forEach(prov => {
      if (!selectedProvince || prov.name === selectedProvince) {
        prov.districts.forEach(dist => {
          if (!selectedDistrict || dist.name === selectedDistrict) {
            dist.tehsils.forEach(tehsil => {
              list.push({
                province: prov.name,
                district: dist.name,
                tehsil: tehsil.name,
                cityName: tehsil.name,
                fullName: `${tehsil.name}, ${dist.name}, ${prov.name}`,
                isMajorCity: Boolean(tehsil.isMajorCity)
              });
            });
          }
        });
      }
    });

    if (tehsilSearch.trim()) {
      const q = tehsilSearch.toLowerCase();
      list = list.filter(t => t.tehsil.toLowerCase().includes(q));
    }
    return list;
  }, [selectedProvince, selectedDistrict, tehsilSearch]);

  // Unified direct search results
  const directSearchResults = React.useMemo(() => {
    if (!directSearch.trim()) return [];
    const q = directSearch.toLowerCase().trim();
    return FLAT_PAKISTAN_LOCATIONS.filter(item =>
      item.tehsil.toLowerCase().includes(q) ||
      item.district.toLowerCase().includes(q) ||
      item.province.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [directSearch]);

  // Notify parent component
  const emitChange = (prov: string, dist: string, teh: string) => {
    const cityName = teh || dist || prov;
    const details: PakistanLocationDetails = {
      province: prov,
      district: dist,
      tehsil: teh,
      cityName,
      fullName: [teh, dist, prov].filter(Boolean).join(', ')
    };
    onChange(cityName, cityName, details);
  };

  // Handlers for selection
  const handleSelectProvince = (prov: string) => {
    setSelectedProvince(prov);
    // If current district doesn't belong to this province, reset child fields
    const provData = PAKISTAN_LOCATION_DATA.find(p => p.name === prov);
    const hasDist = provData?.districts.some(d => d.name === selectedDistrict);
    const newDist = hasDist ? selectedDistrict : '';
    const newTeh = hasDist ? selectedTehsil : '';
    setSelectedDistrict(newDist);
    setSelectedTehsil(newTeh);
    setOpenDropdown(null);
    setProvinceSearch('');
    emitChange(prov, newDist, newTeh);
  };

  const handleSelectDistrict = (distName: string, provName: string) => {
    setSelectedProvince(provName);
    setSelectedDistrict(distName);
    // If current tehsil doesn't belong to this district, clear it
    const provData = PAKISTAN_LOCATION_DATA.find(p => p.name === provName);
    const distData = provData?.districts.find(d => d.name === distName);
    const hasTeh = distData?.tehsils.some(t => t.name === selectedTehsil);
    const newTeh = hasTeh ? selectedTehsil : (distData?.tehsils[0]?.name || distName);
    setSelectedTehsil(newTeh);
    setOpenDropdown(null);
    setDistrictSearch('');
    emitChange(provName, distName, newTeh);
  };

  const handleSelectTehsil = (item: FlatPakistanLocation) => {
    setSelectedProvince(item.province);
    setSelectedDistrict(item.district);
    setSelectedTehsil(item.tehsil);
    setOpenDropdown(null);
    setTehsilSearch('');
    setDirectSearch('');
    emitChange(item.province, item.district, item.tehsil);
  };

  const handleReset = () => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedTehsil('');
    setDirectSearch('');
    setOpenDropdown(null);
    onChange('', '', { province: '', district: '', tehsil: '', cityName: '', fullName: '' });
  };

  const isComplete = Boolean(selectedProvince && selectedDistrict && selectedTehsil);

  return (
    <div className={`flex flex-col gap-2 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {(selectedProvince || selectedDistrict || selectedTehsil) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Direct Search Bar (Quick Pick Mode B) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={directSearch}
            onChange={(e) => {
              setDirectSearch(e.target.value);
              if (!openDropdown) setOpenDropdown('search');
            }}
            onFocus={() => {
              if (directSearch.trim()) setOpenDropdown('search');
            }}
            placeholder={isComplete ? `${selectedTehsil}, ${selectedDistrict}, ${selectedProvince}` : placeholder}
            className={`w-full text-xs pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border rounded-xl outline-none transition-all ${
              error 
                ? 'border-red-400 focus:ring-2 focus:ring-red-400/20' 
                : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary'
            } text-slate-900 dark:text-white placeholder-slate-400`}
          />
          {directSearch && (
            <button
              type="button"
              onClick={() => setDirectSearch('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Unified Search Dropdown Results */}
        {openDropdown === 'search' && directSearchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Matching Pakistan Cities & Towns ({directSearchResults.length})
            </div>
            {directSearchResults.map((loc, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectTehsil(loc)}
                className="px-3 py-2 text-xs hover:bg-primary-50 dark:hover:bg-primary-950/40 cursor-pointer flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary">
                      {loc.tehsil}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5">
                      ({loc.district}, {loc.province})
                    </span>
                  </div>
                </div>
                {loc.tehsil === selectedTehsil && loc.district === selectedDistrict && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode A: Three Synchronized Selectable Dropdowns */}
      <div className={`grid ${layout === 'horizontal' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'} gap-2.5 mt-0.5`}>
        
        {/* 1. Province Dropdown */}
        <div className="relative">
          {showLabels && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              1. Province
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'province' ? null : 'province')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition-all ${
              selectedProvince
                ? 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold'
                : 'border-slate-200 dark:border-slate-700 text-slate-400'
            } hover:border-slate-400`}
          >
            <span className="truncate">{selectedProvince || 'All Provinces'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdown === 'province' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'province' && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={provinceSearch}
                  onChange={(e) => setProvinceSearch(e.target.value)}
                  placeholder="Search province..."
                  autoFocus
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {provinces.map(prov => (
                  <div
                    key={prov}
                    onClick={() => handleSelectProvince(prov)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between ${
                      prov === selectedProvince
                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{prov}</span>
                    {prov === selectedProvince && <Check className="w-3.5 h-3.5" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. District / City Dropdown */}
        <div className="relative">
          {showLabels && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              2. District / City
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'district' ? null : 'district')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition-all ${
              selectedDistrict
                ? 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold'
                : 'border-slate-200 dark:border-slate-700 text-slate-400'
            } hover:border-slate-400`}
          >
            <span className="truncate">{selectedDistrict || (selectedProvince ? `Select in ${selectedProvince}` : 'Select District')}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdown === 'district' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'district' && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  placeholder="Search district / city..."
                  autoFocus
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {districts.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No districts found</div>
                ) : (
                  districts.map(dist => (
                    <div
                      key={dist.name}
                      onClick={() => handleSelectDistrict(dist.name, dist.province)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between ${
                        dist.name === selectedDistrict
                          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <span>{dist.name}</span>
                        {!selectedProvince && (
                          <span className="text-[10px] text-slate-400 ml-1.5">({dist.province})</span>
                        )}
                      </div>
                      {dist.name === selectedDistrict && <Check className="w-3.5 h-3.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Tehsil / City / Town Dropdown */}
        <div className="relative">
          {showLabels && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              3. Tehsil / Town / City
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'tehsil' ? null : 'tehsil')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition-all ${
              selectedTehsil
                ? 'border-primary/50 text-slate-900 dark:text-white font-bold bg-primary-50/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-400'
            } hover:border-slate-400`}
          >
            <span className="truncate">{selectedTehsil || (selectedDistrict ? `Select in ${selectedDistrict}` : 'Select Tehsil/Town')}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDropdown === 'tehsil' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'tehsil' && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={tehsilSearch}
                  onChange={(e) => setTehsilSearch(e.target.value)}
                  placeholder="Search tehsil, city or town..."
                  autoFocus
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div className="max-h-56 overflow-y-auto p-1">
                {tehsils.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No towns/tehsils found</div>
                ) : (
                  tehsils.map(t => (
                    <div
                      key={t.fullName}
                      onClick={() => handleSelectTehsil(t)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between ${
                        t.tehsil === selectedTehsil && t.district === selectedDistrict
                          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-medium">{t.tehsil}</span>
                        {(!selectedDistrict || !selectedProvince) && (
                          <span className="text-[10px] text-slate-400 ml-1.5">({t.district})</span>
                        )}
                      </div>
                      {t.tehsil === selectedTehsil && t.district === selectedDistrict && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Selected Location Pill */}
      {isComplete && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold animate-in fade-in duration-200">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold">{selectedTehsil}</span>
          <span className="text-emerald-500">&bull;</span>
          <span>District: {selectedDistrict}</span>
          <span className="text-emerald-500">&bull;</span>
          <span>Province: {selectedProvince}</span>
        </div>
      )}

      {error && <p className="text-[11px] font-bold text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

'use client';

import * as React from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface City {
  id: number;
  name: string;
}

interface CityMultiSelectProps {
  value: number[];
  onChange: (cityIds: number[]) => void;
  placeholder?: string;
  error?: string;
}

export const CityMultiSelect = ({ value, onChange, placeholder = 'Search cities...', error }: CityMultiSelectProps) => {
  const [cities, setCities] = React.useState<City[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await apiClient.get('/cities?pagination[limit]=200');
        if (res.data?.data) {
          setCities(res.data.data.map((c: any) => ({
            id: c.id,
            name: c.attributes?.name || c.name || '',
          })));
        }
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    };
    fetchCities();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = React.useMemo(() => {
    return cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [cities, search]);

  const toggleCity = (cityId: number) => {
    if (value.includes(cityId)) {
      onChange(value.filter(id => id !== cityId));
    } else {
      onChange([...value, cityId]);
    }
  };

  const removeCity = (e: React.MouseEvent, cityId: number) => {
    e.stopPropagation();
    onChange(value.filter(id => id !== cityId));
  };

  const selectedCities = cities.filter(c => value.includes(c.id));

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[40px] px-3 py-1.5 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-primary-500`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 pr-2">
          {selectedCities.length > 0 ? (
            selectedCities.map(city => (
              <span key={city.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium border border-slate-200">
                {city.name}
                <X 
                  className="w-3 h-3 hover:text-red-500 cursor-pointer" 
                  onClick={(e) => removeCity(e, city.id)}
                />
              </span>
            ))
          ) : (
            <span className="text-slate-400 py-0.5">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => {
                const isSelected = value.includes(city.id);
                return (
                  <div
                    key={city.id}
                    onClick={() => toggleCity(city.id)}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer flex items-center gap-3 hover:bg-slate-50`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={isSelected ? 'text-slate-900 font-medium' : 'text-slate-700'}>
                      {city.name}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-center text-slate-500">No cities found.</div>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};

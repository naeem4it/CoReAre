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

  const selectedCities = cities.filter(c => value.includes(c.id));

  const toggleCity = (cityId: number) => {
    if (value.includes(cityId)) {
      onChange(value.filter(id => id !== cityId));
    } else {
      onChange([...value, cityId]);
    }
  };

  const removeCity = (cityId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(id => id !== cityId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[40px] px-3 py-1.5 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm flex flex-wrap gap-1.5 items-center cursor-pointer focus-within:ring-2 focus-within:ring-primary-500`}
      >
        {selectedCities.length > 0 ? (
          selectedCities.map(city => (
            <span key={city.id} className="flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md text-xs font-medium">
              {city.name}
              <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={(e) => removeCity(city.id, e)} />
            </span>
          ))
        ) : (
          <span className="text-slate-400 py-0.5">{placeholder}</span>
        )}
        <div className="ml-auto">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
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
              filteredCities.map((city) => (
                <div
                  key={city.id}
                  onClick={() => toggleCity(city.id)}
                  className={`px-3 py-2 text-sm rounded-md cursor-pointer flex items-center justify-between ${value.includes(city.id) ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {city.name}
                  {value.includes(city.id) && <Check className="w-4 h-4 text-primary-600" />}
                </div>
              ))
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

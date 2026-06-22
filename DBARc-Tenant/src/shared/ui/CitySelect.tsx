'use client';

import * as React from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface City {
  id: number;
  name: string;
}

interface CitySelectProps {
  value: number | '';
  onChange: (cityId: number | '') => void;
  placeholder?: string;
  error?: string;
}

export const CitySelect = ({ value, onChange, placeholder = 'Search city...', error }: CitySelectProps) => {
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

  const selectedCity = cities.find(c => c.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-primary-500`}
      >
        <span className={selectedCity ? 'text-slate-800' : 'text-slate-400'}>
          {selectedCity ? selectedCity.name : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                  onClick={() => {
                    onChange(city.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-3 py-2 text-sm rounded-md cursor-pointer flex items-center justify-between ${value === city.id ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {city.name}
                  {value === city.id && <Check className="w-4 h-4 text-primary-600" />}
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

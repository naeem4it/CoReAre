'use client';

import * as React from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface City {
  id: number;
  name: string;
}

interface CitySelectProps {
  value: number | string | '';
  onChange: (cityId: number | string | '', cityName?: string) => void;
  placeholder?: string | undefined;
  error?: string | undefined;
}

const DEFAULT_CITIES: City[] = [
  { id: 1, name: 'Karachi' },
  { id: 2, name: 'Lahore' },
  { id: 3, name: 'Islamabad' },
  { id: 4, name: 'Rawalpindi' },
  { id: 5, name: 'Faisalabad' },
  { id: 6, name: 'Multan' },
  { id: 7, name: 'Peshawar' },
  { id: 8, name: 'Quetta' },
  { id: 9, name: 'Gujranwala' },
  { id: 10, name: 'Sialkot' },
  { id: 11, name: 'Hyderabad' },
  { id: 12, name: 'Sukkur' },
  { id: 13, name: 'Bahawalpur' },
  { id: 14, name: 'Sargodha' },
  { id: 15, name: 'Abbottabad' },
  { id: 16, name: 'Mardan' },
  { id: 17, name: 'Gujrat' },
  { id: 18, name: 'Sahiwal' },
  { id: 19, name: 'Larkana' },
  { id: 20, name: 'Sheikhupura' },
  { id: 21, name: 'Jhelum' },
  { id: 22, name: 'Okara' },
  { id: 23, name: 'Rahim Yar Khan' },
  { id: 24, name: 'Muzaffargarh' },
  { id: 25, name: 'Dera Ghazi Khan' },
  { id: 26, name: 'Nawabshah (Shaheed Benazirabad)' },
  { id: 27, name: 'Mingora (Swat)' },
  { id: 28, name: 'Chiniot' },
  { id: 29, name: 'Kamoke' },
  { id: 30, name: 'Hafizabad' },
  { id: 31, name: 'Sadiqabad' },
  { id: 32, name: 'Mirpur Khas' },
  { id: 33, name: 'Burewala' },
  { id: 34, name: 'Kohat' },
  { id: 35, name: 'Khanewal' },
  { id: 36, name: 'Dera Ismail Khan' },
  { id: 37, name: 'Turbat' },
  { id: 38, name: 'Muzaffarabad' },
  { id: 39, name: 'Mirpur (AJK)' },
  { id: 40, name: 'Kotli' },
  { id: 41, name: 'Rawalakot' },
  { id: 42, name: 'Gilgit' },
  { id: 43, name: 'Skardu' },
  { id: 44, name: 'Gwadar' },
  { id: 45, name: 'Khuzdar' },
  { id: 46, name: 'Jacobabad' },
  { id: 47, name: 'Shikarpur' },
  { id: 48, name: 'Attock' },
  { id: 49, name: 'Chakwal' },
  { id: 50, name: 'Kasur' },
  { id: 51, name: 'Jhang' },
  { id: 52, name: 'Vehari' },
  { id: 53, name: 'Bahawalnagar' },
  { id: 54, name: 'Mandi Bahauddin' },
  { id: 55, name: 'Pakpattan' },
  { id: 56, name: 'Toba Tek Singh' },
  { id: 57, name: 'Haripur' },
  { id: 58, name: 'Swabi' },
  { id: 59, name: 'Nowshera' },
  { id: 60, name: 'Mansehra' },
  { id: 61, name: 'Charsadda' },
  { id: 62, name: 'Bannu' },
  { id: 63, name: 'Chaman' },
  { id: 64, name: 'Hub' },
  { id: 65, name: 'Ghotki' },
  { id: 66, name: 'Khairpur' },
  { id: 67, name: 'Dadu' },
  { id: 68, name: 'Badin' },
  { id: 69, name: 'Thatta' },
  { id: 70, name: 'Tando Adam' },
  { id: 71, name: 'Tando Allahyar' },
  { id: 72, name: 'Wazirabad' },
  { id: 73, name: 'Muridke' },
  { id: 74, name: 'Gojra' },
  { id: 75, name: 'Layyah' },
  { id: 76, name: 'Kot Addu' },
  { id: 77, name: 'Lodhran' },
  { id: 78, name: 'Mianwali' },
  { id: 79, name: 'Bhakkar' },
  { id: 80, name: 'Khushab' }
];

export const CitySelect = ({ value, onChange, placeholder = 'Search or select Pakistan city...', error }: CitySelectProps) => {
  const [cities, setCities] = React.useState<City[]>(DEFAULT_CITIES);
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await apiClient.get('/cities?pagination[limit]=1000');
        const rawList = res.data?.data || res.data || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
          const apiMapped: City[] = rawList
            .map((c: any) => ({
              id: c.id || Math.random(),
              name: (c.attributes?.name || c.name || c.cityName || c.title || '').trim(),
            }))
            .filter((c: City) => c.name.length > 0);

          if (apiMapped.length > 0) {
            // Merge with DEFAULT_CITIES to guarantee full city coverage
            const merged = [...apiMapped];
            DEFAULT_CITIES.forEach(def => {
              if (!merged.some(m => m.name.toLowerCase() === def.name.toLowerCase())) {
                merged.push(def);
              }
            });
            setCities(merged);
          }
        }
      } catch (err) {
        console.warn('Could not fetch cities from API, using default list:', err);
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
    if (!search.trim()) return cities;
    return cities.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [cities, search]);

  const selectedCity = React.useMemo(() => {
    if (!value) return null;
    return cities.find(c => 
      c.id === value || 
      c.name === value || 
      c.id === Number(value) || 
      c.name.toLowerCase() === String(value).toLowerCase()
    );
  }, [cities, value]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-primary-500`}
      >
        <span className={selectedCity ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {selectedCity ? selectedCity.name : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in duration-150">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Search city name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => {
                const isSelected = selectedCity?.name === city.name || value === city.id || value === city.name;

                return (
                  <div
                    key={city.id}
                    onClick={() => {
                      onChange(city.id, city.name);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer flex items-center justify-between transition-colors
                      ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <span>{city.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
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

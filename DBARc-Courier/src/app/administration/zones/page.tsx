'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { PakistanLocationMultiSelect } from '@/components/ui/PakistanLocationMultiSelect';
import { FLAT_PAKISTAN_LOCATIONS } from '@/shared/data/pakistan-locations';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  Building2, 
  Check, 
  X, 
  AlertCircle,
  HelpCircle,
  GripVertical,
  Globe,
  ShieldCheck
} from 'lucide-react';

interface CityItem {
  id: number;
  name: string;
}

interface RegionItem {
  id: number;
  documentId?: string | undefined;
  name: string;
  type?: string | undefined;
  active: boolean;
  cities: CityItem[];
}

const DEFAULT_PAKISTAN_CITIES: CityItem[] = [
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

const DEFAULT_SYSTEM_ZONES = [
  {
    name: 'Within City',
    type: 'Local Hubs',
    cities: []
  },
  {
    name: 'Zone A',
    type: 'Major Metros',
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi']
  },
  {
    name: 'Zone B',
    type: 'Regional Hubs',
    cities: ['Faisalabad', 'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Gujrat', 'Sahiwal', 'Sheikhupura', 'Jhelum']
  },
  {
    name: 'Zone C',
    type: 'Secondary Cities',
    cities: ['Quetta', 'Sukkur', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Mardan', 'Larkana', 'Okara', 'Rahim Yar Khan', 'Muzaffargarh', 'Dera Ghazi Khan', 'Nawabshah (Shaheed Benazirabad)', 'Chiniot']
  },
  {
    name: 'Zone D',
    type: 'Remote / Other',
    cities: [
      'Gwadar', 'Gilgit', 'Skardu', 'Turbat', 'Khuzdar', 'Chaman', 'Bannu',
      'Dera Ismail Khan', 'Mirpur (AJK)', 'Muzaffarabad', 'Kotli', 'Rawalakot',
      'Haripur', 'Swabi', 'Nowshera', 'Mansehra', 'Mingora (Swat)', 'Attock',
      'Chakwal', 'Jacobabad', 'Shikarpur', 'Jhang', 'Vehari', 'Bahawalnagar',
      'Mandi Bahauddin', 'Pakpattan', 'Toba Tek Singh', 'Charsadda', 'Hub',
      'Ghotki', 'Khairpur', 'Dadu', 'Badin', 'Thatta', 'Tando Adam',
      'Tando Allahyar', 'Wazirabad', 'Muridke', 'Gojra', 'Layyah', 'Kot Addu',
      'Lodhran', 'Mianwali', 'Bhakkar', 'Khushab', 'Kamoke', 'Hafizabad',
      'Sadiqabad', 'Mirpur Khas', 'Burewala', 'Kohat', 'Khanewal', 'Kasur'
    ]
  }
];

export default function ZoneSetupPage() {
  const { user } = useAuth();
  const [regions, setRegions] = React.useState<RegionItem[]>([]);
  const [allDbCities, setAllDbCities] = React.useState<CityItem[]>(DEFAULT_PAKISTAN_CITIES);
  const [isUsingGlobalDefaults, setIsUsingGlobalDefaults] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [citySearchQuery, setCitySearchQuery] = React.useState('');
  const [quickAddZoneId, setQuickAddZoneId] = React.useState<number | null>(null);
  const [quickAddCityId, setQuickAddCityId] = React.useState<number | string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRegion, setEditingRegion] = React.useState<RegionItem | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formType, setFormType] = React.useState('regional');
  const [formActive, setFormActive] = React.useState(true);
  const [formCityIds, setFormCityIds] = React.useState<(number | string)[]>([]);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drag & Drop states
  const [draggedCity, setDraggedCity] = React.useState<{ cityId: number; cityName: string; sourceRegionId: number } | null>(null);
  const [dragOverRegionId, setDragOverRegionId] = React.useState<number | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const tenantId = React.useMemo(() => {
    return user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : 2);
  }, [user]);

  // Helper to map raw region data from Strapi
  const mapRegions = (rawData: any[]): RegionItem[] => {
    return rawData.map((r: any) => {
      const attrs = r.attributes || r;
      const rawCities = attrs.cities?.data || attrs.cities || [];
      const citiesList: CityItem[] = rawCities.map((c: any) => {
        const cAttrs = c.attributes || c;
        return {
          id: c.id,
          name: (cAttrs.CityName || cAttrs.cityName || cAttrs.name || `City #${c.id}`).trim()
        };
      });

      return {
        id: r.id,
        documentId: r.documentId,
        name: attrs.name || 'Unnamed Zone',
        type: attrs.type || 'Custom',
        active: attrs.active ?? true,
        cities: citiesList
      };
    });
  };

  // Fetch Cities & Regions
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch cities
      const citiesRes = await apiClient.get('/cities?pagination[limit]=1000').catch(() => null);
      let loadedCities: CityItem[] = DEFAULT_PAKISTAN_CITIES;
      if (citiesRes?.data?.data && Array.isArray(citiesRes.data.data) && citiesRes.data.data.length > 0) {
        const mapped = citiesRes.data.data
          .map((c: any) => ({
            id: c.id,
            name: (c.CityName || c.cityName || c.name || c.attributes?.CityName || c.attributes?.name || '').trim()
          }))
          .filter((c: CityItem) => c.name.length > 0);
        if (mapped.length > 0) {
          loadedCities = mapped;
        }
      }
      setAllDbCities(loadedCities);

      // 2. First attempt: Fetch custom regions specifically configured for this tenant
      const tenantRegionsRes = await apiClient.get('/regions', {
        params: {
          filters: { tenant: tenantId },
          populate: ['cities'],
          pagination: { limit: 100 }
        }
      }).catch(() => null);

      const rawTenantData = tenantRegionsRes?.data?.data || tenantRegionsRes?.data;
      if (Array.isArray(rawTenantData) && rawTenantData.length > 0) {
        setRegions(mapRegions(rawTenantData));
        setIsUsingGlobalDefaults(false);
        return;
      }

      // 3. Second attempt: Fallback to Global Defaults (tenant is null) setup by Super Admin
      const globalDefaultsRes = await apiClient.get('/regions', {
        params: {
          filters: { tenant: { $null: true } },
          populate: ['cities'],
          pagination: { limit: 100 }
        }
      }).catch(() => null);

      const rawGlobalData = globalDefaultsRes?.data?.data || globalDefaultsRes?.data;
      if (Array.isArray(rawGlobalData) && rawGlobalData.length > 0) {
        setRegions(mapRegions(rawGlobalData));
        setIsUsingGlobalDefaults(true);
        return;
      }

      // If no zones configured in database, keep empty state
      setRegions([]);
      setIsUsingGlobalDefaults(false);
    } catch (err) {
      console.error('Failed to load zone setup data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [tenantId]);

  // Fork global default zones into tenant-specific records when courier makes changes
  const ensureTenantSpecificZones = async (currentList: RegionItem[] = regions): Promise<RegionItem[]> => {
    if (!isUsingGlobalDefaults) {
      return currentList;
    }

    try {
      const createdList: RegionItem[] = [];
      for (const reg of currentList) {
        const cityIds = reg.cities.map(c => c.id).filter(id => id > 0);
        const res = await apiClient.post('/regions', {
          data: {
            name: reg.name,
            type: reg.type || 'Custom',
            active: reg.active,
            tenant: tenantId,
            cities: cityIds
          }
        });
        const newRec = res.data?.data || res.data;
        createdList.push({
          id: newRec.id,
          documentId: newRec.documentId,
          name: reg.name,
          type: reg.type,
          active: reg.active,
          cities: [...reg.cities]
        });
      }

      setIsUsingGlobalDefaults(false);
      setRegions(createdList);
      showNotification('Global defaults copied to your courier tenant configuration.', 'success');
      return createdList;
    } catch (err) {
      console.error('Failed to clone global defaults for tenant:', err);
      return currentList;
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRegion(null);
    setFormName('');
    setFormType('regional');
    setFormActive(true);
    setFormCityIds([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (region: RegionItem) => {
    setEditingRegion(region);
    setFormName(region.name);
    setFormType(region.type || 'regional');
    setFormActive(region.active);
    setFormCityIds(region.cities.map(c => c.id));
    setIsModalOpen(true);
  };

  // Save Zone
  const handleSaveZone = async () => {
    if (!formName.trim()) {
      alert('Please enter a zone name');
      return;
    }

    try {
      setIsSaving(true);
      const currentRegions = isUsingGlobalDefaults ? await ensureTenantSpecificZones() : regions;

      // Map string city names to DB city IDs if available
      const resolvedCityIds = formCityIds.map(val => {
        if (typeof val === 'number') return val;
        const found = allDbCities.find(c => c.name.toLowerCase() === String(val).toLowerCase());
        return found ? found.id : null;
      }).filter(Boolean);

      const payload = {
        data: {
          name: formName.trim(),
          type: formType,
          active: formActive,
          tenant: tenantId,
          cities: resolvedCityIds
        }
      };

      if (editingRegion) {
        const match = currentRegions.find(r => r.id === editingRegion.id || r.name.toLowerCase() === editingRegion.name.toLowerCase());
        const editKey = match?.documentId || match?.id || editingRegion.documentId || editingRegion.id;
        if (editKey && Number(editKey) > 0) {
          await apiClient.put(`/regions/${editKey}`, payload);
        } else {
          await apiClient.post('/regions', payload);
        }
        showNotification(`Zone "${formName}" updated successfully!`);
      } else {
        await apiClient.post('/regions', payload);
        showNotification(`Zone "${formName}" created successfully!`);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to save zone:', err);
      showNotification('Failed to save zone. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Zone
  const handleDeleteZone = async (regionId: number, regionName: string) => {
    if (!confirm(`Are you sure you want to delete zone "${regionName}"? All cities will become unassigned.`)) {
      return;
    }

    try {
      const currentRegions = isUsingGlobalDefaults ? await ensureTenantSpecificZones() : regions;
      const targetRegion = currentRegions.find(r => r.id === regionId || r.name.toLowerCase() === regionName.toLowerCase());
      const deleteKey = targetRegion?.documentId || targetRegion?.id || regionId;
      if (deleteKey && Number(deleteKey) > 0) {
        await apiClient.delete(`/regions/${deleteKey}`);
      }
      setRegions(prev => prev.filter(r => r.id !== (targetRegion?.id || regionId)));
      showNotification(`Zone "${regionName}" deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete zone:', err);
      showNotification('Failed to delete zone.', 'error');
    }
  };

  // Quick Remove City from Zone
  const handleRemoveCityFromZone = async (region: RegionItem, cityId: number, cityName: string) => {
    try {
      const currentRegions = isUsingGlobalDefaults ? await ensureTenantSpecificZones() : regions;
      const targetRegion = currentRegions.find(r => r.id === region.id || r.name.toLowerCase() === region.name.toLowerCase()) || region;
      const updatedCityIds = targetRegion.cities.filter(c => c.id !== cityId).map(c => c.id);

      setRegions(prev => prev.map(r => {
        if (r.id === targetRegion.id) {
          return {
            ...r,
            cities: r.cities.filter(c => c.id !== cityId)
          };
        }
        return r;
      }));

      const updateKey = targetRegion.documentId || targetRegion.id;
      if (updateKey && Number(updateKey) > 0) {
        await apiClient.put(`/regions/${updateKey}`, {
          data: { cities: updatedCityIds }
        });
      }
      showNotification(`Removed "${cityName}" from ${region.name}`);
    } catch (err) {
      console.error('Failed to remove city:', err);
      showNotification('Failed to update zone on server.', 'error');
      fetchData();
    }
  };

  // Quick Add City to Zone
  const handleQuickAddCity = async (region: RegionItem) => {
    if (!quickAddCityId) return;
    const cityIdNum = Number(quickAddCityId);
    let foundCity = allDbCities.find(c => c.id === cityIdNum);
    if (!foundCity && typeof quickAddCityId === 'string') {
      foundCity = { id: Math.floor(Math.random() * 100000) + 1000, name: quickAddCityId };
    }
    if (!foundCity) return;

    try {
      const currentRegions = isUsingGlobalDefaults ? await ensureTenantSpecificZones() : regions;
      const targetRegion = currentRegions.find(r => r.id === region.id || r.name.toLowerCase() === region.name.toLowerCase()) || region;

      if (targetRegion.cities.some(c => c.name.toLowerCase() === foundCity!.name.toLowerCase())) {
        alert(`"${foundCity.name}" is already in ${region.name}.`);
        return;
      }

      const updatedCities = [...targetRegion.cities, foundCity];
      const updatedCityIds = updatedCities.map(c => c.id).filter(id => id > 0);

      setRegions(prev => prev.map(r => {
        if (r.id === targetRegion.id) {
          return { ...r, cities: updatedCities };
        }
        return r;
      }));

      setQuickAddZoneId(null);
      setQuickAddCityId('');

      const updateKey = targetRegion.documentId || targetRegion.id;
      if (updateKey && Number(updateKey) > 0) {
        await apiClient.put(`/regions/${updateKey}`, {
          data: { cities: updatedCityIds }
        });
      }
      showNotification(`Added "${foundCity.name}" to ${region.name}`);
    } catch (err) {
      console.error('Failed to add city:', err);
      showNotification('Failed to update zone on server.', 'error');
      fetchData();
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, city: CityItem, regionId: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ cityId: city.id, cityName: city.name, sourceRegionId: regionId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCity({ cityId: city.id, cityName: city.name, sourceRegionId: regionId });
  };

  const handleDragOver = (e: React.DragEvent, targetRegionId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRegionId !== targetRegionId) {
      setDragOverRegionId(targetRegionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetRegionId: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverRegionId === targetRegionId) {
      setDragOverRegionId(null);
    }
  };

  const handleDropCity = async (targetRegionId: number) => {
    if (!draggedCity) return;
    const { cityId, cityName, sourceRegionId } = draggedCity;

    setDragOverRegionId(null);
    setDraggedCity(null);

    if (sourceRegionId === targetRegionId) return;

    try {
      const currentRegions = isUsingGlobalDefaults ? await ensureTenantSpecificZones() : regions;
      const sourceRegion = currentRegions.find(r => r.id === sourceRegionId);
      const targetRegion = currentRegions.find(r => r.id === targetRegionId);
      if (!sourceRegion || !targetRegion) return;

      const cityItem = sourceRegion.cities.find(c => c.id === cityId) || { id: cityId, name: cityName };

      if (targetRegion.cities.some(c => c.name.toLowerCase() === cityName.toLowerCase())) {
        showNotification(`"${cityName}" is already in ${targetRegion.name}`, 'error');
        return;
      }

      const updatedSourceCities = sourceRegion.cities.filter(c => c.id !== cityId && c.name.toLowerCase() !== cityName.toLowerCase());
      const updatedTargetCities = [...targetRegion.cities, cityItem];

      setRegions(prev => prev.map(r => {
        if (r.id === sourceRegion.id) return { ...r, cities: updatedSourceCities };
        if (r.id === targetRegion.id) return { ...r, cities: updatedTargetCities };
        return r;
      }));

      showNotification(`Moved "${cityName}" from ${sourceRegion.name} ➔ ${targetRegion.name}!`);

      const promises: Promise<any>[] = [];
      const sourceKey = sourceRegion.documentId || sourceRegion.id;
      const targetKey = targetRegion.documentId || targetRegion.id;

      if (sourceKey && Number(sourceKey) > 0) {
        promises.push(apiClient.put(`/regions/${sourceKey}`, {
          data: { cities: updatedSourceCities.map(c => c.id).filter(id => id > 0) }
        }));
      }
      if (targetKey && Number(targetKey) > 0) {
        promises.push(apiClient.put(`/regions/${targetKey}`, {
          data: { cities: updatedTargetCities.map(c => c.id).filter(id => id > 0) }
        }));
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (err) {
      console.error('Failed to persist drag-drop city to server:', err);
      showNotification('Failed to update server after moving city.', 'error');
      fetchData();
    }
  };

  // Restore System Defaults: Delete all custom tenant-specific zones, reverting to Super Admin defaults
  const handleRestoreDefaults = async () => {
    if (!confirm('This will remove your custom courier zone overrides and revert to the Super Admin Global Default Pakistan courier zones. Proceed?')) {
      return;
    }

    try {
      setIsLoading(true);

      const res = await apiClient.get('/regions', {
        params: {
          filters: { tenant: tenantId },
          pagination: { limit: 100 }
        }
      }).catch(() => null);

      const toDelete = res?.data?.data || res?.data || [];
      for (const reg of toDelete) {
        const key = reg.documentId || reg.id;
        if (key) {
          await apiClient.delete(`/regions/${key}`).catch(() => null);
        }
      }

      await fetchData();
      showNotification('Successfully reverted to Super Admin Global Default Pakistan courier zones!');
    } catch (err) {
      console.error('Failed to restore default zones:', err);
      showNotification('Failed to restore defaults.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Regions based on top search
  const filteredRegions = React.useMemo(() => {
    if (!searchTerm.trim()) return regions;
    const term = searchTerm.toLowerCase();
    return regions.filter(r => 
      r.name.toLowerCase().includes(term) ||
      (r.type && r.type.toLowerCase().includes(term)) ||
      r.cities.some(c => c.name.toLowerCase().includes(term))
    );
  }, [regions, searchTerm]);

  // City Lookup Tool
  const cityLookupResult = React.useMemo(() => {
    if (!citySearchQuery.trim()) return null;
    const query = citySearchQuery.trim().toLowerCase();
    const matched: { zoneName: string; cityName: string }[] = [];

    regions.forEach(reg => {
      reg.cities.forEach(city => {
        if (city.name.toLowerCase().includes(query)) {
          matched.push({ zoneName: reg.name, cityName: city.name });
        }
      });
    });

    return matched;
  }, [regions, citySearchQuery]);

  const totalCitiesMapped = React.useMemo(() => {
    const set = new Set<number>();
    regions.forEach(r => r.cities.forEach(c => set.add(c.id)));
    return set.size;
  }, [regions]);

  return (
    <PortalLayout>
      <div className="flex flex-col gap-6 animate-in fade-in duration-200 pb-16">
        
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white animate-in slide-in-from-top-4 duration-200 ${notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
            <CheckCircle2 className="w-5 h-5" />
            {notification.text}
          </div>
        )}

        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
              <MapPin className="w-4 h-4" />
              ADMINISTRATION & RATE CARDS
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Zone & Region Setup
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Configure delivery zones and assign destination cities according to your operational preferences. The configured zones govern live shipment tariff calculations across the whole system.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs"
              title="Reset zones to default Pakistan courier layout"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Restore System Defaults
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Zone
            </button>
          </div>
        </div>

        {/* Multi-Tenant Scope Banner */}
        {isUsingGlobalDefaults ? (
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    System Default Pakistan Delivery Zones Active
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 tracking-wide uppercase">
                    Global Template
                  </span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  You are currently using the Super Admin system defaults. Any modification (editing, moving cities, creating zones) will safely create your courier-specific setup without altering the global baseline.
                </p>
              </div>
            </div>
            <button
              onClick={() => ensureTenantSpecificZones()}
              className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors self-start sm:self-center"
            >
              Customize for My Courier
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    Courier Custom Zones Active
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 tracking-wide uppercase">
                    Tenant Specific
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  These delivery zones are configured specifically for your courier operation. They override system defaults and govern live parcel tariff calculations.
                </p>
              </div>
            </div>
            <button
              onClick={handleRestoreDefaults}
              className="shrink-0 px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors self-start sm:self-center"
            >
              Revert to System Defaults
            </button>
          </div>
        )}

        {/* Stats & Instant City Lookup Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Configured Zones</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{regions.length} Zones</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Cities Assigned</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{totalCitiesMapped} Cities</div>
            </div>
          </div>

          {/* Interactive City Finder */}
          <div className="md:col-span-2 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                Find City Zone Mapping
              </span>
              {cityLookupResult && cityLookupResult.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {cityLookupResult.length} match found
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="Type a city name (e.g. Faisalabad, Quetta, Multan)..."
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400"
              />
              {citySearchQuery && (
                <button 
                  onClick={() => setCitySearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {cityLookupResult && (
              <div className="mt-2 text-xs flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {cityLookupResult.length > 0 ? (
                  cityLookupResult.map((res, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-lg font-medium text-slate-800 dark:text-slate-200 shadow-2xs">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{res.cityName}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {res.zoneName}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-xs py-0.5">
                    No configured zone contains "{citySearchQuery}". It will automatically fallback to default Zone D (Other).
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter zones or cities..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-semibold border border-indigo-200 dark:border-indigo-900/50">
              <GripVertical className="w-3 h-3 text-indigo-500" />
              Drag & drop any city chip between zones to reorganize
            </span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Syncs live with booking pricing</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Zones with Cities Below */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-xs">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">Loading configured zones & database defaults...</p>
          </div>
        ) : filteredRegions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-xs">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <div className="font-bold text-base text-slate-800 dark:text-white">No zones found</div>
            <p className="text-xs text-slate-500 max-w-md">No zones match your search query, or no zones are configured yet.</p>
            <button
              onClick={handleRestoreDefaults}
              className="mt-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-primary/90"
            >
              Populate Default Zones
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredRegions.map((region) => {
              const isLocalZone = region.name.toLowerCase().includes('within');
              const isQuickAddOpen = quickAddZoneId === region.id;
              const unassignedCities = allDbCities.filter(
                c => !region.cities.some(rc => rc.id === c.id)
              );

              const isDragOver = dragOverRegionId === region.id;

              return (
                <div 
                  key={region.id}
                  onDragOver={(e) => handleDragOver(e, region.id)}
                  onDragLeave={(e) => handleDragLeave(e, region.id)}
                  onDrop={() => handleDropCity(region.id)}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden transition-all ${
                    isDragOver 
                      ? 'border-2 border-dashed border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-4 ring-indigo-500/10 scale-[1.008]' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Zone Header / Main Row */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                        {region.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                            {region.name}
                          </h2>
                          {region.type && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                              {region.type}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${region.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {region.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {region.cities.length} {region.cities.length === 1 ? 'City' : 'Cities'} Assigned
                          {isLocalZone && ' • Automatic intra-city routing based on parcel origin'}
                        </div>
                      </div>
                    </div>

                    {/* Zone Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setQuickAddZoneId(isQuickAddOpen ? null : region.id);
                          setQuickAddCityId('');
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${isQuickAddOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Quickly add a city to this zone"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add City
                      </button>

                      <button
                        onClick={() => handleOpenEdit(region)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer transition-all"
                        title="Edit zone details and manage cities"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteZone(region.id, region.name)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer transition-all"
                        title="Delete zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Drop Cue Banner */}
                  {isDragOver && draggedCity && (
                    <div className="mx-4 sm:mx-5 mt-4 p-2.5 bg-indigo-100/90 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-center gap-2 animate-pulse">
                      <span>Drop to move <strong>"{draggedCity.cityName}"</strong> into {region.name}</span>
                    </div>
                  )}

                  {/* Inline Quick Add City Strip */}
                  {isQuickAddOpen && (
                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center gap-2 animate-in slide-in-from-top-2 duration-150">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 shrink-0">
                        Add city to {region.name}:
                      </span>
                      <select
                        value={quickAddCityId}
                        onChange={(e) => setQuickAddCityId(e.target.value)}
                        className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                      >
                        <option value="">Select a Pakistan city...</option>
                        {unassignedCities.map(city => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleQuickAddCity(region)}
                        disabled={!quickAddCityId}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                      >
                        Add to Zone
                      </button>
                      <button
                        onClick={() => setQuickAddZoneId(null)}
                        className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Cities Grid Directly Below Zone Name */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>Assigned Cities ({region.cities.length})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Drag city to another zone to move, or click '×' to remove
                      </span>
                    </div>

                    {region.cities.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-center text-xs text-slate-400">
                        {isLocalZone 
                          ? 'This is the "Within City" local zone. Same-city shipments automatically resolve to this tier, or drag & drop / click "+ Add City" to specify local hubs.'
                          : 'No cities mapped to this zone yet. Drag and drop cities here or click "+ Add City".'}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {region.cities.map((city) => {
                          const isBeingDragged = draggedCity?.cityId === city.id;

                          return (
                            <span
                              key={city.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, city, region.id)}
                              onDragEnd={() => { setDraggedCity(null); setDragOverRegionId(null); }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all group shadow-2xs cursor-grab active:cursor-grabbing select-none ${
                                isBeingDragged 
                                  ? 'opacity-30 scale-95 border-dashed border-indigo-500 ring-2 ring-indigo-400' 
                                  : 'hover:scale-[1.02] hover:shadow-xs'
                              }`}
                              title="Drag and drop onto another zone to move this city"
                            >
                              <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                              <MapPin className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                              <span>{city.name}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveCityFromZone(region, city.id, city.name); }}
                                className="ml-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded p-0.5 cursor-pointer transition-colors"
                                title={`Remove ${city.name} from this zone`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Create / Edit Zone */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => !isSaving && setIsModalOpen(false)} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingRegion ? `Edit Zone: ${editingRegion.name}` : 'Create New Zone'}
                    </h2>
                    <p className="text-xs text-slate-500">Configure zone name, type, and assigned coverage cities.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Zone Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone / Region Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Zone A (Major Hubs) or Sindh Express"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Zone Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Operational Classification
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Local Hubs">Local Hubs (Same City)</option>
                    <option value="Major Metros">Major Metros (Hub to Hub)</option>
                    <option value="Regional Hubs">Regional Hubs (Tier-2)</option>
                    <option value="Secondary Cities">Secondary Cities (Tier-3)</option>
                    <option value="Remote / Other">Remote & Far-Flung Areas</option>
                    <option value="Custom">Custom Zone Category</option>
                  </select>
                </div>

                {/* City Multi-Select */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Covered Cities ({formCityIds.length} Selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormCityIds(allDbCities.map(c => c.id))}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setFormCityIds([])}
                        className="text-[11px] font-semibold text-red-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <PakistanLocationMultiSelect
                    value={formCityIds}
                    onChange={(selected) => setFormCityIds(selected)}
                    allDbCities={allDbCities}
                    placeholder="Search and select Pakistan cities, districts, or provinces..."
                  />
                </div>

                {/* Active Switch */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="zoneActive"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="zoneActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Zone is active and used for tariff rating
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveZone}
                    disabled={isSaving || !formName.trim()}
                    className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Zone Setup
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

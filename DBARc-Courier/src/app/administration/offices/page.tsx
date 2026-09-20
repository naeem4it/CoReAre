'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { PakistanLocationSelect } from '@/components/ui/PakistanLocationSelect';
import { 
  Building2, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  Layers, 
  Check, 
  X, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function OfficesPage() {
  const { user, activeBusinessId, isShipper } = useAuth();
  const [offices, setOffices] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingOffice, setEditingOffice] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    phone: '',
    cityId: '' as number | string,
    cityName: '',
    status: true,
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Self-service area confirmation dialog state
  const [isPromptOpen, setIsPromptOpen] = React.useState(false);
  const [promptCityName, setPromptCityName] = React.useState('');
  const [pendingSavePayload, setPendingSavePayload] = React.useState<any>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getTenantId = React.useCallback(() => {
    return (
      user?.tenant?.id ||
      user?.tenantId ||
      (typeof user?.tenant === 'number' ? user.tenant : null) ||
      (typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('user') || '{}')?.tenant?.id ||
          JSON.parse(localStorage.getItem('user') || '{}')?.tenant
        : null)
    );
  }, [user]);

  const fetchOffices = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      let filters: any = {};
      if (isShipper) {
        if (!activeBusinessId) {
          setOffices([]);
          setIsLoading(false);
          return;
        }
        filters = { type: 'shipper', shipper: activeBusinessId };
      } else {
        const tenantId = getTenantId();
        if (tenantId) {
          filters = { type: 'courier', tenant: tenantId };
        } else {
          filters = { type: 'courier' };
        }
      }

      const res = await apiClient.get('/offices', {
        params: {
          filters,
          populate: ['city', 'tenant'],
          pagination: { limit: 100 },
        }
      });
      const raw = res.data?.data || [];
      const tenantId = getTenantId();
      const filtered = isShipper
        ? raw
        : raw.filter((item: any) => {
            if (!tenantId) return true;
            const attrs = item.attributes || item;
            const offTenantId = attrs.tenant?.data?.id || attrs.tenant?.id || attrs.tenant;
            return offTenantId ? Number(offTenantId) === Number(tenantId) : true;
          });

      setOffices(filtered);
    } catch (err) {
      console.error('Failed to fetch offices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeBusinessId, isShipper, getTenantId]);

  React.useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  const handleOpenModal = (office?: any) => {
    if (office) {
      setEditingOffice(office);
      const attrs = office.attributes || office;
      const cName = attrs.city?.data?.attributes?.CityName || attrs.city?.CityName || attrs.city?.name || '';
      setFormData({
        name: attrs.name || '',
        address: attrs.address || '',
        phone: attrs.phone || '',
        cityId: attrs.city?.data?.id || attrs.city?.id || attrs.city?.CityName || attrs.city?.name || '',
        cityName: cName,
        status: attrs.status ?? true,
      });
    } else {
      setEditingOffice(null);
      setFormData({ name: '', address: '', phone: '', cityId: '', cityName: '', status: true });
    }
    setIsModalOpen(true);
  };

  // Helper to fetch latest self-service cities
  const getTenantSelfServiceCities = async (tenantId: number | string): Promise<string[]> => {
    try {
      const res = await apiClient.get('/tenant/list?populate=*');
      const items = res.data?.data || [];
      const tenantItem = items.find((t: any) => String(t.id) === String(tenantId) || t.attributes?.documentId === String(tenantId));
      const tenantData = tenantItem?.attributes || tenantItem;
      if (tenantData?.self_service_cities && Array.isArray(tenantData.self_service_cities)) {
        return tenantData.self_service_cities;
      }
    } catch (e) {
      console.warn('Could not load tenant self-service cities:', e);
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem(`self_service_cities_${tenantId}`);
      if (local) return JSON.parse(local);
    } catch (e) {}

    return [];
  };

  // Synchronize 2PL self-service areas and 3PL partner coverage
  const syncServiceAreasAnd3PL = async (cityName: string, tenantId: number | string) => {
    if (!cityName || !tenantId) return;
    try {
      // 1. Update 2PL self_service_cities on tenant
      const currentCities = await getTenantSelfServiceCities(tenantId);
      const exists = currentCities.some(c => c.toLowerCase().trim() === cityName.toLowerCase().trim());
      let updatedCities = currentCities;
      if (!exists) {
        updatedCities = [...currentCities, cityName.trim()];
        await apiClient.put(`/tenant/update/${tenantId}`, {
          self_service_cities: updatedCities,
        });
        localStorage.setItem(`self_service_cities_${tenantId}`, JSON.stringify(updatedCities));
      }

      // 2. Update 3PL partners configured with specific cities
      try {
        const tplRes = await apiClient.get('/tpl-partner/list', { params: { tenant: tenantId } });
        const partners = tplRes.data?.data || [];
        for (const p of partners) {
          const pAttrs = p.attributes || p;
          if (pAttrs.coverage_mode === 'specific_cities' && Array.isArray(pAttrs.service_cities)) {
            const hasCity = pAttrs.service_cities.some((c: string) => c.toLowerCase().trim() === cityName.toLowerCase().trim());
            if (!hasCity) {
              const updatedPartnerCities = [...pAttrs.service_cities, cityName.trim()];
              const partnerId = p.id || pAttrs.id;
              await apiClient.put(`/tpl-partner/update/${partnerId}`, {
                service_cities: updatedPartnerCities,
              }).catch(() => null);
            }
          }
        }
      } catch (tplErr) {
        console.warn('Could not update 3PL partners service cities:', tplErr);
      }
    } catch (err) {
      console.error('Failed to synchronize service areas:', err);
    }
  };

  // Primary save execution
  const executeSave = async (payloadData: any, updateSelfService: boolean, resolvedCityName: string) => {
    try {
      setIsSaving(true);
      const tenantId = getTenantId();

      // If user agreed to update self-service area in 2PL and 3PL
      if (updateSelfService && resolvedCityName && tenantId && !isShipper) {
        await syncServiceAreasAnd3PL(resolvedCityName, tenantId);
      }

      const officeId = editingOffice?.documentId || editingOffice?.id;
      if (editingOffice) {
        await apiClient.put(`/offices/${officeId}`, { data: payloadData });
      } else {
        await apiClient.post('/offices', { data: payloadData });
      }

      setIsPromptOpen(false);
      setIsModalOpen(false);
      setPendingSavePayload(null);
      fetchOffices();

      if (updateSelfService && resolvedCityName) {
        showNotification(`Office saved successfully! "${resolvedCityName}" has been added to 2PL Self-Service Areas and 3PL routing rules.`, 'success');
      } else {
        showNotification(editingOffice ? 'Office updated successfully.' : 'Office created successfully.', 'success');
      }
    } catch (err: any) {
      console.error('Failed to save office:', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || 'Failed to save office';
      showNotification(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let resolvedCityId = formData.cityId;
      let resolvedCityName = formData.cityName;

      let numericCityId: number | undefined = undefined;

      if (typeof resolvedCityId === 'number') {
        numericCityId = resolvedCityId;
      } else if (typeof resolvedCityId === 'string' && !isNaN(Number(resolvedCityId))) {
        numericCityId = Number(resolvedCityId);
      } else {
        const searchName = resolvedCityName || String(resolvedCityId || '').trim();
        if (searchName) {
          try {
            // 1. Try contains match
            let cRes = await apiClient.get(`/cities?filters[CityName][$containsi]=${encodeURIComponent(searchName)}`);
            if (cRes.data?.data?.[0]?.id) {
              numericCityId = cRes.data.data[0].id;
              resolvedCityName = cRes.data.data[0].attributes?.CityName || cRes.data.data[0].CityName || searchName;
            } else {
              // 2. Try base word (e.g. "Karachi" from "Karachi Central")
              const baseName = searchName.split(/[\s,-]/)[0]?.trim();
              if (baseName && baseName.length >= 3) {
                cRes = await apiClient.get(`/cities?filters[CityName][$containsi]=${encodeURIComponent(baseName)}`);
                if (cRes.data?.data?.[0]?.id) {
                  numericCityId = cRes.data.data[0].id;
                }
              }
              // 3. Auto-create city in Strapi if still not found
              if (!numericCityId) {
                const createRes = await apiClient.post('/cities', {
                  data: {
                    CityName: searchName,
                    Active: true,
                  }
                });
                if (createRes.data?.data?.id) {
                  numericCityId = createRes.data.data.id;
                }
              }
            }
          } catch (e) {
            console.warn('Could not resolve or create city in Strapi:', e);
          }
        }
      }

      if (!resolvedCityName && typeof formData.cityId === 'string') {
        resolvedCityName = formData.cityId;
      }

      const data: any = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        city: numericCityId || undefined,
        status: formData.status,
      };

      if (isShipper) {
        data.type = 'shipper';
        data.shipper = activeBusinessId;
        await executeSave(data, false, resolvedCityName);
        return;
      }

      const tenantId = getTenantId();
      data.type = 'courier';
      if (tenantId) {
        data.tenant = tenantId;
      }

      // Courier Organization: Check if city is in 2PL Self-Service Areas
      if (tenantId && resolvedCityName) {
        const selfServiceCities = await getTenantSelfServiceCities(tenantId);
        const isInSelfService = selfServiceCities.some(
          c => c.toLowerCase().trim() === resolvedCityName.toLowerCase().trim()
        );

        if (!isInSelfService) {
          // City is NOT in self service area -> Trigger Yes/No Alert Modal
          setIsSaving(false);
          setPromptCityName(resolvedCityName);
          setPendingSavePayload(data);
          setIsPromptOpen(true);
          return;
        }
      }

      // Already in self-service area or no check needed
      await executeSave(data, false, resolvedCityName);
    } catch (err: any) {
      console.error('Failed to validate office save:', err);
      setIsSaving(false);
      showNotification('Failed to prepare office data.', 'error');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (confirm('Are you sure you want to delete this office?')) {
      try {
        await apiClient.delete(`/offices/${id}`);
        fetchOffices();
        showNotification('Office deleted successfully.', 'success');
      } catch (err) {
        console.error('Failed to delete office:', err);
        showNotification('Failed to delete office', 'error');
      }
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
        {/* Notification Toast */}
        {notification && (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in shadow-md ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Manage Offices</h1>
            <p className="text-on-surface-variant font-body-md text-body-md">Setup your physical office, transit hub, and dispatch locations.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-primary text-white h-10 px-4 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Office
          </button>
        </div>

        {/* Offices Table */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Office Name</th>
                <th className="px-6 py-4">City / Area</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading offices...</td></tr>
              ) : offices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No offices configured yet.</td></tr>
              ) : (
                offices.map((office) => {
                  const attrs = office.attributes || office;
                  const cityName = attrs.city?.CityName || attrs.city?.name || attrs.city?.data?.attributes?.CityName || attrs.city?.data?.attributes?.name || '-';
                  return (
                    <tr key={office.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        {attrs.name}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{cityName}</td>
                      <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{attrs.address || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{attrs.phone || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${attrs.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {attrs.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(office)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Edit Office">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(office.documentId || office.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Delete Office">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Create / Edit Office Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => !isSaving && setIsModalOpen(false)} 
            />

            {/* Modal Card */}
            <div className="relative z-10 w-full max-w-[560px] bg-white rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 border border-slate-200 my-auto">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{editingOffice ? 'Edit Office / Hub' : 'Create New Office / Hub'}</h2>
                    <p className="text-xs text-slate-500">Configure physical branch, warehouse, or transit hub location</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSaving}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Content */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Office Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lahore Head Office / Gulberg Hub" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 transition-all"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 z-50">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    City / Location <span className="text-red-500">*</span>
                  </label>
                  <PakistanLocationSelect 
                    value={formData.cityId}
                    onChange={(val, details) => {
                      setFormData({ 
                        ...formData, 
                        cityId: val, 
                        cityName: details?.cityName || String(val || '') 
                      });
                    }}
                    placeholder="Search or pick City / Tehsil..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Physical Address
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Street Address, Building, Floor, Landmark..." 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. +92 42 35780000 or 0300 1234567" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2.5 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="office-status" 
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="office-status" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Office / Hub is Active and Available for Operations
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)} 
                    disabled={isSaving}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSave} 
                    disabled={isSaving || !formData.name.trim() || !formData.cityId}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-600 rounded-xl disabled:opacity-50 cursor-pointer transition-all shadow-sm flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        {editingOffice ? 'Update Office' : 'Save Office'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Self-Service Area Yes/No Confirmation Modal */}
        {isPromptOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto">
            <div 
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
              onClick={() => !isSaving && setIsPromptOpen(false)}
            />

            <div className="relative z-10 w-full max-w-[540px] bg-white rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 border border-slate-200 my-auto">
              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-200">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Delivery Area Synchronization
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    are you opening office in given address?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Location <span className="font-semibold text-slate-800">{promptCityName}</span> is currently not in your <span className="font-semibold text-primary">2PL Self-Service Delivery Areas</span>.
                  </p>
                </div>
              </div>

              {/* Impact Information Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  What happens when you press &quot;Yes&quot;?
                </div>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">2PL In-House Delivery:</span> Automatically adds <span className="font-bold text-slate-900">{promptCityName}</span> to your courier fleet delivery coverage.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Layers className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">3PL Partner Network:</span> Synchronizes 3PL dispatch rules and routes destination parcels appropriately.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Operations & Booking:</span> Enables direct rider pickups, manifests, and order fulfillment in this city.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPromptOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => executeSave(pendingSavePayload, false, promptCityName)}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-center"
                >
                  No, Save Office Only
                </button>

                <button
                  type="button"
                  onClick={() => executeSave(pendingSavePayload, true, promptCityName)}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating 2PL & 3PL...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Yes, Update 2PL & 3PL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

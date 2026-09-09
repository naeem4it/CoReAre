'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { apiClient } from '@/shared/api/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PakistanLocationMultiSelect } from '@/shared/ui/PakistanLocationMultiSelect';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Building2, 
  Layers, 
  Globe2, 
  CheckCircle2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function DefaultRegionsPage() {
  const [regions, setRegions] = React.useState<any[]>([]);
  const [tenants, setTenants] = React.useState<any[]>([]);
  const [allDbCities, setAllDbCities] = React.useState<{ id: number; name: string }[]>([]);
  const [selectedTenantScope, setSelectedTenantScope] = React.useState<string>('GLOBAL'); // 'GLOBAL' or tenant ID
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRegion, setEditingRegion] = React.useState<any>(null);
  const [notification, setNotification] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    type: 'regional',
    cities: [] as (number | string)[],
    active: true,
    tenantId: '',
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch Cities for multi-select ID mapping
  const fetchDbCities = async () => {
    try {
      const res = await apiClient.get('/cities?pagination[limit]=1000');
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        const mapped = list.map((c: any) => ({
          id: c.id,
          name: (c.attributes?.CityName || c.CityName || c.name || c.attributes?.name || `City #${c.id}`).trim()
        }));
        setAllDbCities(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch db cities:', err);
    }
  };

  // Fetch Regions based on selected scope (Global vs specific tenant)
  const fetchRegions = async () => {
    try {
      setIsLoading(true);
      const filterParams: any = { courier: { $null: true } };

      if (selectedTenantScope === 'GLOBAL') {
        filterParams.tenant = { $null: true };
      } else {
        filterParams.tenant = Number(selectedTenantScope);
      }

      const res = await apiClient.get('/regions', {
        params: {
          filters: filterParams,
          populate: ['cities', 'tenant'],
          pagination: { limit: 100 }
        }
      });
      setRegions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch regions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await apiClient.get('/tenant/list');
      setTenants(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    }
  };

  React.useEffect(() => {
    fetchDbCities();
    fetchTenants();
  }, []);

  React.useEffect(() => {
    fetchRegions();
  }, [selectedTenantScope]);

  const handleOpenModal = (region?: any) => {
    if (region) {
      setEditingRegion(region);
      const attrs = region.attributes || region;
      const rawCities = attrs.cities?.data || attrs.cities || [];
      const cityIds = rawCities.map((c: any) => c.id || c);

      setFormData({
        name: attrs.name || '',
        type: attrs.type || 'regional',
        cities: cityIds,
        active: attrs.active ?? true,
        tenantId: attrs.tenant?.data?.id ? String(attrs.tenant.data.id) : (selectedTenantScope !== 'GLOBAL' ? selectedTenantScope : ''),
      });
    } else {
      setEditingRegion(null);
      setFormData({ 
        name: '', 
        type: 'regional',
        cities: [], 
        active: true, 
        tenantId: selectedTenantScope !== 'GLOBAL' ? selectedTenantScope : '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const isGlobal = !formData.tenantId || formData.tenantId === 'GLOBAL';
      const targetTenantId = isGlobal ? null : Number(formData.tenantId);

      // Convert cities to numeric IDs where possible
      const resolvedCityIds = formData.cities.map(c => {
        if (typeof c === 'number') return c;
        const found = allDbCities.find(dbC => dbC.name.toLowerCase() === String(c).toLowerCase());
        return found ? found.id : c;
      }).filter(c => typeof c === 'number');

      const payload = {
        data: {
          name: formData.name.trim(),
          type: formData.type,
          cities: resolvedCityIds,
          active: formData.active,
          tenant: targetTenantId,
          courier: null,
        }
      };

      if (editingRegion) {
        const editKey = editingRegion.documentId || editingRegion.id;
        await apiClient.put(`/regions/${editKey}`, payload);
        showNotification(`Zone "${formData.name}" updated successfully.`);
      } else {
        await apiClient.post('/regions', payload);
        showNotification(`Zone "${formData.name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchRegions();
    } catch (err) {
      console.error('Failed to save region:', err);
      alert('Failed to save region');
    }
  };

  const handleDelete = async (region: any) => {
    const rName = region.attributes?.name || region.name || 'Zone';
    if (confirm(`Are you sure you want to delete zone "${rName}"?`)) {
      try {
        const deleteKey = region.documentId || region.id;
        await apiClient.delete(`/regions/${deleteKey}`);
        showNotification(`Zone "${rName}" deleted.`);
        fetchRegions();
      } catch (err) {
        console.error('Failed to delete region:', err);
        alert('Failed to delete region');
      }
    }
  };

  const totalCitiesCovered = React.useMemo(() => {
    const set = new Set<number>();
    regions.forEach(r => {
      const attrs = r.attributes || r;
      const cities = attrs.cities?.data || attrs.cities || [];
      cities.forEach((c: any) => set.add(c.id));
    });
    return set.size;
  }, [regions]);

  const currentScopeLabel = selectedTenantScope === 'GLOBAL' 
    ? 'Global Default (All Couriers)' 
    : (tenants.find(t => String(t.id) === selectedTenantScope)?.attributes?.name || tenants.find(t => String(t.id) === selectedTenantScope)?.name || `Tenant #${selectedTenantScope}`);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white bg-emerald-600 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 mb-1">
            <Globe2 className="w-4 h-4" />
            SUPER ADMIN &bull; SYSTEM GEOGRAPHICAL COVERAGE
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Zone & Region Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system-wide default zones for all couriers, or manage specific zone overrides per tenant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" /> Add Zone
          </Button>
        </div>
      </div>

      {/* Scope Selector Filter Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure Zones For:</div>
            <div className="text-sm font-bold text-slate-900">{currentScopeLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Target Tenant Scope:</label>
          <select
            value={selectedTenantScope}
            onChange={(e) => setSelectedTenantScope(e.target.value)}
            className="w-full md:w-64 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="GLOBAL">🌐 Global Default (All Couriers)</option>
            <optgroup label="Tenant Specific Overrides">
              {tenants.map(t => (
                <option key={t.id} value={String(t.id)}>
                  🏢 {t.attributes?.name || t.name} (Tenant #{t.id})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Configured Zones</div>
            <div className="text-xl font-bold text-slate-900">{regions.length} Zones</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Cities Assigned</div>
            <div className="text-xl font-bold text-slate-900">{totalCitiesCovered} Cities</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Active Scope</div>
            <div className="text-sm font-bold text-purple-700 truncate max-w-[180px]">
              {selectedTenantScope === 'GLOBAL' ? 'Default Template' : 'Tenant Override'}
            </div>
          </div>
        </div>
      </div>

      {/* Zones Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Zone / Region Name</th>
                <th className="px-6 py-4">Scope</th>
                <th className="px-6 py-4">Cities Covered</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading zones for {currentScopeLabel}...
                  </td>
                </tr>
              ) : regions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 mb-1">No zones configured for {currentScopeLabel}</p>
                    <p className="text-xs text-slate-400 mb-3">Click below to add your first zone for this scope.</p>
                    <Button onClick={() => handleOpenModal()} className="gap-2">
                      <Plus className="w-4 h-4" /> Add Zone
                    </Button>
                  </td>
                </tr>
              ) : (
                regions.map((region) => {
                  const attrs = region.attributes || region;
                  const cities = attrs.cities?.data || attrs.cities || [];
                  const tenantName = attrs.tenant?.data?.attributes?.name || 'Global Default (All)';
                  const isLocal = (attrs.name || '').toLowerCase().includes('within');

                  return (
                    <tr key={region.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {attrs.name ? attrs.name.charAt(0) : 'Z'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{attrs.name}</div>
                            <div className="text-[11px] text-slate-400 capitalize">{attrs.type || 'Regional Zone'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          attrs.tenant?.data ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {attrs.tenant?.data ? `🏢 ${attrs.tenant.data.attributes?.name || 'Tenant'}` : '🌐 Global Default'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-md">
                          <span className="text-xs font-bold text-slate-700">
                            {isLocal ? 'Origin City (Applies locally)' : `${cities.length} cities/towns assigned`}
                          </span>
                          {!isLocal && cities.length > 0 && (
                            <span className="text-[11px] text-slate-500 truncate">
                              {cities.slice(0, 8).map((c: any) => c.attributes?.CityName || c.CityName || c.name || `City #${c.id}`).join(', ')}
                              {cities.length > 8 && ` +${cities.length - 8} more`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                          attrs.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {attrs.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenModal(region)} 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit Zone"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(region)} 
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create / Edit Zone Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingRegion ? 'Edit Zone Configuration' : 'Create New Zone'}
        size="xl"
      >
        <div className="space-y-4">
          <Input 
            label="Zone Name" 
            placeholder="e.g. Zone A (Major Metros)" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Zone Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="local">Local (Within City)</option>
              <option value="metro">Metro Hubs (Major Cities)</option>
              <option value="regional">Regional Hubs</option>
              <option value="secondary">Secondary Cities</option>
              <option value="remote">Remote / Extended Coverage</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Assign to Scope (Global Default vs Specific Tenant)
            </label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">🌐 Global Default (Applies to all Couriers)</option>
              {tenants.map(t => (
                <option key={t.id} value={String(t.id)}>
                  🏢 Tenant: {t.attributes?.name || t.name} (Tenant #{t.id})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Covered Cities, Districts & Tehsils
            </label>
            <PakistanLocationMultiSelect 
              value={formData.cities}
              allDbCities={allDbCities}
              onChange={(newValues) => setFormData({ ...formData, cities: newValues })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="active" 
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <label htmlFor="active" className="text-xs font-bold text-slate-700 cursor-pointer">
              Zone is active and participating in tariff calculations
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              Save Zone
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

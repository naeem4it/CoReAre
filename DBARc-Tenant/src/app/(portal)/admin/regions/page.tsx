'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { apiClient } from '@/shared/api/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { CityMultiSelect } from '@/shared/ui/CityMultiSelect';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function DefaultRegionsPage() {
  const [regions, setRegions] = React.useState<any[]>([]);
  const [tenants, setTenants] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRegion, setEditingRegion] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    cities: [] as number[],
    active: true,
    tenantId: '',
  });

  const fetchRegions = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/regions', {
        params: {
          filters: { courier: { $null: true } },
          populate: ['cities', 'tenant'],
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
    fetchRegions();
    fetchTenants();
  }, []);

  const handleOpenModal = (region?: any) => {
    if (region) {
      setEditingRegion(region);
      setFormData({
        name: region.attributes?.name || region.name || '',
        cities: (region.attributes?.cities?.data || region.cities || []).map((c: any) => c.id),
        active: region.attributes?.active ?? region.active ?? true,
        tenantId: region.attributes?.tenant?.data?.id || '',
      });
    } else {
      setEditingRegion(null);
      setFormData({ name: '', cities: [], active: true, tenantId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        data: {
          name: formData.name,
          cities: formData.cities,
          active: formData.active,
          tenant: formData.tenantId ? Number(formData.tenantId) : null,
          courier: null,
        }
      };

      if (editingRegion) {
        await apiClient.put(`/regions/${editingRegion.id}`, payload);
      } else {
        await apiClient.post('/regions', payload);
      }

      setIsModalOpen(false);
      fetchRegions();
    } catch (err) {
      console.error('Failed to save region:', err);
      alert('Failed to save region');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this default region?')) {
      try {
        await apiClient.delete(`/regions/${id}`);
        fetchRegions();
      } catch (err) {
        console.error('Failed to delete region:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Default Regions (Tenant)</h1>
          <p className="text-slate-500">Setup default geographical coverage zones for tenants.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Default Region
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Region Name</th>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Cities Covered</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading regions...</td></tr>
              ) : regions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No default regions configured yet.</td></tr>
              ) : (
                regions.map((region) => {
                  const attrs = region.attributes || region;
                  const cities = attrs.cities?.data || attrs.cities || [];
                  const tenantName = attrs.tenant?.data?.attributes?.name || 'Global Default';
                  
                  return (
                    <tr key={region.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{attrs.name}</td>
                      <td className="px-6 py-4 text-slate-600">{tenantName}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {cities.length} cities selected
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${attrs.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {attrs.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(region)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(region.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRegion ? 'Edit Default Region' : 'Create Default Region'}>
        <div className="space-y-4">
          <Input 
            label="Region Name" 
            placeholder="e.g. Default Sindh Zone" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Assign to Tenant (Optional)</label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Global (All Tenants)</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.attributes?.name || t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Covered Cities</label>
            <CityMultiSelect 
              value={formData.cities}
              onChange={(cities) => setFormData({ ...formData, cities })}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="active" 
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-slate-700">Region is active and serving</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || formData.cities.length === 0}>
              Save Default Region
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

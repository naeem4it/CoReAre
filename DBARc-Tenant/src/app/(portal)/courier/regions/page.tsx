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

export default function CourierRegionsPage() {
  const { user } = useAuthStore();
  const [regions, setRegions] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRegion, setEditingRegion] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    cities: [] as number[],
    active: true,
  });

  const fetchRegions = async () => {
    if (!user?.tenantId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get('/regions', {
        params: {
          filters: { courier: user.tenantId },
          populate: ['cities'],
        }
      });
      setRegions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch regions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRegions();
  }, [user]);

  const handleOpenModal = (region?: any) => {
    if (region) {
      setEditingRegion(region);
      setFormData({
        name: region.attributes?.name || region.name || '',
        cities: (region.attributes?.cities?.data || region.cities || []).map((c: any) => c.id),
        active: region.attributes?.active ?? region.active ?? true,
      });
    } else {
      setEditingRegion(null);
      setFormData({ name: '', cities: [], active: true });
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
          courier: user?.tenantId,
          tenant: user?.tenantId, // Store tenant context as well
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
    if (confirm('Are you sure you want to delete this region?')) {
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
          <h1 className="text-2xl font-bold text-slate-900">Courier Regions</h1>
          <p className="text-slate-500">Setup your geographical coverage zones by adding cities to regions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Region
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Region Name</th>
                <th className="px-6 py-4">Cities Covered</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading regions...</td></tr>
              ) : regions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No regions configured yet.</td></tr>
              ) : (
                regions.map((region) => {
                  const attrs = region.attributes || region;
                  const cities = attrs.cities?.data || attrs.cities || [];
                  return (
                    <tr key={region.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{attrs.name}</td>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRegion ? 'Edit Region' : 'Create Region'}>
        <div className="space-y-4">
          <Input 
            label="Region Name" 
            placeholder="e.g. Sindh Zone 1" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          
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
              Save Region
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

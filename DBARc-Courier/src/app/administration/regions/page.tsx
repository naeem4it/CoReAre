'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { CityMultiSelect } from '@/components/ui/CityMultiSelect';

export default function CourierRegionsPage() {
  const { user } = useAuth();
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
    if (!user?.tenant) return;
    const tenantId = user.tenant.id || user.tenant;
    try {
      setIsLoading(true);
      const res = await apiClient.get('/regions', {
        params: {
          filters: { courier: tenantId },
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
    const tenantId = user?.tenant?.id || user?.tenant;
    try {
      const payload = {
        data: {
          name: formData.name,
          cities: formData.cities,
          active: formData.active,
          courier: tenantId,
          tenant: tenantId,
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
    <PortalLayout>
      <div className="flex flex-col gap-lg animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Courier Regions</h1>
            <p className="text-on-surface-variant font-body-md text-body-md">Setup your geographical coverage zones by adding cities to regions.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-primary text-white h-10 px-4 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Region
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Region Name</th>
                <th className="px-6 py-4">Cities Covered</th>
                <th className="px-6 py-4 text-center">Status</th>
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
                      <td className="px-6 py-4 font-semibold text-slate-900">{attrs.name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {cities.length} cities selected
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${attrs.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {attrs.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(region)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(region.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
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

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <h2 className="text-xl font-bold text-on-surface">{editingRegion ? 'Edit Region' : 'Create Region'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-outline cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Region Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sindh Zone 1" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Covered Cities</label>
                  <CityMultiSelect 
                    value={formData.cities}
                    onChange={(cities) => setFormData({ ...formData, cities })}
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="active" 
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="active" className="text-sm font-semibold text-slate-700 cursor-pointer">Region is active and serving</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200">Cancel</button>
                  <button 
                    onClick={handleSave} 
                    disabled={!formData.name || formData.cities.length === 0}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-lg disabled:opacity-50"
                  >
                    Save Region
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

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { CitySelect } from '@/components/ui/CitySelect';

export default function OfficesPage() {
  const { user, activeBusinessId } = useAuth();
  const [offices, setOffices] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingOffice, setEditingOffice] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    phone: '',
    cityId: '' as number | '',
    status: true,
  });

  const isShipper = !!user?.shipper;

  const fetchOffices = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      let filters: any = {};
      if (isShipper) {
        if (!activeBusinessId) return; // Wait for active business
        filters = { type: 'shipper', shipper: activeBusinessId };
      } else {
        const tenantId = user.tenant?.id || user.tenant;
        if (!tenantId) return;
        filters = { type: 'courier', courier: tenantId };
      }

      const res = await apiClient.get('/offices', {
        params: {
          filters,
          populate: ['city'],
        }
      });
      setOffices(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch offices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOffices();
  }, [user, activeBusinessId, isShipper]);

  const handleOpenModal = (office?: any) => {
    if (office) {
      setEditingOffice(office);
      setFormData({
        name: office.attributes?.name || office.name || '',
        address: office.attributes?.address || office.address || '',
        phone: office.attributes?.phone || office.phone || '',
        cityId: office.attributes?.city?.data?.id || office.city?.id || '',
        status: office.attributes?.status ?? office.status ?? true,
      });
    } else {
      setEditingOffice(null);
      setFormData({ name: '', address: '', phone: '', cityId: '', status: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const data: any = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        city: formData.cityId,
        status: formData.status,
      };

      if (isShipper) {
        data.type = 'shipper';
        data.shipper = activeBusinessId;
      } else {
        const tenantId = user.tenant?.id || user.tenant;
        data.type = 'courier';
        data.courier = tenantId;
        data.tenant = tenantId;
      }

      if (editingOffice) {
        await apiClient.put(`/offices/${editingOffice.id}`, { data });
      } else {
        await apiClient.post('/offices', { data });
      }

      setIsModalOpen(false);
      fetchOffices();
    } catch (err) {
      console.error('Failed to save office:', err);
      alert('Failed to save office');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this office?')) {
      try {
        await apiClient.delete(`/offices/${id}`);
        fetchOffices();
      } catch (err) {
        console.error('Failed to delete office:', err);
      }
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col gap-lg animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Manage Offices</h1>
            <p className="text-on-surface-variant font-body-md text-body-md">Setup your physical office and dispatch locations.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-primary text-white h-10 px-4 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Office
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Office Name</th>
                <th className="px-6 py-4">City</th>
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
                  const cityName = attrs.city?.data?.attributes?.name || attrs.city?.name || '-';
                  return (
                    <tr key={office.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{attrs.name}</td>
                      <td className="px-6 py-4 text-slate-600">{cityName}</td>
                      <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{attrs.address || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{attrs.phone || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${attrs.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {attrs.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(office)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(office.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
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
                <h2 className="text-xl font-bold text-on-surface">{editingOffice ? 'Edit Office' : 'Create Office'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-outline cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Office Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Main Branch" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 z-50">
                  <label className="text-sm font-bold text-slate-700">City</label>
                  <CitySelect 
                    value={formData.cityId}
                    onChange={(id) => setFormData({ ...formData, cityId: id })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Address</label>
                  <textarea 
                    rows={2}
                    placeholder="Street Address..." 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Phone</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +92 300 1234567" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="status" 
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="status" className="text-sm font-semibold text-slate-700 cursor-pointer">Office is Active</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200">Cancel</button>
                  <button 
                    onClick={handleSave} 
                    disabled={!formData.name || !formData.cityId}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-lg disabled:opacity-50"
                  >
                    Save Office
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

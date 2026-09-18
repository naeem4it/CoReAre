'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { PakistanLocationSelect } from '@/components/ui/PakistanLocationSelect';

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
    cityId: '' as number | string,
    status: true,
  });

  const isShipper = !!user?.shipper;

  const [isSaving, setIsSaving] = React.useState(false);

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
      const attrs = office.attributes || office;
      setFormData({
        name: attrs.name || '',
        address: attrs.address || '',
        phone: attrs.phone || '',
        cityId: attrs.city?.data?.id || attrs.city?.id || attrs.city?.CityName || attrs.city?.name || '',
        status: attrs.status ?? true,
      });
    } else {
      setEditingOffice(null);
      setFormData({ name: '', address: '', phone: '', cityId: '', status: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let resolvedCityId = formData.cityId;
      if (typeof resolvedCityId === 'string' && isNaN(Number(resolvedCityId))) {
        try {
          const cRes = await apiClient.get(`/cities?filters[CityName][$containsi]=${encodeURIComponent(resolvedCityId)}`);
          if (cRes.data?.data?.[0]?.id) {
            resolvedCityId = cRes.data.data[0].id;
          }
        } catch (e) {
          console.warn('Could not resolve city ID:', e);
        }
      }

      const data: any = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        city: resolvedCityId || undefined,
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

      const officeId = editingOffice?.documentId || editingOffice?.id;
      if (editingOffice) {
        await apiClient.put(`/offices/${officeId}`, { data });
      } else {
        await apiClient.post('/offices', { data });
      }

      setIsModalOpen(false);
      fetchOffices();
    } catch (err) {
      console.error('Failed to save office:', err);
      alert('Failed to save office');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number | string) => {
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
      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
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
                  const cityName = attrs.city?.CityName || attrs.city?.name || attrs.city?.data?.attributes?.CityName || attrs.city?.data?.attributes?.name || '-';
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
                          <button onClick={() => handleDelete(office.documentId || office.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
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
                    onChange={(val) => setFormData({ ...formData, cityId: val })}
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
      </div>
    </PortalLayout>
  );
}

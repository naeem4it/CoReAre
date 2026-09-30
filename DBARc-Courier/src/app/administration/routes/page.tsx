'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { RouteService, RouteItem } from '@/services/route.service';
import {
  MapPin,
  Route as RouteIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Layers,
  Filter,
  RefreshCw,
  X,
  AlertCircle,
  Check,
  UserCheck,
  Compass,
  ArrowRight,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function RouteManagementPage() {
  const { user } = useAuth();
  const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : 2);

  // Data states
  const [routes, setRoutes] = React.useState<RouteItem[]>([]);
  const [offices, setOffices] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);
  const [cities, setCities] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterOffice, setFilterOffice] = React.useState('');
  const [filterCity, setFilterCity] = React.useState('');
  const [filterZone, setFilterZone] = React.useState('');
  const [filterType, setFilterType] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<RouteItem | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);

  // Form states
  const [formOfficeId, setFormOfficeId] = React.useState<string>('');
  const [formZoneId, setFormZoneId] = React.useState<string>('');
  const [formCityId, setFormCityId] = React.useState<string>('');
  const [formRouteCode, setFormRouteCode] = React.useState<string>('');
  const [formRouteName, setFormRouteName] = React.useState<string>('');
  const [formRouteType, setFormRouteType] = React.useState<string>('Delivery');
  const [formStatus, setFormStatus] = React.useState<string>('Active');
  const [formDescription, setFormDescription] = React.useState<string>('');
  const [formAreas, setFormAreas] = React.useState<string>('');
  const [isAutoCode, setIsAutoCode] = React.useState(true);

  // Toast
  const [toast, setToast] = React.useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch initial master data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Routes
      const routeRes = await apiClient.get('/routes?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=100');
      const loadedRoutes = (routeRes.data?.data || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        ...(item.attributes || item),
      }));
      setRoutes(loadedRoutes);

      // 2. Fetch Offices / Hubs
      const officeRes = await apiClient.get('/offices?populate=*&filters[type][$eq]=courier&pagination[pageSize]=100');
      const loadedOffices = (officeRes.data?.data || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        ...(item.attributes || item),
      }));
      setOffices(loadedOffices);

      // 3. Fetch Zones (Regions with their cities)
      const zoneRes = await apiClient.get('/regions?populate=*&pagination[pageSize]=100');
      const loadedZones = (zoneRes.data?.data || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        ...(item.attributes || item),
      }));
      setZones(loadedZones);

      // 4. Fetch Cities
      const cityRes = await apiClient.get('/cities?pagination[pageSize]=300');
      const loadedCities = (cityRes.data?.data || []).map((item: any) => ({
        id: item.id,
        name: item.city_name || item.CityName || item.name || '',
      }));
      setCities(loadedCities);
    } catch (err: any) {
      console.error('Failed to load route management data:', err);
      triggerToast('Failed to load routes from server', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Available cities for the selected zone
  const availableCitiesForZone = React.useMemo(() => {
    if (!formZoneId) return cities;
    const selectedZone = zones.find(z => String(z.id) === String(formZoneId));
    if (!selectedZone || !selectedZone.cities) return cities;
    const zoneCityList = Array.isArray(selectedZone.cities) 
      ? selectedZone.cities 
      : (selectedZone.cities.data || []);
    const zoneCityIds = new Set(zoneCityList.map((c: any) => c.id));
    const filtered = cities.filter(c => zoneCityIds.has(c.id));
    return filtered.length > 0 ? filtered : cities;
  }, [formZoneId, zones, cities]);

  // Auto-generate route code whenever City, Zone, or Office changes if isAutoCode is true
  React.useEffect(() => {
    if (!isAutoCode || editingRoute) return;
    if (formCityId && formZoneId) {
      const selectedCity = cities.find(c => String(c.id) === String(formCityId));
      const selectedZone = zones.find(z => String(z.id) === String(formZoneId));
      const cityName = selectedCity?.name || 'HUB';
      const zoneName = selectedZone?.name || 'ZONE';

      // Count existing routes in same city & zone
      const existingInZone = routes.filter(r => 
        (r.city?.id === Number(formCityId) || r.city?.id === formCityId) &&
        (r.zone?.id === Number(formZoneId) || r.zone?.id === formZoneId)
      ).length;

      const code = RouteService.generateSuggestedCode(cityName, zoneName, existingInZone);
      setFormRouteCode(code);
      if (!formRouteName) {
        setFormRouteName(`${cityName} ${zoneName} Route ${String(existingInZone + 1).padStart(2, '0')}`);
      }
    }
  }, [formCityId, formZoneId, isAutoCode, cities, zones, routes, editingRoute, formRouteName]);

  const openCreateModal = () => {
    setEditingRoute(null);
    setFormOfficeId(offices[0]?.id ? String(offices[0].id) : '');
    setFormZoneId('');
    setFormCityId('');
    setFormRouteCode('');
    setFormRouteName('');
    setFormRouteType('Delivery');
    setFormStatus('Active');
    setFormDescription('');
    setFormAreas('');
    setIsAutoCode(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: RouteItem) => {
    setEditingRoute(r);
    setFormOfficeId(r.office?.id ? String(r.office.id) : '');
    setFormZoneId(r.zone?.id ? String(r.zone.id) : '');
    setFormCityId(r.city?.id ? String(r.city.id) : '');
    setFormRouteCode(r.route_code || '');
    setFormRouteName(r.name || '');
    setFormRouteType(r.type || 'Delivery');
    setFormStatus(r.status || 'Active');
    setFormDescription(r.description || '');
    const areasStr = Array.isArray(r.areas) ? r.areas.join(', ') : (r.areas || '');
    setFormAreas(areasStr);
    setIsAutoCode(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Validation
    if (!formOfficeId) {
      setModalError('Office / Hub is mandatory.');
      return;
    }
    if (!formZoneId) {
      setModalError('Zone is mandatory.');
      return;
    }
    if (!formCityId) {
      setModalError('City is mandatory.');
      return;
    }
    if (!formRouteCode.trim()) {
      setModalError('Route Code is mandatory.');
      return;
    }
    if (!formRouteName.trim()) {
      setModalError('Route Name is mandatory.');
      return;
    }

    // Check Route Code uniqueness
    const normalizedCode = formRouteCode.trim().toUpperCase();
    const duplicate = routes.find(r => 
      r.route_code?.toUpperCase() === normalizedCode && 
      r.id !== editingRoute?.id
    );
    if (duplicate) {
      setModalError(`Route Code "${normalizedCode}" already exists. Please choose a unique code.`);
      return;
    }

    setIsSaving(true);
    try {
      const areasList = formAreas
        ? formAreas.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload: any = {
        route_code: normalizedCode,
        name: formRouteName.trim(),
        type: formRouteType,
        status: formStatus,
        description: formDescription.trim(),
        areas: areasList,
        office: Number(formOfficeId),
        zone: Number(formZoneId),
        city: Number(formCityId),
        tenant: Number(tenantId),
      };

      if (editingRoute) {
        const targetId = editingRoute.documentId || editingRoute.id;
        await apiClient.put(`/routes/${targetId}`, { data: payload });
        triggerToast(`Route ${normalizedCode} updated successfully.`);
      } else {
        await apiClient.post('/routes', { data: payload });
        triggerToast(`Route ${normalizedCode} created successfully.`);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save route:', err);
      setModalError(err.response?.data?.error?.message || err.message || 'Failed to save route.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (r: RouteItem) => {
    const newStatus = r.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const targetId = r.documentId || r.id;
      await apiClient.put(`/routes/${targetId}`, {
        data: { status: newStatus }
      });
      triggerToast(`Route ${r.route_code} marked ${newStatus}.`);
      setRoutes(prev => prev.map(item => item.id === r.id ? { ...item, status: newStatus } : item));
    } catch (err: any) {
      triggerToast('Failed to change status: ' + err.message, 'error');
    }
  };

  // Filtered routes list
  const filteredRoutes = React.useMemo(() => {
    return routes.filter(r => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const codeMatch = (r.route_code || '').toLowerCase().includes(term);
        const nameMatch = (r.name || '').toLowerCase().includes(term);
        const cityMatch = (r.city?.city_name || r.city?.CityName || r.city?.name || '').toLowerCase().includes(term);
        if (!codeMatch && !nameMatch && !cityMatch) return false;
      }
      // Hub
      if (filterOffice && String(r.office?.id) !== filterOffice) return false;
      // City
      if (filterCity && String(r.city?.id) !== filterCity) return false;
      // Zone
      if (filterZone && String(r.zone?.id) !== filterZone) return false;
      // Type
      if (filterType && r.type !== filterType) return false;
      // Status
      if (filterStatus && r.status !== filterStatus) return false;

      return true;
    });
  }, [routes, searchTerm, filterOffice, filterCity, filterZone, filterType, filterStatus]);

  return (
    <PortalLayout>
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
        {/* Toast */}
        {toast.show && (
          <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <RouteIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-on-surface">Route Management</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Operational Delivery &amp; Pickup Routes under Hub &rarr; City &rarr; Zone Hierarchy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/operations/route-assignment"
              className="px-4 py-2.5 bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>Rider Assignment</span>
            </Link>
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-primary text-white hover:bg-primary/90 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Route</span>
            </button>
          </div>
        </div>

        {/* Operational Flow Indicator */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-on-surface-variant font-medium">
            <span className="px-2.5 py-1 bg-surface-container-highest rounded-lg font-bold text-primary">Hierarchy:</span>
            <span>Courier Tenant</span>
            <ArrowRight className="w-3.5 h-3.5 text-outline" />
            <span className="font-semibold text-slate-800">Office/Hub</span>
            <ArrowRight className="w-3.5 h-3.5 text-outline" />
            <span className="font-semibold text-slate-800">City</span>
            <ArrowRight className="w-3.5 h-3.5 text-outline" />
            <span className="font-semibold text-slate-800">Zone</span>
            <ArrowRight className="w-3.5 h-3.5 text-outline" />
            <span className="font-bold text-primary">Route</span>
            <ArrowRight className="w-3.5 h-3.5 text-outline" />
            <span>Rider Sheet</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Total Routes: <strong className="text-slate-900">{routes.length}</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">Active: <strong className="text-emerald-700">{routes.filter(r => r.status === 'Active').length}</strong></span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Route Code, Name, or City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-xl text-xs bg-surface-container-low focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hub Filter */}
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className="px-3 py-2 border border-outline-variant rounded-xl text-xs bg-surface-container-low font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Hubs</option>
              {offices.map(o => (
                <option key={o.id} value={String(o.id)}>{o.name}</option>
              ))}
            </select>

            {/* Zone Filter */}
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="px-3 py-2 border border-outline-variant rounded-xl text-xs bg-surface-container-low font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Zones</option>
              {zones.map(z => (
                <option key={z.id} value={String(z.id)}>{z.name}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-outline-variant rounded-xl text-xs bg-surface-container-low font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="Delivery">Delivery</option>
              <option value="Pickup">Pickup</option>
              <option value="Return">Return</option>
              <option value="Special">Special</option>
              <option value="ThirdParty">3PL</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-outline-variant rounded-xl text-xs bg-surface-container-low font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {(searchTerm || filterOffice || filterCity || filterZone || filterType || filterStatus) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterOffice('');
                  setFilterCity('');
                  setFilterZone('');
                  setFilterType('');
                  setFilterStatus('');
                }}
                className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-outline">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading operational routes...</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-outline">
                <RouteIcon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Routes Found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {routes.length === 0 
                  ? 'No routes have been created yet. Set up routes to subdivide zones and assign them to riders.' 
                  : 'No routes match your search filters.'}
              </p>
              {routes.length === 0 && (
                <button
                  onClick={openCreateModal}
                  className="mt-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 shadow-sm"
                >
                  Create First Route
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Route Code</th>
                    <th className="py-3.5 px-4">Route Name</th>
                    <th className="py-3.5 px-4">Hub / Office</th>
                    <th className="py-3.5 px-4">City</th>
                    <th className="py-3.5 px-4">Zone</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Coverage Areas</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {filteredRoutes.map((r) => {
                    const cityName = r.city?.city_name || r.city?.CityName || r.city?.name || '-';
                    const zoneName = r.zone?.name || '-';
                    const hubName = r.office?.name || '-';
                    const areasDisplay = Array.isArray(r.areas) 
                      ? r.areas.slice(0, 2).join(', ') + (r.areas.length > 2 ? ` +${r.areas.length - 2}` : '')
                      : (r.areas || '-');

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            {r.route_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {r.name}
                          {r.description && (
                            <p className="text-[10px] text-slate-500 font-normal truncate max-w-xs">{r.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 flex items-center gap-1.5 mt-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{hubName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{cityName}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
                            {zoneName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            r.type === 'Delivery' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            r.type === 'Pickup' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            r.type === 'Special' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {r.type === 'ThirdParty' ? '3PL' : r.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {areasDisplay}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(r)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              r.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {r.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              title="Edit Route"
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/operations/route-assignment?route=${encodeURIComponent(r.route_code)}`}
                              title="Assign Rider"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => !isSaving && setIsModalOpen(false)} 
            />

            {/* Modal Card with explicit width */}
            <div 
              style={{ width: '100%', maxWidth: '640px', minWidth: '320px' }}
              className="relative z-10 w-full max-w-[640px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <RouteIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {editingRoute ? `Edit Route: ${editingRoute.route_code}` : 'Create New Operational Route'}
                    </h2>
                    <p className="text-xs text-slate-500">Configure operational area within Office &rarr; City &rarr; Zone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveRoute} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* 1. Office / Hub */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    Operational Office / Hub <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formOfficeId}
                    onChange={(e) => setFormOfficeId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="">Select Operational Hub...</option>
                    {offices.map(o => (
                      <option key={o.id} value={String(o.id)}>{o.name} {o.city ? `(${o.city.city_name || o.city.CityName || ''})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Zone & City (Hierarchical) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      Zone <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formZoneId}
                      onChange={(e) => {
                        setFormZoneId(e.target.value);
                      }}
                      required
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="">Select Zone...</option>
                      {zones.map(z => (
                        <option key={z.id} value={String(z.id)}>{z.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      City (within Zone) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formCityId}
                      onChange={(e) => setFormCityId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="">Select City...</option>
                      {availableCitiesForZone.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Route Code & Auto Suggestion */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      Route Code <span className="text-red-500">*</span>
                    </label>
                    {!editingRoute && (
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAutoCode}
                          onChange={(e) => setIsAutoCode(e.target.checked)}
                          className="rounded text-primary focus:ring-0"
                        />
                        Auto-generate (<span className="font-mono">CITY-ZONE-SEQ</span>)
                      </label>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. LHR-NORTH-01"
                    value={formRouteCode}
                    onChange={(e) => {
                      setIsAutoCode(false);
                      setFormRouteCode(e.target.value.toUpperCase());
                    }}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-mono font-bold text-slate-900 focus:outline-none focus:border-primary uppercase"
                  />
                  <span className="text-[10px] text-slate-400">Must be unique within tenant operational branches.</span>
                </div>

                {/* 4. Route Name & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      Route Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lahore North Route 01"
                      value={formRouteName}
                      onChange={(e) => setFormRouteName(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700">Route Type</label>
                    <select
                      value={formRouteType}
                      onChange={(e) => setFormRouteType(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                    >
                      <option value="Delivery">Delivery</option>
                      <option value="Pickup">Pickup</option>
                      <option value="Return">Return</option>
                      <option value="Special">Special</option>
                      <option value="ThirdParty">3PL</option>
                    </select>
                  </div>
                </div>

                {/* 5. Coverage Areas / Localities */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Covered Localities / Areas (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Johar Town, Faisal Town, Model Town (comma separated)"
                    value={formAreas}
                    onChange={(e) => setFormAreas(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-slate-400">Used for automatic route determination when shipments match delivery addresses.</span>
                </div>

                {/* 6. Description */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Description / Operational Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Brief notes about timing, road restrictions, or instructions..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 7. Status */}
                <div className="flex items-center gap-3 pt-1">
                  <label className="font-bold text-slate-700">Status:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="routeStatus"
                        value="Active"
                        checked={formStatus === 'Active'}
                        onChange={() => setFormStatus('Active')}
                        className="text-primary focus:ring-0"
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600">
                      <input
                        type="radio"
                        name="routeStatus"
                        value="Inactive"
                        checked={formStatus === 'Inactive'}
                        onChange={() => setFormStatus('Inactive')}
                        className="text-primary focus:ring-0"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{editingRoute ? 'Update Route' : 'Create Route'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

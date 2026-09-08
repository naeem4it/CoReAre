'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PakistanLocationMultiSelect } from '@/shared/ui/PakistanLocationMultiSelect';
import { PakistanLocationSelect } from '@/shared/ui/PakistanLocationSelect';
import { 
  Truck, 
  Layers, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  MapPin
} from 'lucide-react';

interface TenantOption {
  id: number | string;
  documentId?: string;
  name: string;
  business_name?: string;
}

export default function AdminSelfServicePage() {
  const [tenants, setTenants] = React.useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>('');
  const [selectedCities, setSelectedCities] = React.useState<string[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = React.useState<boolean>(true);
  const [isLoadingCities, setIsLoadingCities] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test Simulator
  const [testCity, setTestCity] = React.useState<string>('');

  // Fetch all registered tenants from database
  const fetchTenants = async () => {
    try {
      setIsLoadingTenants(true);
      const res = await apiClient.get('/tenant/list?populate=*');
      const list = res.data?.data || [];
      const mapped: TenantOption[] = (Array.isArray(list) ? list : []).map((t: any) => ({
        id: String(t.id),
        documentId: t.attributes?.documentId || t.documentId || String(t.id),
        name: t.attributes?.name || t.name || `Tenant #${t.id}`,
        business_name: t.attributes?.business_name || t.business_name
      }));

      setTenants(mapped);
      if (mapped.length > 0 && !selectedTenantId) {
        setSelectedTenantId(String(mapped[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setTenants([]);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  React.useEffect(() => {
    fetchTenants();
  }, []);

  // Fetch selected tenant's self-service cities directly from database
  const loadTenantCities = React.useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    try {
      setIsLoadingCities(true);
      const res = await apiClient.get('/tenant/list?populate=*');
      const items = res.data?.data || [];
      const tenantObj = items.find((t: any) => String(t.id) === String(tenantId) || t.attributes?.documentId === tenantId);
      const data = tenantObj?.attributes || tenantObj;
      if (data?.self_service_cities && Array.isArray(data.self_service_cities)) {
        setSelectedCities(data.self_service_cities);
      } else {
        setSelectedCities([]);
      }
    } catch (err: any) {
      console.error('Failed to load self-service cities from database:', err);
      setSelectedCities([]);
    } finally {
      setIsLoadingCities(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedTenantId) {
      loadTenantCities(selectedTenantId);
    }
  }, [selectedTenantId, loadTenantCities]);

  const handleSave = async () => {
    if (!selectedTenantId) {
      setNotification({ type: 'error', text: 'Please select a tenant organization first.' });
      return;
    }

    try {
      setIsSaving(true);
      const targetTenant = tenants.find(t => String(t.id) === String(selectedTenantId) || t.documentId === selectedTenantId);
      const tenantNumericId = targetTenant?.id || selectedTenantId;
      
      await apiClient.put(`/tenant/update/${tenantNumericId}`, {
        self_service_cities: selectedCities
      });

      const tenantName = targetTenant?.name || 'Tenant';
      setNotification({
        type: 'success',
        text: `Successfully saved ${selectedCities.length} 2PL self-service areas for ${tenantName} to database!`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Database save error:', err);
      setNotification({ type: 'error', text: 'Failed to save self-service areas to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Test simulation result
  const testRoutingResult = React.useMemo(() => {
    if (!testCity) return null;
    const is2PL = selectedCities.some(
      c => c.toLowerCase().trim() === testCity.toLowerCase().trim()
    );
    return {
      is2PL,
      model: is2PL ? '2PL (In-House Fleet Delivery)' : '3PL (Partner Courier Network Dispatch)',
      badge: is2PL ? '2PL In-House' : '3PL External Partner'
    };
  }, [testCity, selectedCities]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Administration &bull; Multi-Tenant Setup
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Courier 2PL Self-Service Areas
          </h1>
          <p className="text-sm text-blue-100/80 max-w-2xl">
            Configure in-house delivery regions for any registered courier tenant. Any orders within these cities/tehsils will be delivered directly by that courier&apos;s riders (2PL). All other destinations are automatically dispatched through 3PL partner courier networks.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoadingCities || !selectedTenantId}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start md:self-auto"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Service Areas
            </>
          )}
        </Button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.text}</span>
        </div>
      )}

      {/* Tenant Selector Dropdown */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              Select Registered Courier Tenant *
            </label>
            <p className="text-xs text-slate-500">
              Select the courier business whose 2PL delivery service areas you want to configure.
            </p>
          </div>

          <div className="w-full md:w-80">
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              disabled={isLoadingTenants}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.business_name ? `(${t.business_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Area Multi-Selector */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              In-House (2PL) Delivery Cities & Tehsils
            </CardTitle>
            <p className="text-xs text-slate-500">
              All delivery addresses outside these cities will be automatically handled as 3PL.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {selectedCities.length} Selected
          </span>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingCities ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading service areas for selected tenant...
            </div>
          ) : (
            <PakistanLocationMultiSelect
              value={selectedCities}
              onChange={setSelectedCities}
              placeholder="Search & select cities or tehsils..."
              label="Active 2PL Service Coverage"
            />
          )}
        </CardContent>
      </Card>

      {/* Live Routing Simulator */}
      <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/20 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Live Destination Routing Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Pick any test destination to preview how the booking engine classifies orders for this courier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <PakistanLocationSelect
              value={testCity}
              onChange={(val, details) => {
                setTestCity(details?.cityName || String(val || ''));
              }}
              label="Test Destination Address"
              placeholder="Select any city to simulate booking..."
              layout="vertical"
            />

            <div className="p-4 rounded-xl bg-white border border-slate-200 min-h-[88px] flex items-center">
              {testRoutingResult ? (
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    testRoutingResult.is2PL 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {testCity}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        testRoutingResult.is2PL 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {testRoutingResult.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {testRoutingResult.model}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-300" />
                  Select a destination above to see the routing decision.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

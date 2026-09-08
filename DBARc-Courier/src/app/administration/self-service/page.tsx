'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { PakistanLocationMultiSelect } from '@/components/ui/PakistanLocationMultiSelect';
import { PakistanLocationSelect } from '@/components/ui/PakistanLocationSelect';
import { 
  Truck, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw
} from 'lucide-react';

export default function CourierSelfServicePage() {
  const { user } = useAuth();
  const [selectedCities, setSelectedCities] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Routing test simulation
  const [testCity, setTestCity] = React.useState<string>('');

  const tenantId = user?.tenant?.id || user?.tenant;
  const [tenantDocId, setTenantDocId] = React.useState<string>(user?.tenant?.documentId || '');

  const loadTenantServiceAreas = React.useCallback(async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const res = await apiClient.get('/tenant/list?populate=*');
      const items = res.data?.data || [];
      const tenantItem = items.find((t: any) => String(t.id) === String(tenantId) || t.attributes?.documentId === String(tenantId));

      const tenantData = tenantItem?.attributes || tenantItem;
      if (tenantData?.self_service_cities && Array.isArray(tenantData.self_service_cities)) {
        setSelectedCities(tenantData.self_service_cities);
      } else {
        setSelectedCities([]);
      }
    } catch (err: any) {
      console.error('Could not load tenant service areas from database:', err?.message);
      setSelectedCities([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user]);

  React.useEffect(() => {
    loadTenantServiceAreas();
  }, [loadTenantServiceAreas]);

  const handleSave = async () => {
    if (!tenantId) {
      setErrorMessage('No active courier tenant found for this session.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveSuccess(null);
      setErrorMessage(null);

      await apiClient.put(`/tenant/update/${tenantId}`, {
        self_service_cities: selectedCities
      });

      setSaveSuccess(`Successfully saved ${selectedCities.length} 2PL self-service delivery areas to database!`);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error saving self service cities to database:', err);
      setErrorMessage('Failed to save service areas to database.');
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
      color: is2PL ? 'emerald' : 'blue',
      badge: is2PL ? '2PL In-House' : '3PL External Partner'
    };
  }, [testCity, selectedCities]);

  return (
    <PortalLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold backdrop-blur-md">
              <Truck className="w-3.5 h-3.5" />
              Delivery Operations & Area Routing
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              2PL Self-Service Delivery Areas
            </h1>
            <p className="text-sm text-blue-100/80 max-w-2xl">
              Configure the in-house delivery areas for your courier fleet. Any orders within these cities/tehsils will be delivered directly by your in-house riders (2PL). All orders destined outside these areas will automatically route to your configured 3PL partner network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTenantServiceAreas}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15"
              title="Refresh areas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Delivery Areas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-medium">{saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {selectedCities.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Active 2PL In-House Cities
              </div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Automatic
              </div>
              <div className="text-xs text-slate-500 font-medium">
                3PL Partner Dispatch for Other Areas
              </div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Tenant-Isolated
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Specific to Your Courier Organization
              </div>
            </div>
          </div>
        </div>

        {/* Main Coverage Area Selector */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Select In-House Service Locations
              </h2>
              <p className="text-xs text-slate-500">
                Choose the cities and tehsils where your riders provide direct last-mile delivery.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
              {selectedCities.length} Selected
            </span>
          </div>

          <PakistanLocationMultiSelect
            value={selectedCities}
            onChange={setSelectedCities}
            placeholder="Search city, tehsil or district to add to 2PL coverage..."
            label="In-House 2PL Delivery Cities & Tehsils"
          />
        </div>

        {/* Live Interactive Routing Simulator */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Live Destination Routing Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Pick any test destination to preview whether shipments to that address will be booked as 2PL In-House or automatically routed to 3PL logistics.
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

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[88px] flex items-center">
              {testRoutingResult ? (
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    testRoutingResult.is2PL 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' 
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {testCity}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        testRoutingResult.is2PL 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
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
        </div>
      </div>
    </PortalLayout>
  );
}

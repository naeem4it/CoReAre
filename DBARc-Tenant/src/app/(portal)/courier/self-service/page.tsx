'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
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

export default function CourierSelfServiceDeliveryPage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId || (user?.role === 'SUPER_ADMIN' ? '2' : '2');

  const [selectedCities, setSelectedCities] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test Simulator
  const [testCity, setTestCity] = React.useState<string>('');

  const [tenantDocId, setTenantDocId] = React.useState<string>('');

  const loadServiceAreas = React.useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get('/tenant/list?populate=*');
      const items = res.data?.data || [];
      const tenantItem = items.find((t: any) => String(t.id) === String(tenantId) || t.attributes?.documentId === String(tenantId));
      const data = tenantItem?.attributes || tenantItem;
      if (data?.self_service_cities && Array.isArray(data.self_service_cities)) {
        setSelectedCities(data.self_service_cities);
      } else {
        setSelectedCities([]);
      }
    } catch (err: any) {
      console.error('Failed to load self-service cities from database:', err);
      setSelectedCities([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    loadServiceAreas();
  }, [loadServiceAreas]);

  const handleSave = async () => {
    if (!tenantId) {
      setNotification({ type: 'error', text: 'No active courier tenant found.' });
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put(`/tenant/update/${tenantId}`, {
        self_service_cities: selectedCities
      });

      setNotification({
        type: 'success',
        text: `Successfully saved ${selectedCities.length} 2PL self-service delivery areas to database!`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Database save error:', err);
      setNotification({ type: 'error', text: 'Failed to save service areas to database.' });
    } finally {
      setIsSaving(false);
    }
  };

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
            <Truck className="w-3.5 h-3.5" />
            Courier Operations &bull; In-House Delivery Setup
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            2PL Self-Service Delivery Areas
          </h1>
          <p className="text-sm text-blue-100/80 max-w-2xl">
            Configure the in-house delivery cities and tehsils serviced directly by your courier fleet (2PL). All other destinations in Pakistan will automatically be dispatched to your configured 3PL partner network.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
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
              Save Delivery Areas
            </>
          )}
        </Button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.text}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {selectedCities.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Active 2PL In-House Cities
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                Automatic
              </div>
              <div className="text-xs text-slate-500 font-medium">
                3PL Partner Dispatch for Other Areas
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                Courier-Isolated
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Independent of Other Couriers
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Multi-Select */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Configure In-House Delivery Areas
            </CardTitle>
            <p className="text-xs text-slate-500">
              Select all cities and tehsils where your fleet provides last-mile delivery.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {selectedCities.length} Selected
          </span>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading your delivery areas...
            </div>
          ) : (
            <PakistanLocationMultiSelect
              value={selectedCities}
              onChange={setSelectedCities}
              placeholder="Search city, tehsil or district to add to 2PL coverage..."
              label="2PL In-House Delivery Cities"
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
              Pick any test destination to preview whether shipments will be booked as 2PL In-House or routed to 3PL logistics.
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

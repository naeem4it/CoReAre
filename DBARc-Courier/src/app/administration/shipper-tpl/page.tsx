'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { 
  TPL_PROVIDERS, 
  TPLPartnerModel 
} from '@/shared/data/pakistan-3pl-city-mappings';
import { 
  Building2, 
  Users, 
  Star, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Network,
  Truck,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface ShipperRecord {
  id: number | string;
  name: string;
  business_type?: string;
  preferred_tpl_partner?: any;
}

export default function ShipperTPLSetupPage() {
  const { user } = useAuth();
  const tenantId = user?.tenant?.id || user?.tenant;

  const [shippers, setShippers] = React.useState<ShipperRecord[]>([]);
  const [tplPartners, setTplPartners] = React.useState<TPLPartnerModel[]>([]);
  const [selectedShipperId, setSelectedShipperId] = React.useState<string | number>('');
  const [selectedTplPartnerId, setSelectedTplPartnerId] = React.useState<string | number>('default');
  
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch shippers and tpl-partners for this courier directly from database
  const loadData = React.useCallback(async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [shippersRes, partnersRes] = await Promise.all([
        apiClient.get('/shippers?populate=*').catch(() => null),
        apiClient.get('/tpl-partner/list', { params: { tenant: tenantId } }).catch(() => null)
      ]);

      let loadedPartners: TPLPartnerModel[] = [];
      if (partnersRes?.data?.data) {
        loadedPartners = partnersRes.data.data.map((item: any) => ({
          id: item.id,
          ...(item.attributes || item)
        }));
      }
      setTplPartners(loadedPartners);

      let loadedShippers: ShipperRecord[] = [];
      if (shippersRes?.data?.data) {
        loadedShippers = shippersRes.data.data.map((item: any) => ({
          id: item.id,
          name: item.attributes?.name || item.name || `Shipper #${item.id}`,
          business_type: item.attributes?.business_type || item.business_type,
          preferred_tpl_partner: item.attributes?.preferred_tpl_partner?.id || item.attributes?.preferred_tpl_partner?.data?.id || item.preferred_tpl_partner?.id || item.preferred_tpl_partner
        }));
      }

      setShippers(loadedShippers);
      if (loadedShippers.length > 0) {
        const first = loadedShippers[0];
        setSelectedShipperId(first.id);
        setSelectedTplPartnerId(first.preferred_tpl_partner || 'default');
      }
    } catch (err) {
      console.error('Failed to load data from database:', err);
      setShippers([]);
      setTplPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // When selected shipper changes, sync the selected partner
  const handleShipperSelect = (id: string | number) => {
    setSelectedShipperId(id);
    const sh = shippers.find(s => String(s.id) === String(id));
    if (sh && sh.preferred_tpl_partner) {
      setSelectedTplPartnerId(sh.preferred_tpl_partner);
    } else {
      setSelectedTplPartnerId('default');
    }
  };

  const courierPreferredPartner = React.useMemo(() => {
    return tplPartners.find(p => p.is_preferred) || tplPartners[0];
  }, [tplPartners]);

  const handleSave = async () => {
    if (!selectedShipperId) {
      setNotification({ type: 'error', text: 'Please select a shipper.' });
      return;
    }

    try {
      setIsSaving(true);
      const partnerVal = selectedTplPartnerId === 'default' ? null : selectedTplPartnerId;

      await apiClient.put(`/shippers/${selectedShipperId}`, {
        preferred_tpl_partner: partnerVal
      });

      await loadData();

      const shName = shippers.find(s => String(s.id) === String(selectedShipperId))?.name || 'Shipper';
      const pName = selectedTplPartnerId === 'default' 
        ? 'Courier Default' 
        : (tplPartners.find(p => String(p.id) === String(selectedTplPartnerId))?.name || 'Selected 3PL');

      setNotification({
        type: 'success',
        text: `Assigned ${pName} as preferred 3PL for ${shName} in database successfully!`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Error saving shipper 3PL to database:', err);
      setNotification({ type: 'error', text: 'Failed to update shipper 3PL assignment in database.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PortalLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-slate-950 p-6 rounded-2xl text-white shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold backdrop-blur-md">
              <Users className="w-3.5 h-3.5" />
              Shipper Configuration & Preferences
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Shipper 3PL Setup
            </h1>
            <p className="text-sm text-blue-100/80 max-w-2xl">
              Assign a dedicated preferred 3PL partner for each merchant / shipper. When this shipper books an order destined outside your in-house 2PL service areas, the system will route it to their selected 3PL partner first.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 self-start md:self-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.text}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
          {/* Step 1: Select Shipper */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              1. Select Merchant / Shipper *
            </label>
            <select
              value={selectedShipperId}
              onChange={(e) => handleShipperSelect(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {shippers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.business_type ? `(${s.business_type})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Preferred 3PL from Radio Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Network className="w-4 h-4 text-blue-600" />
                2. Select Preferred 3PL Partner for this Shipper *
              </label>
              <span className="text-xs text-slate-500">
                {tplPartners.length} Active 3PL integrations available
              </span>
            </div>

            {tplPartners.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                No active 3PL partners configured yet. Please configure at least one partner in &quot;3PL Setup&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option 0: Courier Default */}
                <label 
                  onClick={() => setSelectedTplPartnerId('default')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedTplPartnerId === 'default'
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipper_tpl"
                    value="default"
                    checked={selectedTplPartnerId === 'default'}
                    onChange={() => setSelectedTplPartnerId('default')}
                    className="w-4 h-4 mt-1 text-blue-600"
                  />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Courier Default Fallback</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Default
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Uses courier organization&apos;s preferred 3PL ({courierPreferredPartner?.name || 'Primary'}).
                    </p>
                  </div>
                </label>

                {/* Configured 3PL Partner Radio Cards */}
                {tplPartners.map(partner => {
                  const def = TPL_PROVIDERS.find(p => p.code === partner.provider_code);
                  const isChecked = String(selectedTplPartnerId) === String(partner.id);
                  return (
                    <label 
                      key={partner.id}
                      onClick={() => setSelectedTplPartnerId(partner.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipper_tpl"
                        value={String(partner.id)}
                        checked={isChecked}
                        onChange={() => setSelectedTplPartnerId(partner.id)}
                        className="w-4 h-4 mt-1 text-blue-600"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{partner.name}</span>
                            {partner.is_preferred && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                Courier Preferred
                              </span>
                            )}
                          </div>
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: def?.color || '#3B82F6' }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">
                          {def?.name} &bull; {partner.coverage_mode === 'specific_cities' ? `${partner.service_cities?.length || 0} Cities` : 'All Pakistan'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedShipperId}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Preference...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Shipper 3PL Preference
                </>
              )}
            </button>
          </div>
        </div>

        {/* Overview Table */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Current Shipper 3PL Assignments ({shippers.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3">Shipper Name</th>
                  <th className="pb-3">Business Type</th>
                  <th className="pb-3">Assigned 3PL Partner</th>
                  <th className="pb-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shippers.map(sh => {
                  const assignedPartner = tplPartners.find(p => String(p.id) === String(sh.preferred_tpl_partner));
                  return (
                    <tr key={sh.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {sh.name}
                      </td>
                      <td className="py-3 text-slate-500">
                        {sh.business_type || 'General Merchant'}
                      </td>
                      <td className="py-3">
                        {assignedPartner ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            {assignedPartner.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            Default ({courierPreferredPartner?.name || 'Courier Fallback'})
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleShipperSelect(sh.id)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                        >
                          Modify
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

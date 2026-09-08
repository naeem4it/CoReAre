'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/model/auth.store';
import { apiClient } from '@/shared/api/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { 
  TPL_PROVIDERS, 
  TPLProviderDefinition, 
  TPLPartnerModel,
  DEFAULT_3PL_CITY_MAPPINGS,
  verify3PLCredentials,
  resolve3PLCityCode
} from '@/shared/data/pakistan-3pl-city-mappings';
import { PakistanLocationMultiSelect } from '@/shared/ui/PakistanLocationMultiSelect';
import { 
  Network, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Star, 
  ExternalLink, 
  Building2, 
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  Check,
  ShieldCheck,
  X
} from 'lucide-react';

export default function CourierTPLSetupPage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId || (user?.role === 'SUPER_ADMIN' ? '2' : '2');

  const [partners, setPartners] = React.useState<TPLPartnerModel[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [editingPartner, setEditingPartner] = React.useState<TPLPartnerModel | null>(null);

  // Form states
  const [selectedProviderCode, setSelectedProviderCode] = React.useState<string>('trax');
  const [partnerName, setPartnerName] = React.useState<string>('');
  const [environment, setEnvironment] = React.useState<'sandbox' | 'production'>('sandbox');
  const [isPreferred, setIsPreferred] = React.useState<boolean>(false);
  const [coverageMode, setCoverageMode] = React.useState<'all_pakistan' | 'specific_cities'>('all_pakistan');
  const [serviceCities, setServiceCities] = React.useState<string[]>([]);
  const [credentials, setCredentials] = React.useState<Record<string, string>>({});
  const [customCityMappings, setCustomCityMappings] = React.useState<Record<string, string>>({});

  // Verification states
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false);
  const [verificationResult, setVerificationResult] = React.useState<{
    status: 'verified' | 'failed' | 'untested';
    message: string;
    details?: any;
  }>({ status: 'untested', message: '' });

  const [showPasswordFields, setShowPasswordFields] = React.useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedProviderDef = React.useMemo(() => {
    return TPL_PROVIDERS.find(p => p.code === selectedProviderCode) || TPL_PROVIDERS[0];
  }, [selectedProviderCode]);

  // Load configured partners
  const fetchPartners = React.useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get('/tpl-partner/list', {
        params: { tenant: tenantId }
      });

      let loaded: any[] = [];
      if (res.data?.data) {
        loaded = res.data.data.map((item: any) => ({
          id: item.id,
          ...(item.attributes || item)
        }));
      }

      setPartners(loaded);
    } catch (err) {
      console.error('Failed to load partners from database:', err);
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Open Add/Edit Modal
  const openEditModal = (partner?: TPLPartnerModel) => {
    if (partner) {
      setEditingPartner(partner);
      setSelectedProviderCode(partner.provider_code);
      setPartnerName(partner.name);
      setEnvironment(partner.environment || 'sandbox');
      setIsPreferred(Boolean(partner.is_preferred));
      setCoverageMode(partner.coverage_mode || 'all_pakistan');
      setServiceCities(partner.service_cities || []);
      setCredentials(partner.api_credentials || {});
      setCustomCityMappings(partner.city_mappings || {});
      setVerificationResult({
        status: partner.verification_status || 'untested',
        message: partner.verification_status === 'verified' ? 'Previously verified' : ''
      });
    } else {
      setEditingPartner(null);
      setSelectedProviderCode('trax');
      setPartnerName('TRAX Logistics');
      setEnvironment('sandbox');
      setIsPreferred(partners.length === 0);
      setCoverageMode('all_pakistan');
      setServiceCities([]);
      setCredentials({});
      setCustomCityMappings({});
      setVerificationResult({ status: 'untested', message: '' });
    }
    setIsModalOpen(true);
  };

  const handleProviderChange = (code: string) => {
    setSelectedProviderCode(code);
    const def = TPL_PROVIDERS.find(p => p.code === code);
    if (def && (!partnerName || TPL_PROVIDERS.some(p => p.name === partnerName))) {
      setPartnerName(def.name);
    }
    setCredentials({});
    setVerificationResult({ status: 'untested', message: '' });
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult({ status: 'untested', message: 'Testing connection...' });
    try {
      const res = await verify3PLCredentials(selectedProviderCode, credentials, environment);
      if (res.success) {
        setVerificationResult({
          status: 'verified',
          message: res.message,
          details: res.accountDetails
        });
      } else {
        setVerificationResult({
          status: 'failed',
          message: res.message
        });
      }
    } catch (err: any) {
      setVerificationResult({
        status: 'failed',
        message: err?.message || 'Verification connection failed'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSavePartner = async () => {
    if (!tenantId) {
      setNotification({ type: 'error', text: 'No active courier tenant found.' });
      return;
    }

    if (!partnerName.trim()) {
      setNotification({ type: 'error', text: 'Please enter a name for this integration.' });
      return;
    }

    if (verificationResult.status !== 'verified') {
      setNotification({
        type: 'error',
        text: 'Please verify the API credentials successfully before saving.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: partnerName.trim(),
        provider_code: selectedProviderCode,
        is_preferred: isPreferred,
        environment,
        coverage_mode: coverageMode,
        service_cities: coverageMode === 'specific_cities' ? serviceCities : [],
        api_credentials: credentials,
        city_mappings: customCityMappings,
        verification_status: verificationResult.status,
        last_verified_at: new Date().toISOString(),
        status: 'active',
        tenant: tenantId
      };

      let updatedList = [...partners];

      if (editingPartner) {
        await apiClient.put(`/tpl-partner/update/${editingPartner.id}`, payload);
      } else {
        await apiClient.post('/tpl-partner/create', payload);
      }

      await fetchPartners();

      setIsModalOpen(false);
      setNotification({
        type: 'success',
        text: `3PL Partner ${partnerName} saved successfully to database!`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Failed to save partner to database:', err);
      setNotification({ type: 'error', text: 'Failed to save 3PL configuration to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePartner = async (partnerId: string | number) => {
    if (!confirm('Are you sure you want to remove this 3PL integration?')) return;
    try {
      await apiClient.delete(`/tpl-partner/delete/${partnerId}`);
      await fetchPartners();
      setNotification({ type: 'success', text: '3PL partner removed from database.' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to delete partner from database:', err);
    }
  };

  const handleTogglePreferred = async (partnerId: string | number) => {
    try {
      await apiClient.put(`/tpl-partner/update/${partnerId}`, { is_preferred: true });
      await fetchPartners();
    } catch (err) {
      console.error('Failed to set preferred partner in database:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold backdrop-blur-md">
            <Network className="w-3.5 h-3.5" />
            3PL Courier Integrations
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            3PL Partner Setup
          </h1>
          <p className="text-sm text-indigo-100/80 max-w-2xl">
            Configure third-party logistics courier APIs (Trax, PostEx, Leopards, TCS, M&P, CallCourier, etc.) to handle deliveries outside your in-house 2PL service areas.
          </p>
        </div>

        <Button
          onClick={() => openEditModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Connect 3PL Partner
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

      {/* Partners List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Configured 3PL Partners ({partners.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Preferred partner acts as default fallback for non-2PL orders
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading 3PL integrations...
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Network className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No 3PL Partners Configured
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Connect your Trax, PostEx, Leopards, TCS, or CallCourier accounts to enable automated order booking outside your 2PL territory.
            </p>
            <Button
              onClick={() => openEditModal()}
              className="bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
            >
              Connect Your First 3PL
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map(partner => {
              const def = TPL_PROVIDERS.find(p => p.code === partner.provider_code);
              return (
                <div
                  key={partner.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                          style={{ backgroundColor: def?.color || '#3B82F6' }}
                        >
                          {def?.shortName || partner.name.slice(0, 3)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {partner.name}
                          </h3>
                          <span className="text-[11px] text-slate-500">
                            {def?.name}
                          </span>
                        </div>
                      </div>

                      {partner.is_preferred && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500" />
                          Preferred
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Environment:</span>
                        <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-slate-100">
                          {partner.environment || 'sandbox'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          partner.verification_status === 'verified'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {partner.verification_status === 'verified' ? 'API Verified' : 'Untested'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Coverage:</span>
                        <span className="font-medium text-[11px]">
                          {partner.coverage_mode === 'specific_cities' 
                            ? `${partner.service_cities?.length || 0} Cities`
                            : 'All Pakistan'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {!partner.is_preferred ? (
                      <button
                        onClick={() => handleTogglePreferred(partner.id)}
                        className="text-[11px] text-slate-500 hover:text-amber-600 flex items-center gap-1 font-medium"
                      >
                        <Star className="w-3 h-3" />
                        Set Preferred
                      </button>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500" />
                        Default 3PL
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(partner)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                        title="Edit Configuration"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePartner(partner.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        title="Delete Partner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: selectedProviderDef.color }}
                >
                  {selectedProviderDef.shortName}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPartner ? 'Edit 3PL Partner' : 'Connect 3PL Partner API'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure authentication and service routing for {selectedProviderDef.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select 3PL Courier Provider *
                </label>
                <select
                  value={selectedProviderCode}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {TPL_PROVIDERS.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.tagline})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. TRAX Express COD"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Environment
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvironment('sandbox')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        environment === 'sandbox'
                          ? 'bg-blue-50 border-blue-500 text-blue-600'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Sandbox / Test
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironment('production')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        environment === 'production'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Production Live
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {selectedProviderDef.name} Credentials
                  </span>
                  <a
                    href={selectedProviderDef.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    API Documentation <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {selectedProviderDef.credentialFields.map(field => {
                  const isSecret = field.isSecret || field.type === 'password';
                  const showVal = showPasswordFields[field.key] || false;
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                        <span>
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </span>
                        {field.description && (
                          <span className="text-[10px] text-slate-400">{field.description}</span>
                        )}
                      </label>

                      <div className="relative">
                        <input
                          type={isSecret && !showVal ? 'password' : 'text'}
                          value={credentials[field.key] || ''}
                          onChange={(e) => {
                            setCredentials(prev => ({ ...prev, [field.key]: e.target.value }));
                            setVerificationResult({ status: 'untested', message: '' });
                          }}
                          placeholder={field.placeholder}
                          className="w-full pl-3.5 pr-10 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {isSecret && (
                          <button
                            type="button"
                            onClick={() => setShowPasswordFields(prev => ({ ...prev, [field.key]: !showVal }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            {showVal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    {isVerifying ? 'Verifying API...' : 'Verify API Credentials'}
                  </button>

                  {verificationResult.status !== 'untested' && (
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                      verificationResult.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-rose-100 text-rose-700 border border-rose-300'
                    }`}>
                      {verificationResult.status === 'verified' ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{verificationResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(e) => setIsPreferred(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    Set as Preferred 3PL Partner
                  </div>
                  <div className="text-[11px] text-slate-500">
                    When a shipper has no specific preferred courier, this 3PL will be the default fallback for all non-2PL orders.
                  </div>
                </div>
              </label>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Delivery Coverage Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoverageMode('all_pakistan')}
                    className={`p-3 text-left rounded-xl border text-xs space-y-1 transition-all ${
                      coverageMode === 'all_pakistan'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>All Pakistan (Default)</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      Assumes partner delivers to all cities and tehsils nationwide.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverageMode('specific_cities')}
                    className={`p-3 text-left rounded-xl border text-xs space-y-1 transition-all ${
                      coverageMode === 'specific_cities'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>Specific Cities Only</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      Restrict this partner only to a designated list of cities.
                    </div>
                  </button>
                </div>

                {coverageMode === 'specific_cities' && (
                  <div className="pt-2 animate-in fade-in">
                    <PakistanLocationMultiSelect
                      value={serviceCities}
                      onChange={setServiceCities}
                      label="Partner Service Coverage Cities"
                      placeholder="Select cities serviced by this partner..."
                    />
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      City Code Mappings for {selectedProviderDef.shortName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Standard codes auto-resolved; custom overrides optional
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-2 pr-1 text-xs">
                  {['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'].map(city => {
                    const res = resolve3PLCityCode(selectedProviderCode, city, customCityMappings);
                    return (
                      <div key={city} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                        <div className="font-medium text-slate-800">
                          {city}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">Code:</span>
                          <input
                            type="text"
                            value={customCityMappings[city] !== undefined ? customCityMappings[city] : res.code}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomCityMappings(prev => ({ ...prev, [city]: val }));
                            }}
                            className="w-20 px-2 py-1 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded text-center focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>

              <Button
                type="button"
                onClick={handleSavePartner}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save 3PL Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  BarChart3, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Globe, 
  Settings2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Database,
  Mail
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'Basic' | 'Growth' | 'Enterprise';
  commissionPct: number;
  status: 'active' | 'suspended' | 'pending';
  features: {
    tplAggregation: boolean;
    liveRiderTracking: boolean;
    smsNotifications: boolean;
    doorstepDigitalPay: boolean;
    pakistanTaxEngine: boolean;
  };
  createdAt: string;
}

interface TenantPlan {
  id: number;
  attributes: {
    name: string;
    charge_type: 'percentage' | 'fixed_rupees';
    charge_value: number;
  };
}

const INITIAL_TENANTS: Tenant[] = [
  {
    id: 't-1',
    name: 'Fly International',
    domain: 'fly.dbarc.com',
    plan: 'Enterprise',
    commissionPct: 2.0,
    status: 'active',
    features: {
      tplAggregation: true,
      liveRiderTracking: true,
      smsNotifications: true,
      doorstepDigitalPay: false,
      pakistanTaxEngine: true
    },
    createdAt: '2026-01-15'
  },
  {
    id: 't-2',
    name: 'Express Logistics Co',
    domain: 'express.dbarc.com',
    plan: 'Growth',
    commissionPct: 2.5,
    status: 'active',
    features: {
      tplAggregation: true,
      liveRiderTracking: false,
      smsNotifications: true,
      doorstepDigitalPay: true,
      pakistanTaxEngine: true
    },
    createdAt: '2026-03-10'
  },
  {
    id: 't-3',
    name: 'Quick Courier & Cargo',
    domain: 'quick.dbarc.com',
    plan: 'Basic',
    commissionPct: 3.0,
    status: 'suspended',
    features: {
      tplAggregation: false,
      liveRiderTracking: false,
      smsNotifications: true,
      doorstepDigitalPay: false,
      pakistanTaxEngine: false
    },
    createdAt: '2026-04-01'
  },
  {
    id: 't-4',
    name: 'Apex Speed Deliveries',
    domain: 'apex.dbarc.com',
    plan: 'Enterprise',
    commissionPct: 2.0,
    status: 'pending',
    features: {
      tplAggregation: true,
      liveRiderTracking: true,
      smsNotifications: false,
      doorstepDigitalPay: false,
      pakistanTaxEngine: true
    },
    createdAt: '2026-05-28'
  }
];

export default function AdminTenantsPage() {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [availablePlans, setAvailablePlans] = React.useState<TenantPlan[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  
  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null);

  // Form states for creating/editing
  const [formName, setFormName] = React.useState('');
  const [formDomain, setFormDomain] = React.useState('');
  const [formAddress, setFormAddress] = React.useState('');
  const [formPlan, setFormPlan] = React.useState<string>(''); // stores plan ID
  const [formCommission, setFormCommission] = React.useState(2.0);
  const [formStatus, setFormStatus] = React.useState<'active' | 'suspended' | 'pending'>('pending');
  const [formFeatures, setFormFeatures] = React.useState({
    tplAggregation: false,
    liveRiderTracking: false,
    smsNotifications: false,
    doorstepDigitalPay: false,
    pakistanTaxEngine: false
  });

  // Admin Credentials State
  const [formAdminUsername, setFormAdminUsername] = React.useState('');
  const [formAdminFullName, setFormAdminFullName] = React.useState('');
  const [formAdminEmail, setFormAdminEmail] = React.useState('');
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');
  const [formAdminPassword, setFormAdminPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/tenant-plan/list');
      setAvailablePlans(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch plans', err);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await apiClient.get('/tenant/list?populate=*');
      const fetchedTenants = res.data.data.map((item: any) => ({
        id: item.id.toString(),
        name: item.attributes.name || '',
        domain: item.attributes.domain || '',
        plan: item.attributes.tenant_plan?.data?.attributes?.name || item.attributes.plan || 'Growth',
        commissionPct: item.attributes.commissionPct || 2.0,
        status: item.attributes.status || 'pending',
        features: item.attributes.features || {
          tplAggregation: false,
          liveRiderTracking: false,
          smsNotifications: false,
          doorstepDigitalPay: false,
          pakistanTaxEngine: false
        },
        createdAt: new Date(item.attributes.createdAt).toISOString().split('T')[0]
      }));
      setTenants(fetchedTenants);
    } catch (err) {
      console.error('Failed to fetch tenants', err);
      // Fallback to initial tenants for UI demo purposes if backend isn't ready
      setTenants(INITIAL_TENANTS);
    }
  };

  const handleOpenConfig = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormName(tenant.name);
    setFormDomain(tenant.domain);
    setFormPlan(tenant.plan);
    setFormCommission(tenant.commissionPct);
    setFormStatus(tenant.status);
    setFormFeatures({ ...tenant.features });
    setIsConfigModalOpen(true);
  };

  const handleOpenCreate = () => {
    setFormName('');
    setFormDomain('');
    setFormAddress('');
    if (availablePlans.length > 0) {
      handlePlanChange(availablePlans[0].id.toString());
    } else {
      setFormPlan('');
      setFormCommission(2.0);
    }
    setFormStatus('pending');
    setFormFeatures({
      tplAggregation: false,
      liveRiderTracking: false,
      smsNotifications: true,
      doorstepDigitalPay: false,
      pakistanTaxEngine: true
    });
    setFormAdminUsername('');
    setFormAdminFullName('');
    setFormAdminEmail('');
    setFormConfirmationType('no_confirmation');
    setFormAdminPassword('');
    setIsCreateModalOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    setFormPlan(planId);
    const plan = availablePlans.find(p => p.id.toString() === planId);
    if (plan) {
      setFormCommission(plan.attributes.charge_value || 0);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      await apiClient.put(`/tenant/update/${selectedTenant.id}`, {
        name: formName,
        domain: formDomain,
        plan: availablePlans.find(p => p.id.toString() === formPlan)?.attributes.name || formPlan,
        tenant_plan: formPlan,
        commissionPct: Number(formCommission),
        status: formStatus,
        features: formFeatures
      });

      await fetchTenants();
      setIsConfigModalOpen(false);
      setSelectedTenant(null);
    } catch (err: any) {
      console.error('Failed to update tenant configuration', err);
      alert(err.response?.data?.error?.message || 'Failed to update configurations');
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formName,
        domain: formDomain || `${formName.toLowerCase().replace(/[^a-z0-9]/g, '')}.dbarc.com`,
        address: formAddress,
        plan: availablePlans.find(p => p.id.toString() === formPlan)?.attributes.name || formPlan,
        tenant_plan: formPlan,
        commissionPct: Number(formCommission),
        status: formStatus,
        features: { ...formFeatures },
        adminUsername: formAdminUsername,
        adminFullName: formAdminFullName,
        adminEmail: formAdminEmail,
        adminPassword: formAdminPassword,
        confirmationType: formConfirmationType
      };

      await apiClient.post('/tenant/provision', payload);
      await fetchTenants();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Failed to provision tenant', err);
      alert(err.response?.data?.error?.message || 'Failed to provision workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendAdminInvite = async (tenantId: string) => {
    try {
      await apiClient.post(`/tenant/${tenantId}/resend-admin-invite`);
      alert('Admin setup invitation has been resent.');
    } catch (err: any) {
      console.error('Failed to resend admin invite', err);
      alert(err.response?.data?.error?.message || 'Failed to resend admin invite.');
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = (tenant.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (tenant.domain || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: 'active' | 'suspended' | 'pending') => {
    const styles = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      suspended: 'bg-red-50 text-red-700 border-red-100',
      pending: 'bg-amber-50 text-amber-700 border-amber-100'
    };

    const icons = {
      active: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1 inline-block" />,
      suspended: <XCircle className="h-3.5 w-3.5 text-red-500 mr-1 inline-block" />,
      pending: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-1 inline-block" />
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {icons[status]}
        {status.toUpperCase()}
      </span>
    );
  };

  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const pendingCount = tenants.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tenant Control Center</h1>
          <p className="text-slate-500 font-medium">Provision, configure billing, and toggle core features across platform workspaces.</p>
        </div>
        <Button onClick={handleOpenCreate} className="rounded-xl h-11 px-5 font-bold shadow-md shadow-primary-600/10">
          <Plus className="mr-2 h-4 w-4" /> Onboard Tenant
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Tenants</CardTitle>
            <Building2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{activeCount}</div>
            <p className="text-xs text-slate-400 mt-1">Operational live workspaces</p>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Approval</CardTitle>
            <Users className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{pendingCount}</div>
            <p className="text-xs text-slate-400 mt-1">Awaiting KYC & verification</p>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Global Comm (Avg)</CardTitle>
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">2.38%</div>
            <p className="text-xs text-slate-400 mt-1">Weighted platform cut per parcel</p>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">SaaS Infrastructure</CardTitle>
            <Database className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">99.98%</div>
            <p className="text-xs text-slate-400 mt-1">Isolated DB RLS Status: Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Directory control bar */}
      <Card className="overflow-hidden border border-slate-200 bg-white/70 backdrop-blur-md shadow-xl shadow-slate-100/40">
        <CardHeader className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-slate-800">Tenant Workspaces</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Table Content */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Tenant Name</th>
                  <th className="px-6 py-4">Subdomain</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Plan & Billing</th>
                  <th className="px-6 py-4">Onboarded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      No tenant workspaces found matching the filters.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{tenant.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {tenant.id}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Globe className="h-3.5 w-3.5 text-slate-400" />
                          {tenant.domain}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(tenant.status)}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{tenant.plan}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Commission: {tenant.commissionPct.toFixed(2)}%</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{tenant.createdAt}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendAdminInvite(tenant.id)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        >
                          <Mail className="h-3.5 w-3.5" /> Resend Invite
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenConfig(tenant)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        >
                          <Settings2 className="h-3.5 w-3.5" /> Configure
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: CREATE TENANT */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="Provision New Tenant Workspace"
        size="lg"
      >
        <form onSubmit={handleCreateTenant} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tenant Business Name"
              placeholder="e.g. Leopard Prime Express"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Input
              label="Custom Domain / Subdomain"
              placeholder="e.g. leopard.dbarc.com"
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value)}
              helperText="Defaults to businessname.dbarc.com"
            />
            <Input
              label="Physical Address"
              placeholder="e.g. 123 Main St, City"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Platform SaaS Plan</label>
              <select
                value={formPlan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              >
                {availablePlans.length === 0 && <option value="">No plans available</option>}
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id.toString()}>
                    {plan.attributes.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={
                availablePlans.find(p => p.id.toString() === formPlan)?.attributes.charge_type === 'fixed_rupees' 
                ? "Platform Fixed Fee (PKR)" 
                : "Platform Commission Fee (%)"
              }
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={formCommission}
              onChange={(e) => setFormCommission(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Initial Workspace Status</label>
            <div className="flex items-center gap-4">
              {['pending', 'active'].map((s) => (
                <label key={s} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="new-status"
                    checked={formStatus === s}
                    onChange={() => setFormStatus(s as any)}
                    className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tenant Admin Credentials */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Tenant Admin Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Admin Username"
                value={formAdminUsername}
                onChange={(e) => setFormAdminUsername(e.target.value)}
                required
              />
              <Input
                label="Admin Full Name"
                value={formAdminFullName}
                onChange={(e) => setFormAdminFullName(e.target.value)}
                required
              />
              <Input
                label="Admin Email"
                type="email"
                value={formAdminEmail}
                onChange={(e) => setFormAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Account Confirmation</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-xs font-semibold text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={formConfirmationType === 'email_confirmation'}
                    onChange={() => setFormConfirmationType('email_confirmation')}
                    className="w-4 h-4 text-primary focus:ring-0 border-slate-300 mr-2"
                  />
                  Require Email Confirmation
                </label>
                <label className="flex items-center gap-xs font-semibold text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={formConfirmationType === 'no_confirmation'}
                    onChange={() => setFormConfirmationType('no_confirmation')}
                    className="w-4 h-4 text-primary focus:ring-0 border-slate-300 mr-2"
                  />
                  No Email Confirmation
                </label>
              </div>
            </div>
            {formConfirmationType === 'no_confirmation' && (
              <div className="mt-4">
                <Input
                  label="Initial Admin Password"
                  type="password"
                  value={formAdminPassword}
                  onChange={(e) => setFormAdminPassword(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Features Toggles */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Module Configurations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.tplAggregation}
                  onChange={(e) => setFormFeatures(f => ({ ...f, tplAggregation: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">3PL Auto-Delegation</span>
                  <p className="text-xs text-slate-400">Routes off-coverage deliveries to partner couriers.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.liveRiderTracking}
                  onChange={(e) => setFormFeatures(f => ({ ...f, liveRiderTracking: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">Live Rider GPS tracking</span>
                  <p className="text-xs text-slate-400">Enables PostGIS real-time location coordinate streaming.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.smsNotifications}
                  onChange={(e) => setFormFeatures(f => ({ ...f, smsNotifications: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">SMS & WhatsApp Alerts</span>
                  <p className="text-xs text-slate-400">Omni-channel CX delivery updates templates.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.pakistanTaxEngine}
                  onChange={(e) => setFormFeatures(f => ({ ...f, pakistanTaxEngine: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">PK Regional Tax Calculations</span>
                  <p className="text-xs text-slate-400">Auto applies 18% services GST & 2% COD WHT.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning...' : 'Provision Workspace'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CONFIGURE TENANT */}
      <Modal 
        isOpen={isConfigModalOpen} 
        onClose={() => {
          setIsConfigModalOpen(false);
          setSelectedTenant(null);
        }} 
        title={`Configure Workspace: ${selectedTenant?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tenant Business Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Input
              label="Custom Domain / Subdomain"
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Platform SaaS Plan</label>
              <select
                value={formPlan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              >
                {availablePlans.length === 0 && <option value="">No plans available</option>}
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id.toString()}>
                    {plan.attributes.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={
                availablePlans.find(p => p.id.toString() === formPlan)?.attributes.charge_type === 'fixed_rupees' 
                ? "Platform Fixed Fee (PKR)" 
                : "Platform Commission Fee (%)"
              }
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={formCommission}
              onChange={(e) => setFormCommission(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Workspace Status</label>
            <div className="flex items-center gap-4">
              {['active', 'suspended', 'pending'].map((s) => (
                <label key={s} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="edit-status"
                    checked={formStatus === s}
                    onChange={() => setFormStatus(s as any)}
                    className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Module Configurations */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Module Toggles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.tplAggregation}
                  onChange={(e) => setFormFeatures(f => ({ ...f, tplAggregation: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">3PL Auto-Delegation</span>
                  <p className="text-xs text-slate-400">Out-of-coverage parcel outsourcing.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.liveRiderTracking}
                  onChange={(e) => setFormFeatures(f => ({ ...f, liveRiderTracking: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">Live Rider GPS tracking</span>
                  <p className="text-xs text-slate-400">PostGIS coordinate mapping interface.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.smsNotifications}
                  onChange={(e) => setFormFeatures(f => ({ ...f, smsNotifications: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">SMS & WhatsApp Alerts</span>
                  <p className="text-xs text-slate-400">Dynamic template events dispatching.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.doorstepDigitalPay}
                  onChange={(e) => setFormFeatures(f => ({ ...f, doorstepDigitalPay: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">Doorstep QR Digital Payments</span>
                  <p className="text-xs text-slate-400">Generates instant dynamic transaction links on deliver.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatures.pakistanTaxEngine}
                  onChange={(e) => setFormFeatures(f => ({ ...f, pakistanTaxEngine: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">Pakistan Tax Compliance (18% / 2%)</span>
                  <p className="text-xs text-slate-400">Calculate local tax ledger offsets automatically.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => {
                setIsConfigModalOpen(false);
                setSelectedTenant(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Configurations
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


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
  Mail,
  User,
  Eye,
  EyeOff
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
  businessName?: string;
  themePrimaryColor?: string;
  logo?: any;
  address?: string;
  adminUsername?: string;
  adminEmail?: string;
  adminFullName?: string;
  adminPhone?: string;
}

// Password Policy: 8-20 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character
const validatePasswordRule = (pwd: string): { isValid: boolean; message?: string } => {
  if (!pwd || pwd.length < 8 || pwd.length > 20) {
    return { isValid: false, message: 'Password must be between 8 and 20 characters long.' };
  }
  if (!/[A-Z]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
    return { isValid: false, message: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }
  return { isValid: true };
};

interface TenantPlan {
  id: number;
  attributes: {
    name: string;
    charge_type: 'percentage' | 'fixed_rupees';
    charge_value: number;
  };
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [availablePlans, setAvailablePlans] = React.useState<TenantPlan[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  
  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isStylingModalOpen, setIsStylingModalOpen] = React.useState(false);
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

  // UI Branding Form States
  const [formBusinessName, setFormBusinessName] = React.useState('');
  const [formThemeColor, setFormThemeColor] = React.useState('#003ec7');
  const [formLogoFile, setFormLogoFile] = React.useState<File | null>(null);

  // Admin Credentials State
  const [formAdminUsername, setFormAdminUsername] = React.useState('');
  const [formAdminFullName, setFormAdminFullName] = React.useState('');
  const [formAdminEmail, setFormAdminEmail] = React.useState('');
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');
  const [formAdminPassword, setFormAdminPassword] = React.useState('');
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
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
        createdAt: item.attributes.createdAt ? new Date(item.attributes.createdAt).toISOString().split('T')[0] : '2026-01-01',
        businessName: item.attributes.business_name || '',
        themePrimaryColor: item.attributes.theme_primary_color || '#003ec7',
        logo: item.attributes.logo?.data || null,
        address: item.attributes.address || '',
        adminUsername: item.attributes.adminUser?.username || item.attributes.adminUsername || '',
        adminEmail: item.attributes.adminUser?.email || item.attributes.adminEmail || '',
        adminFullName: item.attributes.adminUser?.fullName || item.attributes.adminFullName || '',
        adminPhone: item.attributes.adminUser?.phone || item.attributes.adminPhone || '',
      }));
      setTenants(fetchedTenants);
    } catch (err) {
      console.error('Failed to fetch tenants', err);
      setTenants([]);
    }
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormName(tenant.name);
    setFormDomain(tenant.domain);
    setFormAddress(tenant.address || '');
    const matchedPlan = availablePlans.find(p => p.attributes.name === tenant.plan || p.id.toString() === tenant.plan);
    setFormPlan(matchedPlan ? matchedPlan.id.toString() : (tenant.plan || ''));
    setFormCommission(tenant.commissionPct);
    setFormStatus(tenant.status);
    setFormFeatures({ ...tenant.features });
    setFormAdminUsername(tenant.adminUsername || '');
    setFormAdminFullName(tenant.adminFullName || '');
    setFormAdminEmail(tenant.adminEmail || '');
    setFormAdminPassword('');
    setShowAdminPassword(false);
    setIsConfigModalOpen(true);
  };

  const handleOpenStylingConfig = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormBusinessName(tenant.businessName || tenant.name);
    setFormThemeColor(tenant.themePrimaryColor || '#003ec7');
    setFormLogoFile(null);
    setIsStylingModalOpen(true);
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
    setShowAdminPassword(false);
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

    if (formAdminPassword.trim()) {
      const pwdVal = validatePasswordRule(formAdminPassword.trim());
      if (!pwdVal.isValid) {
        alert(pwdVal.message || 'Invalid admin password format.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formName,
        domain: formDomain,
        address: formAddress,
        plan: availablePlans.find(p => p.id.toString() === formPlan)?.attributes.name || formPlan,
        tenant_plan: formPlan,
        commissionPct: Number(formCommission),
        status: formStatus,
        features: formFeatures,
        adminUsername: formAdminUsername.trim(),
        adminFullName: formAdminFullName.trim(),
        adminEmail: formAdminEmail.trim(),
      };

      if (formAdminPassword.trim()) {
        payload.adminPassword = formAdminPassword.trim();
      }

      await apiClient.put(`/tenant/update/${selectedTenant.id}`, payload);

      await fetchTenants();
      setIsConfigModalOpen(false);
      setSelectedTenant(null);
    } catch (err: any) {
      console.error('Failed to update tenant configuration', err);
      alert(err.response?.data?.error?.message || 'Failed to update tenant details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStyling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setIsSubmitting(true);
    try {
      let logoId = null;
      if (formLogoFile) {
        const formData = new FormData();
        formData.append('files', formLogoFile);
        const uploadRes = await apiClient.post('/upload', formData);
        logoId = uploadRes.data[0].id;
      }
      
      const payload: any = {
        business_name: formBusinessName,
        theme_primary_color: formThemeColor,
      };
      if (logoId) {
        payload.logo = logoId;
      }

      await apiClient.put(`/tenant/update/${selectedTenant.id}`, payload);
      await fetchTenants();
      setIsStylingModalOpen(false);
      setSelectedTenant(null);
    } catch (err: any) {
      console.error('Failed to update styling configuration', err);
      alert(err.response?.data?.error?.message || 'Failed to update styling configurations');
    } finally {
      setIsSubmitting(false);
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
    const query = searchQuery.toLowerCase();
    const matchesSearch = (tenant.name || '').toLowerCase().includes(query) || 
                          (tenant.domain || '').toLowerCase().includes(query) ||
                          (tenant.adminUsername || '').toLowerCase().includes(query) ||
                          (tenant.adminEmail || '').toLowerCase().includes(query);
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
                  <th className="px-6 py-4">Tenant Admin (Username)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Plan & Billing</th>
                  <th className="px-6 py-4">Onboarded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {(tenant.adminUsername || tenant.name || 'A').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span className="truncate">{tenant.adminUsername || <span className="italic text-slate-400">admin</span>}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">Admin</span>
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {tenant.adminEmail || `${(tenant.name || 'tenant').toLowerCase().replace(/\s+/g, '')}@courier.com`}
                            </div>
                          </div>
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
                          onClick={() => handleOpenEdit(tenant)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-600 hover:text-white transition-all shadow-sm cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendAdminInvite(tenant.id)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950 cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5" /> Invite
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStylingConfig(tenant)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950 cursor-pointer"
                        >
                          <Globe className="h-3.5 w-3.5" /> UI
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

      {/* MODAL 3: STYLING TENANT */}
      <Modal 
        isOpen={isStylingModalOpen} 
        onClose={() => setIsStylingModalOpen(false)} 
        title="Configure Tenant UI Branding"
        size="md"
      >
        <form onSubmit={handleSaveStyling} className="space-y-6">
          <Input
            label="Business Name (Display Name)"
            placeholder="e.g. Velocity Courier"
            value={formBusinessName}
            onChange={(e) => setFormBusinessName(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Theme Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formThemeColor}
                onChange={(e) => setFormThemeColor(e.target.value)}
                className="h-10 w-16 p-1 rounded border border-slate-200 cursor-pointer"
              />
              <Input
                placeholder="#003ec7"
                value={formThemeColor}
                onChange={(e) => setFormThemeColor(e.target.value)}
                className="flex-1"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tenant Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFormLogoFile(e.target.files[0]);
                }
              }}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {selectedTenant?.logo && !formLogoFile && (
              <p className="text-xs text-slate-500 mt-2">Current logo is uploaded. Selecting a new file will replace it.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsStylingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT TENANT DETAILS */}
      <Modal 
        isOpen={isConfigModalOpen} 
        onClose={() => {
          setIsConfigModalOpen(false);
          setSelectedTenant(null);
        }} 
        title={`Edit Tenant Details: ${selectedTenant?.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Workspace Details */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Tenant Information</h4>
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
              <div className="col-span-full">
                <Input
                  label="Head Office Address"
                  placeholder="e.g. Plot 45, Main Industrial Area, Karachi"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Plan & Billing */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">SaaS Plan & Billing</h4>
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

            <div className="space-y-1.5 mt-4">
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
          </div>

          {/* Tenant Admin Account Details */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" /> Tenant Admin Account
              </h4>
              <span className="text-xs text-slate-400">Primary Courier Admin credentials</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Admin Username"
                placeholder="e.g. flyadmin"
                value={formAdminUsername}
                onChange={(e) => setFormAdminUsername(e.target.value)}
                required
              />
              <Input
                label="Admin Full Name"
                placeholder="e.g. Ahmed Khan"
                value={formAdminFullName}
                onChange={(e) => setFormAdminFullName(e.target.value)}
              />
              <Input
                label="Admin Email Address"
                type="email"
                placeholder="admin@tenantdomain.com"
                value={formAdminEmail}
                onChange={(e) => setFormAdminEmail(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Change Admin Password (Optional)</label>
                <div className="relative flex items-center">
                  <Input
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="Leave blank to keep current password"
                    value={formAdminPassword}
                    onChange={(e) => setFormAdminPassword(e.target.value)}
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password rules indicator when typing password */}
            {formAdminPassword.length > 0 && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                <span className="font-bold text-slate-700 block mb-1">New Password Requirements:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <span className={`flex items-center gap-1.5 ${formAdminPassword.length >= 8 && formAdminPassword.length <= 20 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 8 to 20 characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${/[A-Z]/.test(formAdminPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1 uppercase (A-Z)
                  </span>
                  <span className={`flex items-center gap-1.5 ${/[a-z]/.test(formAdminPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1 lowercase (a-z)
                  </span>
                  <span className={`flex items-center gap-1.5 ${/[0-9]/.test(formAdminPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1 number (0-9)
                  </span>
                  <span className={`flex items-center gap-1.5 col-span-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formAdminPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1 special character (!@#$%^&*...)
                  </span>
                </div>
              </div>
            )}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Tenant Details'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


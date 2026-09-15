'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { 
  Building2, 
  UserCheck, 
  Briefcase, 
  Plus, 
  Save, 
  RefreshCw, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  DollarSign,
  Phone,
  Mail,
  X
} from 'lucide-react';

interface EmployeeUser {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  role_definition?: Array<{ id: number; role_name: string }>;
  tenant?: any;
}

interface ShipperRecord {
  id: number;
  name: string;
  entity_type?: 'Our Employee' | 'Contractor' | string;
  business_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  profit_type?: 'Fixed price' | 'Percentage' | string;
  profit_value?: number;
  status?: string;
  employee?: { id: number; username: string; fullName?: string } | null;
  createdAt?: string;
}

export default function AdministrationShippersPage() {
  const [shippers, setShippers] = React.useState<ShipperRecord[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingShipperId, setEditingShipperId] = React.useState<number | null>(null);

  // 1. Radio button: Our Employee vs Contractor
  const [entityType, setEntityType] = React.useState<'Our Employee' | 'Contractor'>('Our Employee');
  
  // 2. Selected employee (when entityType === 'Our Employee')
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>('');

  // 3. Textbox fields
  const [formName, setFormName] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formAddress, setFormAddress] = React.useState('');
  const [formStatus, setFormStatus] = React.useState('active');

  // 4. Type of profit (Fixed price vs Percentage)
  const [profitType, setProfitType] = React.useState<'Fixed price' | 'Percentage'>('Fixed price');
  const [profitValue, setProfitValue] = React.useState<string>('50');

  // Validation / Toast
  const [formError, setFormError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Resolve current tenant ID
  const currentTenantId = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      const u = JSON.parse(userStr);
      return u.tenant?.id || u.tenantId || (typeof u.tenant === 'number' ? u.tenant : null);
    } catch {
      return null;
    }
  }, []);

  // Fetch all shippers and courier employees
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [shippersRes, usersRes] = await Promise.allSettled([
        apiClient.get('/shippers?populate=*&pagination[pageSize]=500&sort=createdAt:desc'),
        apiClient.get('/users?populate=role_definition,tenant,role&pagination[pageSize]=500')
      ]);

      if (shippersRes.status === 'fulfilled') {
        const rawList = shippersRes.value.data?.data || [];
        const mappedShippers: ShipperRecord[] = rawList.map((item: any) => ({
          id: item.id,
          name: item.name || item.attributes?.name || `Shipper #${item.id}`,
          entity_type: item.entity_type || item.attributes?.entity_type || item.business_type || item.attributes?.business_type || 'Contractor',
          business_type: item.business_type || item.attributes?.business_type || 'Contractor',
          phone: item.phone || item.attributes?.phone || '',
          email: item.email || item.attributes?.email || '',
          address: item.address || item.attributes?.address || '',
          profit_type: item.profit_type || item.attributes?.profit_type || 'Fixed price',
          profit_value: Number(item.profit_value || item.attributes?.profit_value || 0),
          status: item.status || item.attributes?.status || 'active',
          employee: item.employee || item.attributes?.employee || null,
          createdAt: item.createdAt || item.attributes?.createdAt,
        }));
        setShippers(mappedShippers);
      }

      if (usersRes.status === 'fulfilled') {
        const rawUsers = Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data?.data || [];
        // Filter strictly for this courier/tenant employees (exclude Super Admin)
        const tenantEmployees = rawUsers.filter((u: any) => {
          if (currentTenantId) {
            const uTenantId = u.tenant?.id || (typeof u.tenant === 'number' ? u.tenant : null);
            if (uTenantId && Number(uTenantId) !== Number(currentTenantId)) {
              return false;
            }
          }
          const isSuperAdmin = (u.role?.name || '').toLowerCase() === 'super admin' || u.username === 'superadmin';
          return !isSuperAdmin && !u.blocked;
        });
        setEmployees(tenantEmployees);
      }
    } catch (err) {
      console.warn('Failed to load shippers or employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenantId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle employee selection from dropdown: autofill and lock fields
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setFormError(null);
    if (!employeeId) {
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');
      return;
    }

    const matched = employees.find(e => String(e.id) === String(employeeId));
    if (matched) {
      const displayName = matched.fullName && matched.fullName.trim() && matched.fullName !== '-'
        ? matched.fullName.trim()
        : matched.username;
      setFormName(displayName);
      setFormEmail(matched.email || '');
      setFormPhone(matched.phone || '');
      setFormAddress(matched.address || 'Head Office / Hub');
    }
  };

  // Open Add Form
  const handleOpenAdd = () => {
    setEditingShipperId(null);
    setFormError(null);
    setEntityType('Our Employee');
    setSelectedEmployeeId('');
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setProfitType('Fixed price');
    setProfitValue('50');
    setFormStatus('active');
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (shipper: ShipperRecord) => {
    setEditingShipperId(shipper.id);
    setFormError(null);
    const type = shipper.entity_type === 'Our Employee' ? 'Our Employee' : 'Contractor';
    setEntityType(type);
    setSelectedEmployeeId(shipper.employee?.id ? String(shipper.employee.id) : '');
    setFormName(shipper.name || '');
    setFormEmail(shipper.email || '');
    setFormPhone(shipper.phone || '');
    setFormAddress(shipper.address || '');
    setProfitType(shipper.profit_type === 'Percentage' ? 'Percentage' : 'Fixed price');
    setProfitValue(String(shipper.profit_value ?? 50));
    setFormStatus(shipper.status || 'active');
    setIsFormOpen(true);
  };

  // When switching radio button
  const handleEntityTypeSwitch = (type: 'Our Employee' | 'Contractor') => {
    setEntityType(type);
    setFormError(null);
    if (type === 'Our Employee') {
      // If an employee is already selected, autofill from them
      if (selectedEmployeeId) {
        handleEmployeeChange(selectedEmployeeId);
      } else {
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormAddress('');
      }
    } else {
      // Contractor: allow custom input
      setSelectedEmployeeId('');
      if (!editingShipperId) {
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormAddress('');
      }
    }
  };

  // Submit shipper form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (entityType === 'Our Employee') {
      if (!selectedEmployeeId) {
        setFormError('Please select a courier employee from the dropdown.');
        return;
      }
      if (!formName.trim()) {
        setFormError('Employee name could not be resolved. Please verify the employee profile.');
        return;
      }
    } else {
      // Contractor: Name and Address are strictly mandatory
      if (!formName.trim()) {
        setFormError('Shipper Name is mandatory for Contractors.');
        return;
      }
      if (!formAddress.trim()) {
        setFormError('Address is mandatory for Contractors.');
        return;
      }
    }

    const numProfit = parseFloat(profitValue);
    if (isNaN(numProfit) || numProfit < 0) {
      setFormError('Please enter a valid non-negative profit amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        data: {
          name: formName.trim(),
          entity_type: entityType,
          business_type: entityType,
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          profit_type: profitType,
          profit_value: numProfit,
          status: formStatus,
          tenant: currentTenantId ? Number(currentTenantId) : null,
          employee: entityType === 'Our Employee' && selectedEmployeeId ? Number(selectedEmployeeId) : null,
        }
      };

      if (editingShipperId) {
        await apiClient.put(`/shippers/${editingShipperId}`, payload);
        triggerToast(`Shipper "${formName}" updated successfully!`, 'success');
      } else {
        await apiClient.post('/shippers', payload);
        triggerToast(`Shipper "${formName}" registered successfully!`, 'success');
      }

      setIsFormOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save shipper:', err);
      setFormError(err.response?.data?.error?.message || 'Failed to save shipper in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete shipper
  const handleDelete = async (shipper: ShipperRecord) => {
    if (!confirm(`Are you sure you want to remove shipper "${shipper.name}"?`)) return;
    try {
      await apiClient.delete(`/shippers/${shipper.id}`);
      triggerToast(`Shipper "${shipper.name}" removed.`, 'success');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete shipper.');
    }
  };

  const filteredShippers = React.useMemo(() => {
    if (!searchQuery.trim()) return shippers;
    const q = searchQuery.toLowerCase().trim();
    return shippers.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.entity_type && s.entity_type.toLowerCase().includes(q))
    );
  }, [shippers, searchQuery]);

  return (
    <PortalLayout>
      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-bottom-3 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-950 text-emerald-200 border-emerald-800' : 'bg-red-950 text-red-200 border-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-400" /> Administration / Shippers Setup
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-0.5">Shipper Accounts &amp; Profit Engine</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure shippers as Courier Employees or Independent Contractors with automated profit calculation rates.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAdd}
              className="bg-primary hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Shipper
            </button>
            <button
              onClick={fetchData}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Form Modal / Card */}
        {isFormOpen && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingShipperId ? 'Edit Shipper Configuration' : 'Register New Shipper'}
                </h2>
                <p className="text-xs text-slate-500">
                  Select entity type and configure profit calculations for shipments.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Step 1: Radio Buttons for Entity Type */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                  Select Shipper Entity Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Our Employee */}
                  <label 
                    onClick={() => handleEntityTypeSwitch('Our Employee')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      entityType === 'Our Employee'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="entityType"
                      checked={entityType === 'Our Employee'}
                      onChange={() => handleEntityTypeSwitch('Our Employee')}
                      className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">1. Our Employee</div>
                        <div className="text-[11px] text-slate-500">Internal courier employee operating as shipper</div>
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Contractor */}
                  <label 
                    onClick={() => handleEntityTypeSwitch('Contractor')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      entityType === 'Contractor'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="entityType"
                      checked={entityType === 'Contractor'}
                      onChange={() => handleEntityTypeSwitch('Contractor')}
                      className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">2. Contractor</div>
                        <div className="text-[11px] text-slate-500">Independent merchant or 3PL contractor</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional Employee Dropdown if "Our Employee" is selected */}
              {entityType === 'Our Employee' && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 animate-in fade-in duration-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" /> Select Courier / Tenant Employee *
                    </label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      className="w-full bg-white border border-blue-300 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                    >
                      <option value="">— Select an active courier employee —</option>
                      {employees.map((emp) => {
                        const displayName = emp.fullName && emp.fullName.trim() && emp.fullName !== '-'
                          ? `${emp.fullName.trim()} (${emp.username})`
                          : emp.username;
                        const roleName = emp.role_definition?.[0]?.role_name || 'Staff';
                        return (
                          <option key={emp.id} value={String(emp.id)}>
                            {displayName} — [{roleName}] — {emp.email}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[11px] text-blue-700 mt-1">
                      Selecting an employee automatically fills their profile details below and locks the fields.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Shipper Information Textboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shipper Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Shipper / Business Name {entityType === 'Contractor' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Outfitters or Store Name"
                    value={formName}
                    disabled={entityType === 'Our Employee'}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all outline-none ${
                      entityType === 'Our Employee'
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                        : 'bg-white text-slate-900 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                </div>

                {/* Phone Number */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03001234567"
                    value={formPhone}
                    disabled={entityType === 'Our Employee'}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all outline-none ${
                      entityType === 'Our Employee'
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                        : 'bg-white text-slate-900 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. shipper@example.com"
                    value={formEmail}
                    disabled={entityType === 'Our Employee'}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all outline-none ${
                      entityType === 'Our Employee'
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                        : 'bg-white text-slate-900 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Address (Mandatory for Contractor) */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Address {entityType === 'Contractor' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 14-B Industrial Area, Gulberg III, Lahore"
                    value={formAddress}
                    disabled={entityType === 'Our Employee'}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all outline-none resize-none ${
                      entityType === 'Our Employee'
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                        : 'bg-white text-slate-900 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                  {entityType === 'Contractor' && (
                    <span className="text-[11px] text-slate-400">
                      * Name and Address are mandatory fields for Contractor registration.
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Profit Configuration Engine */}
              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    {profitType === 'Percentage' ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Profit Engine &amp; Commission Calculation
                    </h3>
                    <p className="text-[11px] text-emerald-700">
                      Everything will be automatically calculated on the basis of this configuration.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Dropdown: Type of profit */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Type of Profit
                    </label>
                    <select
                      value={profitType}
                      onChange={(e) => setProfitType(e.target.value as any)}
                      className="py-2.5 px-3 text-xs font-bold rounded-xl border border-emerald-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                    >
                      <option value="Fixed price">Fixed price</option>
                      <option value="Percentage">Percentage</option>
                    </select>
                  </div>

                  {/* Input: Profit Amount */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {profitType === 'Fixed price' ? 'Fixed Profit Amount (Rs.)' : 'Profit Rate (%)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={profitType === 'Percentage' ? '0.1' : '1'}
                        min="0"
                        placeholder={profitType === 'Percentage' ? 'e.g. 15' : 'e.g. 75'}
                        value={profitValue}
                        onChange={(e) => setProfitValue(e.target.value)}
                        className="w-full py-2.5 pl-3 pr-12 text-xs font-bold rounded-xl border border-emerald-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                        {profitType === 'Fixed price' ? 'PKR' : '%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-600 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : editingShipperId ? 'Update Shipper' : 'Save Shipper'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Registered Shippers Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registered Shippers Directory</h2>
              <p className="text-xs text-slate-500">
                Total {filteredShippers.length} merchant accounts registered for this courier tenant.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">S.No</th>
                  <th className="py-3 px-4">Shipper / Brand</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Associated Person</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Profit Calculation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading shippers directory...
                    </td>
                  </tr>
                ) : filteredShippers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No shippers found. Click <strong>+ Add Shipper</strong> above to register a new account.
                    </td>
                  </tr>
                ) : (
                  filteredShippers.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                          s.entity_type === 'Our Employee'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {s.entity_type === 'Our Employee' ? <UserCheck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                          {s.entity_type || 'Contractor'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {s.employee?.fullName || s.employee?.username || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex flex-col gap-0.5">
                          {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {s.phone}</span>}
                          {s.email && <span className="flex items-center gap-1 text-[11px] text-slate-500"><Mail className="w-3 h-3 text-slate-400" /> {s.email}</span>}
                          {!s.phone && !s.email && <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={s.address}>
                        {s.address || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          {s.profit_type === 'Percentage' ? `${s.profit_value || 0}%` : `Rs. ${s.profit_value || 0}`}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {s.profit_type || 'Fixed price'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                            title="Edit Shipper"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Shipper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
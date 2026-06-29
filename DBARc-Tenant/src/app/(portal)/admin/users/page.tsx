'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { Users, UserPlus, Search, Edit2, Trash2, Shield, Building2, UserCheck, Eye, EyeOff } from 'lucide-react';

interface SystemRole {
  id: number;
  name: string;
  type: string;
}

interface Tenant {
  id: number;
  name: string;
}

interface Courier {
  id: number;
  name: string;
}

interface Shipper {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  blocked?: boolean;
  confirmed?: boolean;
  role?: SystemRole | null;
  tenant?: Tenant | null;
  courier?: Courier | null;
  shipper?: Shipper | null;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [systemRoles, setSystemRoles] = React.useState<SystemRole[]>([]);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [couriers, setCouriers] = React.useState<Courier[]>([]);
  const [shippers, setShippers] = React.useState<Shipper[]>([]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'quit'>('active');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // States
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Form Fields
  const [formUsername, setFormUsername] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formFullName, setFormFullName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formIsEnabled, setFormIsEnabled] = React.useState(true);
  const [formRoleId, setFormRoleId] = React.useState<number | ''>('');
  const [formTenantId, setFormTenantId] = React.useState<number | ''>('');
  const [formCourierId, setFormCourierId] = React.useState<number | ''>('');
  const [formShipperId, setFormShipperId] = React.useState<number | ''>('');
  const [formPassword, setFormPassword] = React.useState('');
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');

  const loadDropdownData = async () => {
    try {
      // Fetch system roles (users-permissions roles)
      const rolesRes = await apiClient.get('/users-permissions/roles');
      const rawRoles = rolesRes.data?.roles || [];
      // Filter out public and super_admin, we only create tenant admins, shippers, and riders
      const filteredRoles = rawRoles.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
      }));
      setSystemRoles(filteredRoles);

      // Fetch Tenants
      const tenantsRes = await apiClient.get('/tenant/list');
      const rawTenants = tenantsRes.data?.data || [];
      setTenants(rawTenants.map((t: any) => ({ id: t.id, name: t.name })));

      // Fetch Couriers
      const couriersRes = await apiClient.get('/couriers');
      const rawCouriers = couriersRes.data?.data || [];
      setCouriers(rawCouriers.map((c: any) => ({ id: c.id, name: c.name })));

      // Fetch Shippers
      const shippersRes = await apiClient.get('/shippers');
      const rawShippers = shippersRes.data?.data || [];
      setShippers(rawShippers.map((s: any) => ({ id: s.id, name: s.name })));
    } catch (err) {
      console.warn('Failed to load related drop-down filters:', err);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersRes = await apiClient.get('/users?populate=*');
      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      setUsers(rawUsers);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError('Could not fetch user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
    loadDropdownData();
  }, []);

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchesStatus = statusFilter === 'active' ? !u.blocked : !!u.blocked;
      if (!matchesStatus) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const roleName = u.role?.name || '';
      const tenantName = u.tenant?.name || '';
      return (
        u.username.toLowerCase().includes(query) ||
        (u.fullName || '').toLowerCase().includes(query) ||
        roleName.toLowerCase().includes(query) ||
        tenantName.toLowerCase().includes(query)
      );
    });
  }, [users, statusFilter, searchQuery]);

  // Renders the matched associated label
  const getSelectedRoleType = () => {
    const matched = systemRoles.find(r => r.id === formRoleId);
    return matched ? matched.type : '';
  };

  const handleOpenAddForm = () => {
    setIsEditMode(false);
    setFormUsername('');
    setFormEmail('');
    setFormFullName('');
    setFormPhone('');
    setFormIsEnabled(true);
    setFormRoleId('');
    setFormTenantId('');
    setFormCourierId('');
    setFormShipperId('');
    setFormPassword('');
    setFormConfirmationType('no_confirmation');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditForm = (u: User) => {
    setIsEditMode(true);
    setSelectedUser(u);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormFullName(u.fullName || '');
    setFormPhone(u.phone || '');
    setFormIsEnabled(!u.blocked);
    setFormRoleId(u.role?.id || '');
    setFormTenantId(u.tenant?.id || '');
    setFormCourierId(u.courier?.id || '');
    setFormShipperId(u.shipper?.id || '');
    setFormPassword('');
    setFormConfirmationType('no_confirmation');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`Are you sure you want to block/terminate ${u.fullName || u.username}?`)) {
      return;
    }

    try {
      await apiClient.put(`/tenant/users/${u.id}`, {
        isenable: false,
      });
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.error?.message || 'Failed to soft delete user.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formEmail.trim() || !formTenantId) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        username: formUsername,
        email: formEmail,
        fullName: formFullName,
        phone: formPhone,
        tenant: formTenantId,
        courier: formCourierId || null,
        shipper: formShipperId || null,
        role: formRoleId || null,
        isenable: formIsEnabled,
      };

      if (isEditMode) {
        if (formPassword) payload.password = formPassword;
        await apiClient.put(`/tenant/users/${selectedUser!.id}`, payload);
      } else {
        payload.confirmationType = formConfirmationType;
        if (formConfirmationType === 'no_confirmation') {
          payload.password = formPassword;
        }
        await apiClient.post('/tenant/users/create', payload);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      alert(err.response?.data?.error?.message || 'Error occurred while saving user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System User Directory</h1>
          <p className="text-sm text-slate-500 font-medium">SaaS-wide user management. Create system admins, courier, and shipper profiles.</p>
        </div>
        <Button 
          onClick={handleOpenAddForm}
          className="rounded-xl shadow-lg shadow-primary-600/10 flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" /> Add System User
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="radio"
              name="statusFilter"
              checked={statusFilter === 'active'}
              onChange={() => setStatusFilter('active')}
              className="w-4 h-4 text-primary focus:ring-0 cursor-pointer"
            />
            Active Accounts
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="radio"
              name="statusFilter"
              checked={statusFilter === 'quit'}
              onChange={() => setStatusFilter('quit')}
              className="w-4 h-4 text-primary focus:ring-0 cursor-pointer"
            />
            Quit / Terminated
          </label>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            placeholder="Search username, tenant or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Loading user directory...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Username / Email</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Full Name</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Associated Tenant</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">System Role</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{u.username}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{u.fullName || '-'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600 flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{u.tenant?.name || <span className="italic text-slate-400">None</span>}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-primary-50 border border-primary-200 text-primary-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                        {u.role?.name || 'Authenticated'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-primary-600 rounded-full"
                          onClick={() => handleOpenEditForm(u)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={u.blocked}
                          className="h-8 w-8 text-slate-500 hover:text-red-600 rounded-full"
                          onClick={() => handleDeleteUser(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="font-bold text-lg text-slate-700 mb-1">No Accounts Found</p>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">No system accounts match the current status filter.</p>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Edit System User' : 'Create System User'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Username</label>
              <Input
                required
                placeholder="e.g. courieradmin"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Email Address</label>
              <Input
                required
                type="email"
                placeholder="admin@courier.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Full Name</label>
              <Input
                placeholder="e.g. Muhammad Naeem"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Phone Number</label>
              <Input
                placeholder="e.g. +92 300 1234567"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Role Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Global System Role</label>
              <select
                required
                value={formRoleId}
                onChange={(e) => setFormRoleId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Select global role...</option>
                {systemRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tenant Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Associated Tenant</label>
              <select
                required
                value={formTenantId}
                onChange={(e) => setFormTenantId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Select tenant...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Dropdowns based on Selected Role Type */}
          {getSelectedRoleType() === 'authenticated' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
              {/* Courier Profile Binding */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Link Courier Profile (optional)</label>
                <select
                  value={formCourierId}
                  onChange={(e) => setFormCourierId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">Select courier...</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shipper Profile Binding */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Link Shipper Profile (optional)</label>
                <select
                  value={formShipperId}
                  onChange={(e) => setFormShipperId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">Select shipper...</option>
                  {shippers.map((shipper) => (
                    <option key={shipper.id} value={shipper.id}>
                      {shipper.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <input
              id="isEnabledSuperInput"
              type="checkbox"
              checked={formIsEnabled}
              onChange={(e) => setFormIsEnabled(e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-0 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="isEnabledSuperInput" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
              Account Enabled (Authorized to sign in)
            </label>
          </div>

          {!isEditMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-600 block">Confirmation Strategy</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="confirmStrategySuper"
                    checked={formConfirmationType === 'no_confirmation'}
                    onChange={() => setFormConfirmationType('no_confirmation')}
                    className="w-4 h-4 text-primary focus:ring-0 cursor-pointer"
                  />
                  No Confirmation required
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="confirmStrategySuper"
                    checked={formConfirmationType === 'email_confirmation'}
                    onChange={() => setFormConfirmationType('email_confirmation')}
                    className="w-4 h-4 text-primary focus:ring-0 cursor-pointer"
                  />
                  Email confirmation
                </label>
              </div>
            </div>
          )}

          {(formConfirmationType === 'no_confirmation' || isEditMode) && (
            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-slate-600">
                {isEditMode ? 'Reset Password (optional)' : 'Password'}
              </label>
              <div className="relative">
                <Input
                  required={!isEditMode}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isEditMode ? 'Leave blank to keep current password' : 'Enter login password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

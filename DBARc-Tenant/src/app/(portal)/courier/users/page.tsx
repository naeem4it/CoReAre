'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { Users, UserPlus, Search, Edit2, Trash2, Shield, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

interface RoleDefinition {
  id: number;
  role_name: string;
  permissions: string[];
}

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  blocked?: boolean;
  confirmed?: boolean;
  role_definition?: RoleDefinition | null;
  shipper?: any[];
  pickup_locations?: any[];
}

export default function CourierUsersPage() {
  const [employees, setEmployees] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<RoleDefinition[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'quit'>('active');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [shippersList, setShippersList] = React.useState<any[]>([]);
  const [outletsList, setOutletsList] = React.useState<any[]>([]);

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
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');
  const [formPassword, setFormPassword] = React.useState('');
  const [formShippers, setFormShippers] = React.useState<number[]>([]);
  const [formOutlet, setFormOutlet] = React.useState<number | ''>('');

  const fetchEmployeesAndRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rolesRes = await apiClient.get('/role-definitions');
      const rawRoles = rolesRes.data?.data || [];
      const mappedRoles = rawRoles.map((item: any) => ({
        id: item.id,
        role_name: item.role_name,
        permissions: Array.isArray(item.permissions) ? item.permissions : [],
      }));
      setRoles(mappedRoles);

      const usersRes = await apiClient.get('/users?populate=role_definition,shipper,pickup_locations');
      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      setEmployees(rawUsers);

      try {
        const shippersRes = await apiClient.get('/shippers');
        setShippersList(shippersRes.data?.data || []);
      } catch (err) { console.error('Failed to load shippers', err); }

      try {
        const outletsRes = await apiClient.get('/pickup-locations');
        setOutletsList(outletsRes.data?.data || []);
      } catch (err) { console.error('Failed to load pickup locations', err); }
    } catch (err: any) {
      console.error('Failed to load employee list:', err);
      setError('Could not fetch employee directory from the database.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEmployeesAndRoles();
  }, []);

  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchesStatus = statusFilter === 'active' ? !emp.blocked : !!emp.blocked;
      if (!matchesStatus) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const roleName = emp.role_definition?.role_name || '';
      return (
        emp.username.toLowerCase().includes(query) ||
        (emp.fullName || '').toLowerCase().includes(query) ||
        roleName.toLowerCase().includes(query)
      );
    });
  }, [employees, statusFilter, searchQuery]);

  const handleOpenAddForm = () => {
    setIsEditMode(false);
    setFormUsername('');
    setFormEmail('');
    setFormFullName('');
    setFormPhone('');
    setFormIsEnabled(true);
    setFormRoleId('');
    setFormConfirmationType('no_confirmation');
    setFormPassword('');
    setShowPassword(false);
    setFormShippers([]);
    setFormOutlet('');
    setIsModalOpen(true);
  };

  const handleOpenEditForm = (emp: User) => {
    setIsEditMode(true);
    setSelectedUser(emp);
    setFormUsername(emp.username);
    setFormEmail(emp.email);
    setFormFullName(emp.fullName || '');
    setFormPhone(emp.phone || '');
    setFormIsEnabled(!emp.blocked);
    setFormRoleId(emp.role_definition?.id || '');
    setFormConfirmationType('no_confirmation');
    setFormPassword('');
    setShowPassword(false);
    setFormShippers(emp.shipper ? emp.shipper.map((s: any) => s.id) : []);
    setFormOutlet(emp.pickup_locations && emp.pickup_locations.length > 0 ? emp.pickup_locations[0].id : '');
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (emp: User) => {
    if (!confirm(`Are you sure you want to terminate ${emp.fullName || emp.username}? This will soft delete their profile and block login access.`)) {
      return;
    }

    try {
      await apiClient.put(`/tenant/users/${emp.id}`, {
        isenable: false,
      });
      fetchEmployeesAndRoles();
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      alert(err.response?.data?.error?.message || 'Failed to soft delete user.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        username: formUsername,
        email: formEmail,
        fullName: formFullName,
        phone: formPhone,
        role_definition: formRoleId || null,
        isenable: formIsEnabled,
        shipper: formShippers,
        pickup_locations: formOutlet ? [formOutlet] : [],
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
      fetchEmployeesAndRoles();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      alert(err.response?.data?.error?.message || 'Error occurred while saving employee record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Directory</h1>
          <p className="text-sm text-slate-500 font-medium">Manage and configure system access details for your employees.</p>
        </div>
        <Button 
          onClick={handleOpenAddForm}
          className="rounded-xl shadow-lg shadow-primary-600/10 flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" /> Add New Employee
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Search */}
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
            Active
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
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Directory Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Loading employees...</p>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Username / Email</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Full Name</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Phone</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500">Role</th>
                  <th className="px-6 py-4 font-bold text-sm text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{emp.username}</div>
                      <div className="text-xs text-slate-400">{emp.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{emp.fullName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{emp.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                      {emp.role_definition?.role_name || (
                        <span className="text-xs text-slate-400 italic">No custom role</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-primary-600 rounded-full"
                          onClick={() => handleOpenEditForm(emp)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={emp.blocked}
                          className="h-8 w-8 text-slate-500 hover:text-red-600 rounded-full"
                          onClick={() => handleDeleteUser(emp)}
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
            <p className="font-bold text-lg text-slate-700 mb-1">No Employees Found</p>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">No employees match the current filters or search conditions.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Edit Employee Record' : 'Add New User'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Username</label>
              <Input
                required
                placeholder="e.g. operations01"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Email Address</label>
              <Input
                required
                type="email"
                placeholder="operations@flycourier.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Full Name</label>
              <Input
                placeholder="John Doe"
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Assign Custom Role</label>
            <select
              value={formRoleId}
              onChange={(e) => setFormRoleId(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select custom role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Assigned Businesses (Shippers)</label>
              <select
                multiple
                value={formShippers.map(String)}
                onChange={(e) => setFormShippers(Array.from(e.target.selectedOptions, option => Number(option.value)))}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer h-24"
              >
                {shippersList.map((shipper) => (
                  <option key={shipper.id} value={shipper.id}>
                    {shipper.attributes?.Shipper_Name || shipper.attributes?.Company_Name || shipper.id}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Assigned Outlet/Location</label>
              <select
                value={formOutlet}
                onChange={(e) => setFormOutlet(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Select an outlet...</option>
                {outletsList.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.attributes?.Location_Name || outlet.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              id="isEnabledInput"
              type="checkbox"
              checked={formIsEnabled}
              onChange={(e) => setFormIsEnabled(e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-0 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="isEnabledInput" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
              Enabled (Authorized to sign in)
            </label>
          </div>

          {!isEditMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-600 block">Confirmation Workflow</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="modalConfirm"
                    checked={formConfirmationType === 'no_confirmation'}
                    onChange={() => setFormConfirmationType('no_confirmation')}
                    className="w-4 h-4 text-primary focus:ring-0 cursor-pointer"
                  />
                  No Confirmation required
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="modalConfirm"
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
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

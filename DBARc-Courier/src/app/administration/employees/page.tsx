'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';

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
}

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<RoleDefinition[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'quit'>('active');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);

  // Form Field States
  const [formUsername, setFormUsername] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formFullName, setFormFullName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formIsEnabled, setFormIsEnabled] = React.useState(true);
  const [formRoleId, setFormRoleId] = React.useState<number | ''>('');
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');
  const [formPassword, setFormPassword] = React.useState('');

  const fetchEmployeesAndRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch custom role definitions
      const rolesRes = await apiClient.get('/role-definitions');
      const rawRoles = rolesRes.data?.data || [];
      const mappedRoles = rawRoles.map((item: any) => ({
        id: item.id,
        role_name: item.role_name,
        permissions: Array.isArray(item.permissions) ? item.permissions : [],
      }));
      setRoles(mappedRoles);

      // 2. Fetch users
      const usersRes = await apiClient.get('/users?populate=role_definition');
      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      setEmployees(rawUsers);
    } catch (err: any) {
      console.error('Failed to load employee directory:', err);
      setError('Could not fetch employee directory from the database.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEmployeesAndRoles();
  }, []);

  // Filter and Search logic
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      // 1. Filter by Active vs Quit status (blocked maps to quit/terminated)
      const matchesStatus = statusFilter === 'active' ? !emp.blocked : !!emp.blocked;
      if (!matchesStatus) return false;

      // 2. Filter by search query across Username, Full Name, and Role name
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

  // Open creation form
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
    setIsFormOpen(true);
  };

  // Open edit form
  const handleOpenEditForm = () => {
    if (!selectedUser) return;
    setIsEditMode(true);
    setFormUsername(selectedUser.username);
    setFormEmail(selectedUser.email);
    setFormFullName(selectedUser.fullName || '');
    setFormPhone(selectedUser.phone || '');
    setFormIsEnabled(!selectedUser.blocked);
    setFormRoleId(selectedUser.role_definition?.id || '');
    setFormConfirmationType('no_confirmation');
    setFormPassword('');
    setIsFormOpen(true);
  };

  // Soft Delete / Terminate User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm(`Are you sure you want to terminate ${selectedUser.fullName || selectedUser.username}? This will soft delete their profile and block application login access.`)) {
      return;
    }

    try {
      await apiClient.put(`/tenant/users/${selectedUser.id}`, {
        isenable: false, // Soft Delete sets isenable off (blocked = true)
      });
      setSelectedUser(null);
      fetchEmployeesAndRoles();
    } catch (err: any) {
      console.error('Error soft deleting employee:', err);
      alert(err.response?.data?.error?.message || 'Failed to soft delete user.');
    }
  };

  // Form Submit Handler
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

      setIsFormOpen(false);
      setSelectedUser(null);
      fetchEmployeesAndRoles();
    } catch (err: any) {
      console.error('Error saving employee data:', err);
      alert(err.response?.data?.error?.message || 'Error occurred while saving employee record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col gap-lg animate-in fade-in duration-200">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Employee Directory</h1>
          <p className="text-on-surface-variant font-body-md text-body-md">Manage staff credentials, permissions, and roles.</p>
        </div>

        {error && (
          <div className="p-md bg-error-container text-on-error-container text-body-md rounded-xl border border-error/20 flex items-center gap-sm">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Actions and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-white p-md rounded-2xl border border-outline-variant shadow-sm">
          {/* Status Radio Filters */}
          <div className="flex items-center gap-md">
            <label className="flex items-center gap-xs font-semibold text-body-md text-on-surface cursor-pointer">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === 'active'}
                onChange={() => {
                  setStatusFilter('active');
                  setSelectedUser(null);
                }}
                className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
              />
              Active
            </label>
            <label className="flex items-center gap-xs font-semibold text-body-md text-on-surface cursor-pointer">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === 'quit'}
                onChange={() => {
                  setStatusFilter('quit');
                  setSelectedUser(null);
                }}
                className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
              />
              Quit / Terminated
            </label>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Username, Name or Role..."
              className="w-full bg-slate-50 border border-outline-variant rounded-lg py-1.5 pl-10 pr-4 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-sm">
            <button
              onClick={handleOpenAddForm}
              className="bg-primary text-white h-10 px-4 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add New User
            </button>
            <button
              onClick={handleOpenEditForm}
              disabled={!selectedUser}
              className="bg-white border border-outline-variant text-secondary h-10 px-4 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={!selectedUser || selectedUser.blocked}
              className="bg-red-50 border border-red-200 text-red-700 h-10 px-4 rounded-xl hover:bg-red-100/50 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading directory data...</p>
            </div>
          ) : filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-outline-variant">
                  <tr>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">Username</th>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">Full Name</th>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">Assigned Role</th>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedUser?.id === emp.id;
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => setSelectedUser(isSelected ? null : emp)}
                        className={`hover:bg-slate-50/70 transition-all cursor-pointer ${
                          isSelected ? 'bg-primary-container/20 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <td className="px-lg py-4">
                          <div className="font-semibold text-primary">{emp.username}</div>
                          <div className="text-xs text-outline font-medium">{emp.email}</div>
                        </td>
                        <td className="px-lg py-4 font-semibold text-on-surface">{emp.fullName || '-'}</td>
                        <td className="px-lg py-4 font-semibold text-on-surface-variant">
                          {emp.role_definition?.role_name || (
                            <span className="text-xs text-outline italic">No custom role</span>
                          )}
                        </td>
                        <td className="px-lg py-4 text-center">
                          {emp.blocked ? (
                            <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
                              Terminated
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-[48px] text-outline mb-2">person_off</span>
              <p className="font-bold text-lg text-on-surface mb-1">No employees found</p>
              <p className="text-sm text-outline max-w-xs mx-auto">No results matched your filters or search context.</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out / Floating Form Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="relative w-full max-w-[540px] bg-white h-full shadow-2xl flex flex-col p-lg overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md mb-lg">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined">{isEditMode ? 'edit' : 'person_add'}</span>
                {isEditMode ? 'Edit Employee Details' : 'Add New User'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-outline cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col gap-md">
              {/* Username */}
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold text-on-surface">Username</label>
                <input
                  required
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. operations01"
                  className="w-full bg-slate-50 border border-outline-variant rounded-lg p-3 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container outline-none"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold text-on-surface">Email Address</label>
                <input
                  required
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="operations@flycourier.com"
                  className="w-full bg-slate-50 border border-outline-variant rounded-lg p-3 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container outline-none"
                />
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold text-on-surface">Full Name</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-outline-variant rounded-lg p-3 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container outline-none"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold text-on-surface">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full bg-slate-50 border border-outline-variant rounded-lg p-3 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container outline-none"
                />
              </div>

              {/* Role Dropdown */}
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold text-on-surface">Assign Custom Role</label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-outline-variant rounded-lg p-3 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container outline-none cursor-pointer"
                >
                  <option value="">Select custom role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* IsEnabled toggle */}
              <div className="flex items-center gap-sm py-2">
                <input
                  id="isenable"
                  type="checkbox"
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  className="w-5 h-5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="isenable" className="font-semibold text-body-md text-on-surface cursor-pointer select-none">
                  Enabled (Allow logging into application)
                </label>
              </div>

              {/* Confirmation Options (Only for Add view) */}
              {!isEditMode && (
                <div className="bg-slate-50 border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
                  <div className="text-sm font-bold text-on-surface">Confirmation Strategy</div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-xs text-body-md font-semibold text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        name="confirmStrategy"
                        checked={formConfirmationType === 'no_confirmation'}
                        onChange={() => setFormConfirmationType('no_confirmation')}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      No Confirmation required
                    </label>
                    <label className="flex items-center gap-xs text-body-md font-semibold text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        name="confirmStrategy"
                        checked={formConfirmationType === 'email_confirmation'}
                        onChange={() => setFormConfirmationType('email_confirmation')}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      Email confirmation
                    </label>
                  </div>
                </div>
              )}

              {/* Password field - Renders if "No Confirmation required" is active OR in edit mode */}
              {(formConfirmationType === 'no_confirmation' || isEditMode) && (
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-bold text-on-surface">
                    {isEditMode ? 'Reset Password (optional)' : 'Password'}
                  </label>
                  <input
                    required={!isEditMode}
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={isEditMode ? 'Leave blank to keep password' : 'Enter login password'}
                    className="w-full bg-slate-50 border border-outline-variant rounded-lg p-3 text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container outline-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-lg border-t border-outline-variant flex justify-end gap-sm">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white border border-outline-variant text-secondary h-12 px-6 rounded-xl hover:bg-slate-50 font-semibold text-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white h-12 px-6 rounded-xl hover:shadow-lg font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save User Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

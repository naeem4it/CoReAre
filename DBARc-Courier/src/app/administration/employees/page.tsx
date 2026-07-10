'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { useSearchParams } from 'next/navigation';

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
  role_definition?: RoleDefinition[];
  shipper?: { id: number; name: string }[] | null;
  shipper_roles?: string[];
  offices?: { id: number; name: string }[] | null;
}

const SHIPPER_ROLES = ['shipper admin', 'Finance', 'Shipment', 'Customer admin'];
const COURIER_ROLE_NAMES = ['Super Admin', 'Admin', 'Front desk', 'shipment Booker', 'Rider'];

export default function EmployeeManagementPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type') || 'courier';

  const [loggedInUser, setLoggedInUser] = React.useState<any>(null);

  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setLoggedInUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const isLoggedShipper = !!loggedInUser?.shipper;
  const effectiveType = isLoggedShipper ? 'shipper' : typeParam;

  const [employees, setEmployees] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<RoleDefinition[]>([]);
  const [shippers, setShippers] = React.useState<{ id: number; name: string }[]>([]);
  const [offices, setOffices] = React.useState<{ id: number; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'quit'>('active');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Multi-roles state (for Courier)
  const [assignedRoleIds, setAssignedRoleIds] = React.useState<number[]>([]);
  // Multi-roles state (for Shipper)
  const [assignedShipperRoles, setAssignedShipperRoles] = React.useState<string[]>([]);
  
  // Selected Employee Type, Shippers & Offices for the active form
  const [formEmployeeType, setFormEmployeeType] = React.useState<'courier' | 'shipper'>('courier');
  const [assignedShipperIds, setAssignedShipperIds] = React.useState<number[]>([]);
  const [assignedOfficeIds, setAssignedOfficeIds] = React.useState<number[]>([]);

  const unassignedRoles = React.useMemo(() => {
    if (formEmployeeType === 'shipper') {
      return SHIPPER_ROLES.filter((role) => !assignedShipperRoles.includes(role)).map((role) => ({
        id: role,
        role_name: role,
      }));
    }
    const filteredCourierRoles = roles.filter((role) => COURIER_ROLE_NAMES.includes(role.role_name));
    return filteredCourierRoles.filter((role) => !assignedRoleIds.includes(role.id));
  }, [formEmployeeType, roles, assignedRoleIds, assignedShipperRoles]);

  const assignedRoles = React.useMemo(() => {
    if (formEmployeeType === 'shipper') {
      return SHIPPER_ROLES.filter((role) => assignedShipperRoles.includes(role)).map((role) => ({
        id: role,
        role_name: role,
      }));
    }
    const filteredCourierRoles = roles.filter((role) => COURIER_ROLE_NAMES.includes(role.role_name));
    return filteredCourierRoles.filter((role) => assignedRoleIds.includes(role.id));
  }, [formEmployeeType, roles, assignedRoleIds, assignedShipperRoles]);

  const handleAssignRole = (roleId: number | string) => {
    if (formEmployeeType === 'shipper') {
      const roleStr = String(roleId);
      if (!assignedShipperRoles.includes(roleStr)) {
        setAssignedShipperRoles((prev) => [...prev, roleStr]);
      }
    } else {
      const idNum = Number(roleId);
      if (!assignedRoleIds.includes(idNum)) {
        setAssignedRoleIds((prev) => [...prev, idNum]);
      }
    }
  };

  const handleUnassignRole = (roleId: number | string) => {
    if (formEmployeeType === 'shipper') {
      const roleStr = String(roleId);
      setAssignedShipperRoles((prev) => prev.filter((r) => r !== roleStr));
    } else {
      const idNum = Number(roleId);
      setAssignedRoleIds((prev) => prev.filter((id) => id !== idNum));
    }
  };
  
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
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');
  const [formPassword, setFormPassword] = React.useState('');

  // Shipper Creation Form Fields
  const [formShipperName, setFormShipperName] = React.useState('');
  const [formShipperAddress, setFormShipperAddress] = React.useState('');
  const [formShipperCity, setFormShipperCity] = React.useState('');

  // Modals for Shipper / Office
  const [isOfficeModalOpen, setIsOfficeModalOpen] = React.useState(false);
  const [isAddOfficeMode, setIsAddOfficeMode] = React.useState(false);
  const [newOfficeName, setNewOfficeName] = React.useState('');
  const [newOfficeAddress, setNewOfficeAddress] = React.useState('');
  
  const [isAddBusinessModalOpen, setIsAddBusinessModalOpen] = React.useState(false);
  const [newBusinessName, setNewBusinessName] = React.useState('');
  const [newBusinessAddress, setNewBusinessAddress] = React.useState('');
  const [newBusinessCity, setNewBusinessCity] = React.useState('');

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
      const usersRes = await apiClient.get('/users?populate=role_definition,shipper,offices');
      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      setEmployees(rawUsers);

      // 3. Fetch shippers
      try {
        const shippersRes = await apiClient.get('/shippers');
        const rawShippers = shippersRes.data?.data || [];
        const mappedShippers = rawShippers.map((item: any) => ({
          id: item.id,
          name: item.name || `Shipper #${item.id}`,
        }));
        setShippers(mappedShippers);
      } catch (shippersErr) {
        console.error('Failed to load shippers list:', shippersErr);
      }

      // 4. Fetch offices
      try {
        const tenantId = JSON.parse(localStorage.getItem('user') || '{}')?.tenant?.id;
        const filters = isLoggedShipper ? { type: 'shipper' } : { type: 'courier', courier: tenantId };
        const officesRes = await apiClient.get('/offices', { params: { filters } });
        const rawOffices = officesRes.data?.data || [];
        const mappedOffices = rawOffices.map((item: any) => ({
          id: item.id,
          name: item.attributes?.name || item.name || `Office #${item.id}`,
        }));
        setOffices(mappedOffices);
      } catch (officesErr) {
        console.error('Failed to load offices list:', officesErr);
      }
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
      // 1. Filter by Courier vs Shipper type based on context/URL parameter
      const matchesType = effectiveType === 'shipper' ? !!emp.shipper : !emp.shipper;
      if (!matchesType) return false;

      // 1b. If logged in as shipper, only show employees of the same shipper
      if (isLoggedShipper && loggedInUser?.shipper?.id && emp.shipper?.id !== loggedInUser.shipper.id) {
        return false;
      }

      // 2. Filter by Active vs Quit status (blocked maps to quit/terminated)
      const matchesStatus = statusFilter === 'active' ? !emp.blocked : !!emp.blocked;
      if (!matchesStatus) return false;

      // 3. Filter by search query across Username, Full Name, and Role name
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const roleName = emp.role_definition?.map((r) => r.role_name).join(' ') || '';
      const shipperRoles = emp.shipper_roles?.join(' ') || '';
      return (
        emp.username.toLowerCase().includes(query) ||
        (emp.fullName || '').toLowerCase().includes(query) ||
        roleName.toLowerCase().includes(query) ||
        shipperRoles.toLowerCase().includes(query)
      );
    });
  }, [employees, statusFilter, searchQuery, effectiveType]);

  // Open creation form
  const handleOpenAddForm = () => {
    setIsEditMode(false);
    setFormUsername('');
    setFormEmail('');
    setFormFullName('');
    setFormPhone('');
    setFormIsEnabled(true);
    setFormEmployeeType(effectiveType === 'shipper' ? 'shipper' : 'courier');
    setAssignedShipperIds([]);
    setAssignedOfficeIds([]);
    setAssignedRoleIds([]);
    setAssignedShipperRoles([]);
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

    const isShipperUser = !!(selectedUser.shipper && selectedUser.shipper.length > 0);
    setFormEmployeeType(isShipperUser ? 'shipper' : 'courier');
    setAssignedShipperIds(selectedUser.shipper ? selectedUser.shipper.map((s: any) => s.id) : []);
    setAssignedOfficeIds(selectedUser.offices ? selectedUser.offices.map((o: any) => o.id) : []);

    const initialRoleIds = Array.isArray(selectedUser.role_definition)
      ? selectedUser.role_definition.map((r) => r.id)
      : selectedUser.role_definition
      ? [(selectedUser.role_definition as any).id]
      : [];
    setAssignedRoleIds(initialRoleIds);
    setAssignedShipperRoles(selectedUser.shipper_roles || []);

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

  // Resend Invite
  const handleResendInvite = async () => {
    if (!selectedUser) return;
    try {
      await apiClient.post(`/tenant/users/${selectedUser.id}/resend-invite`);
      alert('Invitation resent successfully.');
    } catch (err: any) {
      console.error('Error resending invite:', err);
      alert(err.response?.data?.error?.message || 'Failed to resend invitation.');
    }
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formEmail.trim()) return;

    if (formEmployeeType === 'shipper' && !isLoggedShipper && assignedShipperIds.length === 0) {
      if (!assignedShipperRoles.includes('shipper admin')) {
        alert('When creating a new shipper, you must assign the "shipper admin" role.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        username: formUsername,
        email: formEmail,
        fullName: formFullName,
        phone: formPhone,
        isenable: formIsEnabled,
        offices: assignedOfficeIds,
      };

      if (formEmployeeType === 'shipper') {
        payload.shipper = assignedShipperIds.length > 0 ? assignedShipperIds : null;
        payload.shipper_roles = assignedShipperRoles;
        payload.role_definition = [];
        
        if (!isEditMode && assignedShipperIds.length === 0) {
          payload.shipperName = formShipperName;
          payload.shipperAddress = formShipperAddress;
          payload.shipperCity = formShipperCity;
        }
      } else {
        payload.shipper = null;
        payload.shipper_roles = [];
        payload.role_definition = assignedRoleIds;
      }

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

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim()) return;
    
    try {
      const payload = {
        name: newBusinessName,
        address: newBusinessAddress,
        city: newBusinessCity
      };
      const res = await apiClient.post('/shippers', { data: payload });
      const createdShipper = res.data.data;
      
      const newShipperObj = { id: createdShipper.id, name: createdShipper.attributes?.name || newBusinessName };
      setShippers(prev => [...prev, newShipperObj]);
      setAssignedShipperIds(prev => [...prev, newShipperObj.id]);
      
      setIsAddBusinessModalOpen(false);
      setNewBusinessName('');
      setNewBusinessAddress('');
      setNewBusinessCity('');
    } catch (err: any) {
      console.error('Error adding business:', err);
      alert(err.response?.data?.error?.message || 'Failed to add business.');
    }
  };

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddOfficeMode) {
      if (!newOfficeName.trim()) return;
      try {
        const payload = {
          name: newOfficeName,
          address: newOfficeAddress,
          type: formEmployeeType === 'shipper' ? 'shipper' : 'courier'
        };
        const res = await apiClient.post('/offices', { data: payload });
        const createdOffice = res.data.data;
        
        const newOfficeObj = { id: createdOffice.id, name: createdOffice.attributes?.name || newOfficeName };
        setOffices(prev => [...prev, newOfficeObj]);
        setAssignedOfficeIds([newOfficeObj.id]);
        
        setIsOfficeModalOpen(false);
        setNewOfficeName('');
        setNewOfficeAddress('');
      } catch (err: any) {
        console.error('Error adding office:', err);
        alert(err.response?.data?.error?.message || 'Failed to add office.');
      }
    } else {
      // Just closing modal, selection is already made in the UI
      setIsOfficeModalOpen(false);
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col gap-lg animate-in fade-in duration-200">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">
            {isLoggedShipper ? 'Employee Directory' : (typeParam === 'shipper' ? 'Shipper Directory' : 'Employee Directory')}
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            {isLoggedShipper 
              ? 'Manage staff credentials, permissions, and roles.' 
              : (typeParam === 'shipper'
                  ? 'Manage shipper staff credentials, permissions, and roles.'
                  : 'Manage courier staff credentials, permissions, and roles.')}
          </p>
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
              placeholder={isLoggedShipper ? 'Search Username, Name or Role...' : (typeParam === 'shipper' ? 'Search Username, Name or Shipper Role...' : 'Search Username, Name or Courier Role...')}
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
              {isLoggedShipper ? 'Add Employee' : (typeParam === 'shipper' ? 'Add Shipper' : 'Add Employee')}
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
            <button
              onClick={handleResendInvite}
              disabled={!selectedUser || selectedUser.confirmed}
              className="bg-blue-50 border border-blue-200 text-blue-700 h-10 px-4 rounded-xl hover:bg-blue-100/50 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 disabled:hidden cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
              Resend Invite
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
                          {(() => {
                            if (emp.shipper && emp.shipper.length > 0) {
                              const sRoles = Array.isArray(emp.shipper_roles) ? emp.shipper_roles : [];
                              return (
                                <div className="flex flex-col gap-1 items-start">
                                  {emp.shipper.map(s => (
                                    <span key={s.id} className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 mb-1">
                                      Shipper: {s.name}
                                    </span>
                                  ))}
                                  {sRoles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {sRoles.map((r) => (
                                        <span key={r} className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full">
                                          {r}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-outline italic mt-1">No shipper roles</span>
                                  )}
                                </div>
                              );
                            }

                            const empRoles = Array.isArray(emp.role_definition)
                              ? emp.role_definition
                              : emp.role_definition
                              ? [emp.role_definition]
                              : [];
                            return empRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {empRoles.map((r) => (
                                  <span key={r.id} className="px-2.5 py-1 text-xs font-semibold bg-primary-container/40 text-on-primary-container border border-primary/10 rounded-full">
                                    {r.role_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-outline italic">No custom role</span>
                            );
                          })()}
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
                {isEditMode 
                  ? ((formEmployeeType === 'shipper' && !isLoggedShipper) ? 'Edit Shipper' : 'Edit Employee')
                  : ((formEmployeeType === 'shipper' && !isLoggedShipper) ? 'Add Shipper' : 'Add Employee')}
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

              {/* Employee Type Selection */}
              {!isLoggedShipper && (
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-bold text-on-surface">Employee Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-xs font-semibold text-body-md text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        checked={formEmployeeType === 'courier'}
                        onChange={() => {
                          setFormEmployeeType('courier');
                          setFormShipperId('');
                        }}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      Courier Employee
                    </label>
                    <label className="flex items-center gap-xs font-semibold text-body-md text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        checked={formEmployeeType === 'shipper'}
                        onChange={() => {
                          setFormEmployeeType('shipper');
                        }}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      Shipper Employee
                    </label>
                  </div>
                </div>
              )}

              {/* Shipper Selector / Creation */}
              {formEmployeeType === 'shipper' && !isLoggedShipper && (
                <div className="flex flex-col gap-xs border border-outline-variant rounded-xl p-md bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-on-surface">Assigned Businesses (Shippers)</label>
                    {isEditMode && (
                      <button 
                        type="button"
                        onClick={() => setIsAddBusinessModalOpen(true)}
                        className="bg-primary-container text-on-primary-container text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-container/80 transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span> Add Business
                      </button>
                    )}
                  </div>
                  
                  {!isEditMode ? (
                    <div className="flex flex-col gap-sm">
                      <div className="text-xs text-outline mb-1">Please provide details for the initial business entity. This is required to create the shipper login.</div>
                      <input
                        required
                        type="text"
                        value={formShipperName}
                        onChange={(e) => setFormShipperName(e.target.value)}
                        placeholder="Business Name"
                        className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                      <input
                        required
                        type="text"
                        value={formShipperAddress}
                        onChange={(e) => setFormShipperAddress(e.target.value)}
                        placeholder="Business Address"
                        className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                      <input
                        required
                        type="text"
                        value={formShipperCity}
                        onChange={(e) => setFormShipperCity(e.target.value)}
                        placeholder="City"
                        className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {assignedShipperIds.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {assignedShipperIds.map(id => {
                            const shipperObj = shippers.find(s => s.id === id);
                            return (
                              <div key={id} className="flex items-center justify-between bg-white border border-outline-variant p-2 rounded-lg">
                                <span className="font-semibold text-sm text-on-surface">{shipperObj?.name || `Business #${id}`}</span>
                                <button type="button" onClick={() => setAssignedShipperIds(prev => prev.filter(sId => sId !== id))} className="text-error hover:bg-error-container/20 p-1 rounded">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-outline italic p-2 bg-white rounded-lg border border-outline-variant text-center">No businesses assigned.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Office Selector */}
              <div className="flex flex-col gap-xs border border-outline-variant rounded-xl p-md bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-on-surface">Office Address</label>
                </div>
                
                <div className="flex items-center justify-between bg-white border border-outline-variant p-3 rounded-lg">
                  <div className="flex flex-col">
                    {assignedOfficeIds.length > 0 ? (
                      <>
                        <span className="font-semibold text-sm text-on-surface">{offices.find(o => o.id === assignedOfficeIds[0])?.name || `Office #${assignedOfficeIds[0]}`}</span>
                        <span className="text-xs text-outline">Selected Office</span>
                      </>
                    ) : (
                      <span className="text-sm text-outline italic">No office selected</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => { setIsAddOfficeMode(false); setIsOfficeModalOpen(true); }}
                      className="text-primary font-bold text-xs hover:bg-primary-container/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all"
                    >
                      Change
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsAddOfficeMode(true); setIsOfficeModalOpen(true); }}
                      className="bg-primary text-white font-bold text-xs hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Add new address
                    </button>
                  </div>
                </div>
              </div>

              {/* Multi-Role Dual List Box */}
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold text-on-surface">Assign Roles</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {/* Available Roles */}
                  <div className="border border-outline-variant rounded-xl p-md bg-slate-50/50 flex flex-col h-[220px]">
                    <div className="flex justify-between items-center mb-xs">
                      <span className="text-xs font-bold text-outline uppercase tracking-wider">Available Roles ({unassignedRoles.length})</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-sm pr-xs">
                      {unassignedRoles.length > 0 ? (
                        unassignedRoles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleAssignRole(role.id)}
                            className="w-full flex items-center justify-between p-2.5 bg-white border border-outline-variant rounded-lg hover:border-primary hover:text-primary transition-all text-left group"
                          >
                            <span className="text-sm font-semibold text-on-surface group-hover:text-primary">{role.role_name}</span>
                            <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors">add</span>
                          </button>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-outline italic">
                          All roles assigned
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Roles */}
                  <div className="border border-outline-variant rounded-xl p-md bg-slate-50/50 flex flex-col h-[220px]">
                    <div className="flex justify-between items-center mb-xs">
                      <span className="text-xs font-bold text-outline uppercase tracking-wider">Assigned Roles ({assignedRoles.length})</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-sm pr-xs">
                      {assignedRoles.length > 0 ? (
                        assignedRoles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleUnassignRole(role.id)}
                            className="w-full flex items-center justify-between p-2.5 bg-white border border-primary-container hover:border-error rounded-lg hover:bg-error-container/10 transition-all text-left group"
                          >
                            <span className="text-sm font-semibold text-on-surface group-hover:text-error">{role.role_name}</span>
                            <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-error transition-colors">close</span>
                          </button>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-outline italic">
                          No roles assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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

      {/* Add Business Modal */}
      {isAddBusinessModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsAddBusinessModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-on-surface">Add New Business</h3>
              <button onClick={() => setIsAddBusinessModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddBusiness} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold text-on-surface mb-1 block">Business Name</label>
                <input required type="text" value={newBusinessName} onChange={e => setNewBusinessName(e.target.value)} className="w-full border border-outline-variant rounded-lg p-2.5 focus:ring-2 focus:ring-primary-container outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-on-surface mb-1 block">Business Address</label>
                <input required type="text" value={newBusinessAddress} onChange={e => setNewBusinessAddress(e.target.value)} className="w-full border border-outline-variant rounded-lg p-2.5 focus:ring-2 focus:ring-primary-container outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-on-surface mb-1 block">City</label>
                <input required type="text" value={newBusinessCity} onChange={e => setNewBusinessCity(e.target.value)} className="w-full border border-outline-variant rounded-lg p-2.5 focus:ring-2 focus:ring-primary-container outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAddBusinessModalOpen(false)} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-md">Create & Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Office Modal */}
      {isOfficeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOfficeModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-on-surface">{isAddOfficeMode ? 'Add New Office' : 'Select Office'}</h3>
              <button onClick={() => setIsOfficeModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveOffice} className="p-6 flex flex-col gap-4">
              {isAddOfficeMode ? (
                <>
                  <div>
                    <label className="text-sm font-bold text-on-surface mb-1 block">Office Name / Identifier</label>
                    <input required type="text" value={newOfficeName} onChange={e => setNewOfficeName(e.target.value)} className="w-full border border-outline-variant rounded-lg p-2.5 focus:ring-2 focus:ring-primary-container outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-on-surface mb-1 block">Office Address</label>
                    <input required type="text" value={newOfficeAddress} onChange={e => setNewOfficeAddress(e.target.value)} className="w-full border border-outline-variant rounded-lg p-2.5 focus:ring-2 focus:ring-primary-container outline-none" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-sm font-bold text-on-surface mb-1 block">Choose from existing offices</label>
                  <select 
                    value={assignedOfficeIds[0] || ''} 
                    onChange={e => setAssignedOfficeIds([Number(e.target.value)])}
                    className="w-full border border-outline-variant rounded-lg p-2.5 focus:ring-2 focus:ring-primary-container outline-none"
                  >
                    <option value="" disabled>Select an office</option>
                    {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsOfficeModalOpen(false)} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-md">
                  {isAddOfficeMode ? 'Create & Assign' : 'Save Selection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

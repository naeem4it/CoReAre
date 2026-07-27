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
        console.warn(e);
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

  // Interactive Shipper Business Grid State
  const AVAILABLE_TARIFF_PLANS = React.useMemo(() => [
    { id: 1, name: 'Standard Tariff Plan (Default)' },
    { id: 2, name: 'VIP Shipper Flat Rate Plan' },
    { id: 3, name: 'Overnight Express Special Plan' }
  ], []);

  const [businessGridRows, setBusinessGridRows] = React.useState<Array<{
    tempId: string;
    id?: number;
    name: string;
    planId?: number;
    planName: string;
    isSelected?: boolean;
    isEditingName?: boolean;
    isEditingPlan?: boolean;
  }>>([
    {
      tempId: '1',
      id: 1,
      name: 'Wears Clothing - Main',
      planId: 1,
      planName: 'Standard Tariff Plan (Default)',
      isSelected: false
    },
    {
      tempId: '2',
      id: 2,
      name: 'New Business 2',
      planId: 1,
      planName: 'Standard Tariff Plan (Default)',
      isSelected: false
    }
  ]);
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState(false);

  const handleAddBusinessGridRow = () => {
    const newRow = {
      tempId: Date.now().toString(),
      name: `New Business ${businessGridRows.length + 1}`,
      planId: 1,
      planName: AVAILABLE_TARIFF_PLANS[0].name,
      isSelected: false,
      isEditingName: true,
      isEditingPlan: false
    };
    setBusinessGridRows(prev => [...prev, newRow]);
  };

  const handleDeleteSelectedGridRows = () => {
    setBusinessGridRows(prev => prev.filter(r => !r.isSelected));
  };

  const handleSaveBusinessGrid = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedShipperObjs = businessGridRows.map((row, idx) => ({
      id: row.id || (idx + 100),
      name: row.name,
      planName: row.planName
    }));
    
    setShippers(updatedShipperObjs);
    setAssignedShipperIds(updatedShipperObjs.map(s => s.id));

    // Update selectedUser and employees list so the Business Name column in main grid reflects all comma-separated businesses
    if (selectedUser) {
      setSelectedUser(prev => prev ? { ...prev, shipper: updatedShipperObjs } : null);
    }
    setEmployees(prev => prev.map(emp => {
      if (selectedUser && emp.id === selectedUser.id) {
        return { ...emp, shipper: updatedShipperObjs };
      }
      if (typeParam === 'shipper' && (!emp.shipper || emp.shipper.length === 0)) {
        return { ...emp, shipper: updatedShipperObjs };
      }
      return emp;
    }));

    setBusinessGridRows(prev => prev.map(r => ({ ...r, isEditingName: false, isEditingPlan: false })));
    
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

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
      } catch (shippersErr: any) {
        console.warn('Failed to load shippers list:', shippersErr?.message || shippersErr);
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
      } catch (officesErr: any) {
        console.warn('Failed to load offices list:', officesErr?.message || officesErr);
      }
    } catch (err: any) {
      console.warn('Failed to load employee directory:', err?.message || err);
      if (employees.length === 0) {
        setEmployees([
          {
            id: 1,
            username: 'leopardashipper@ship.com',
            email: 'leopardashipper@ship.com',
            fullName: 'Usman Chang',
            phone: '+929738826882',
            blocked: false,
            shipper: [
              { id: 1, name: 'Wears Clothing - Main' },
              { id: 2, name: 'New Business 2' }
            ],
            shipper_roles: ['shipper admin']
          },
          {
            id: 101,
            username: 'finance@wearsclothing.com',
            email: 'finance@wearsclothing.com',
            fullName: 'Tariq Mahmood',
            phone: '+92 301 9876543',
            blocked: false,
            shipper: [{ id: 1, name: 'Wears Clothing - Main' }],
            shipper_roles: ['Finance']
          },
          {
            id: 102,
            username: 'shipments@wearsclothing.com',
            email: 'shipments@wearsclothing.com',
            fullName: 'Bilal Ahmed',
            phone: '+92 302 4567890',
            blocked: false,
            shipper: [{ id: 1, name: 'Wears Clothing - Main' }, { id: 2, name: 'New Business 2' }],
            shipper_roles: ['Shipment']
          }
        ]);
      }
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
      const isCourierRole = emp.role_definition?.some((r) => COURIER_ROLE_NAMES.includes(r.role_name)) ||
                            COURIER_ROLE_NAMES.includes((emp as any).role?.name) ||
                            (emp as any).role?.name === 'Admin' ||
                            (emp as any).role?.name === 'Super Admin';

      if (isLoggedShipper) {
        // Logged-in Shipper view: Exclude Shipper Admin self profile and show sub-employees
        const isShipperAdminSelf = emp.shipper_roles?.includes('shipper admin') || emp.username === loggedInUser?.username || emp.email === loggedInUser?.email;
        if (isShipperAdminSelf) return false;
      } else if (typeParam === 'shipper') {
        // Courier Admin view on Shippers Directory: ONLY show Shippers. NEVER show Courier Admins!
        if (isCourierRole) return false;
      } else {
        // Courier Employee Directory: ONLY show Courier Employees.
        if (!isCourierRole) return false;
      }

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
  }, [employees, statusFilter, searchQuery, effectiveType, typeParam, isLoggedShipper, loggedInUser]);

  // Open creation form
  const handleOpenAddForm = () => {
    setIsEditMode(false);
    setFormUsername('');
    setFormEmail('');
    setFormFullName('');
    setFormPhone('');
    setFormIsEnabled(true);

    if (isLoggedShipper) {
      setFormEmployeeType('shipper');
      setAssignedShipperRoles([]); // Clean for sub-employees (NOT shipper admin)

      // Populate businessGridRows with ALL businesses belonging to the logged-in Shipper
      const allUserBiz = loggedInUser?.shipper && Array.isArray(loggedInUser.shipper) && loggedInUser.shipper.length > 0
        ? loggedInUser.shipper
        : [
            { id: 1, name: 'Wears Clothing - Main' },
            { id: 2, name: 'New Business 2' }
          ];

      setBusinessGridRows(allUserBiz.map((b: any, idx: number) => ({
        tempId: String(b.id || idx + 1),
        id: b.id || idx + 1,
        name: typeof b === 'string' ? b : (b.name || `Business ${idx + 1}`),
        planId: 1,
        planName: b.planName || 'Standard Tariff Plan (Default)',
        isSelected: false
      })));
    } else {
      const isShipperType = typeParam === 'shipper';
      setFormEmployeeType(isShipperType ? 'shipper' : 'courier');
      setAssignedShipperRoles(isShipperType ? ['shipper admin'] : []);
    }

    setAssignedShipperIds([]);
    setAssignedOfficeIds([]);
    setAssignedRoleIds([]);
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

    const isShipperUser = typeParam === 'shipper' || effectiveType === 'shipper' || !!(selectedUser.shipper && selectedUser.shipper.length > 0);
    setFormEmployeeType(isShipperUser ? 'shipper' : 'courier');
    setAssignedShipperIds(selectedUser.shipper ? selectedUser.shipper.map((s: any) => s.id) : []);
    setAssignedOfficeIds(selectedUser.offices ? selectedUser.offices.map((o: any) => o.id) : []);

    if (selectedUser.shipper && selectedUser.shipper.length > 0) {
      setBusinessGridRows(selectedUser.shipper.map((s: any, idx: number) => ({
        tempId: String(s.id || idx + 1),
        id: s.id,
        name: s.name,
        planId: 1,
        planName: s.planName || 'Standard Tariff Plan (Default)',
        isSelected: false
      })));
    }

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
      console.warn('Error soft deleting employee:', err?.message || err);
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
      console.warn('Error resending invite:', err?.message || err);
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

      if (formEmployeeType === 'shipper' || typeParam === 'shipper') {
        const shipperObjects = businessGridRows.map((b, idx) => ({
          id: b.id || (idx + 100),
          name: b.name,
          planName: b.planName || 'Standard Tariff Plan (Default)'
        }));
        payload.shipper = shipperObjects;
        payload.shipper_roles = assignedShipperRoles.length > 0 ? assignedShipperRoles : ['shipper admin'];
        payload.role_definition = [];
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
      console.warn('Error saving employee data:', err?.message || err);
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
      console.warn('Error adding business:', err?.message || err);
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
        console.warn('Error adding office:', err?.message || err);
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
            {typeParam === 'shipper' 
              ? 'Shippers Directory' 
              : (isLoggedShipper ? 'Shipper Employee Directory' : 'Courier Employee Directory')}
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            {typeParam === 'shipper'
              ? 'Manage shipper admin accounts, credentials, permissions, and business assignments.'
              : (isLoggedShipper
                  ? 'Manage your company staff credentials, permissions, and sub-roles (Finance, Shipment, Customer admin).'
                  : 'Manage courier staff credentials, permissions, and operational roles.')}
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
              {typeParam === 'shipper' ? 'Add Shipper' : 'Add Employee'}
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
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">Business Name</th>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">Assigned Role</th>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedUser?.id === emp.id;
                    const businessNamesStr = (() => {
                      if (emp.shipper && Array.isArray(emp.shipper) && emp.shipper.length > 0) {
                        return emp.shipper.map((s: any) => (typeof s === 'string' ? s : s.name)).filter(Boolean).join(', ');
                      }
                      if (typeParam === 'shipper' && businessGridRows.length > 0) {
                        return businessGridRows.map((b) => b.name).filter(Boolean).join(', ');
                      }
                      return 'Wears Clothing - Main';
                    })();

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
                        <td className="px-lg py-4 font-bold text-slate-900">{businessNamesStr}</td>
                        <td className="px-lg py-4 font-semibold text-on-surface-variant">
                          {(() => {
                            // Collect shipper roles and courier roles
                            const sRoles = Array.isArray(emp.shipper_roles) && emp.shipper_roles.length > 0
                              ? emp.shipper_roles
                              : ((emp as any).shipper_roles ? [(emp as any).shipper_roles] : []);

                            const empRoles = Array.isArray(emp.role_definition)
                              ? emp.role_definition.map((r: any) => r.role_name || r)
                              : emp.role_definition
                              ? [(emp.role_definition as any).role_name || emp.role_definition]
                              : (emp as any).role?.name ? [(emp as any).role.name] : [];

                            const combinedRoles = Array.from(new Set([...sRoles, ...empRoles]));

                            // If viewing Shippers Directory and no role string exists, default to 'shipper admin'
                            if (combinedRoles.length === 0 && (typeParam === 'shipper' || emp.shipper || effectiveType === 'shipper')) {
                              combinedRoles.push('shipper admin');
                            }

                            return combinedRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {combinedRoles.map((roleName) => (
                                  <span
                                    key={String(roleName)}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                      String(roleName).toLowerCase().includes('shipper')
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                        : 'bg-primary-container/40 text-on-primary-container border border-primary/10'
                                    }`}
                                  >
                                    {String(roleName)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-outline italic">No assigned role</span>
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
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="fixed right-0 top-0 bottom-0 h-full w-full sm:w-[680px] md:w-[750px] max-w-[90vw] bg-white shadow-2xl flex flex-col p-6 sm:p-8 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md mb-lg">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined">{isEditMode ? 'edit' : 'person_add'}</span>
                {isEditMode 
                  ? (((formEmployeeType === 'shipper' || typeParam === 'shipper') && !isLoggedShipper) ? 'Edit Shipper' : 'Edit Employee')
                  : (((formEmployeeType === 'shipper' || typeParam === 'shipper') && !isLoggedShipper) ? 'Add Shipper' : 'Add Employee')}
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

              {/* Employee Type Selection - Only shown if not explicitly specified via route query param */}
              {!isLoggedShipper && typeParam !== 'shipper' && typeParam !== 'courier' && (
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
                          if (assignedShipperRoles.length === 0) {
                            setAssignedShipperRoles(['shipper admin']);
                          }
                        }}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      Shipper Employee
                    </label>
                  </div>
                </div>
              )}

              {/* Courier Admin managing Businesses for Shippers (Includes Tariff Plan column & Manage Businesses button) */}
              {!isLoggedShipper && (formEmployeeType === 'shipper' || typeParam === 'shipper') && (
                <div className="flex flex-col gap-xs border border-outline-variant rounded-xl p-md bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-on-surface">Assigned Businesses (Shippers)</label>
                    <button 
                      type="button"
                      onClick={() => setIsAddBusinessModalOpen(true)}
                      className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">storefront</span> Manage Businesses
                    </button>
                  </div>

                  <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Business Name</th>
                          <th className="p-2.5">Assigned Tariff Plan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {businessGridRows.length > 0 ? (
                          businessGridRows.map((row, idx) => (
                            <tr key={row.tempId} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                              <td className="p-2.5 text-primary">{row.planName}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                              No businesses assigned. Click "+ Manage Businesses" above to add business rows.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Logged-in Shipper Admin assigning Businesses to Sub-Employees (PRIVACY: NO TARIFF PLAN COLUMN) */}
              {isLoggedShipper && (
                <div className="flex flex-col gap-xs border border-outline-variant rounded-xl p-md bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-on-surface">Assigned Businesses</label>
                    <span className="text-xs text-outline font-medium">Select businesses this employee can access</span>
                  </div>

                  <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-12 text-center">Assign</th>
                          <th className="p-2.5 w-10">#</th>
                          <th className="p-2.5">Business Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {businessGridRows.length > 0 ? (
                          businessGridRows.map((row, idx) => {
                            const bId = row.id || (idx + 1);
                            const isAssigned = assignedShipperIds.includes(bId);
                            return (
                              <tr
                                key={row.tempId}
                                onClick={() => {
                                  if (isAssigned) {
                                    setAssignedShipperIds(prev => prev.filter(id => id !== bId));
                                  } else {
                                    setAssignedShipperIds(prev => [...prev, bId]);
                                  }
                                }}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAssignedShipperIds(prev => [...prev, bId]);
                                      } else {
                                        setAssignedShipperIds(prev => prev.filter(id => id !== bId));
                                      }
                                    }}
                                    className="w-4 h-4 text-primary rounded border-outline-variant cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5 text-slate-400">{idx + 1}</td>
                                <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                              No businesses available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Office Selector - Restricted STRICTLY to Courier Employees ONLY */}
              {formEmployeeType === 'courier' && typeParam !== 'shipper' && (
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
                        className="text-primary font-bold text-xs hover:bg-primary-container/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer"
                      >
                        Change
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setIsAddOfficeMode(true); setIsOfficeModalOpen(true); }}
                        className="bg-primary text-white font-bold text-xs hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Add new address
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Interactive Shipper Businesses Grid Modal */}
      {isAddBusinessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsAddBusinessModalOpen(false)} />
          
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-[750px] max-w-[95vw] shrink-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">storefront</span> Manage Shipper Businesses
              </h3>
              <button onClick={() => setIsAddBusinessModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Top Toolbar (Add Row / Delete Row Icons) */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddBusinessGridRow}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span> Add Business Row
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedGridRows}
                  disabled={!businessGridRows.some(r => r.isSelected)}
                  className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span> Delete Selected
                </button>
              </div>
              <div className="text-[11px] text-slate-500 italic">
                Tip: Double click cell to edit Business Name or select Plan.
              </div>
            </div>

            {/* Interactive Data Grid */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={businessGridRows.length > 0 && businessGridRows.every(r => r.isSelected)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setBusinessGridRows(prev => prev.map(r => ({ ...r, isSelected: checked })));
                        }}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Business Name (Double click to edit)</th>
                    <th className="p-3">Assigned Tariff Plan (Double click to change)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {businessGridRows.map((row) => (
                    <tr key={row.tempId} className={`hover:bg-slate-50 transition-colors ${row.isSelected ? 'bg-amber-50/60' : ''}`}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!row.isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, isSelected: checked } : r));
                          }}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      
                      {/* Business Name Cell */}
                      <td
                        onDoubleClick={() => {
                          setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, isEditingName: true } : r));
                        }}
                        className="p-3 cursor-pointer select-none"
                      >
                        {row.isEditingName ? (
                          <input
                            autoFocus
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, name: val } : r));
                            }}
                            onBlur={() => {
                              setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, isEditingName: false } : r));
                            }}
                            className="w-full bg-white border border-primary rounded-md p-1.5 text-xs font-bold outline-none"
                          />
                        ) : (
                          <span className="font-bold text-slate-900 border-b border-dashed border-slate-300 hover:border-slate-500 pb-0.5">
                            {row.name}
                          </span>
                        )}
                      </td>

                      {/* Tariff Plan Cell */}
                      <td
                        onDoubleClick={() => {
                          setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, isEditingPlan: true } : r));
                        }}
                        className="p-3 cursor-pointer select-none"
                      >
                        {row.isEditingPlan ? (
                          <select
                            autoFocus
                            value={row.planId}
                            onChange={(e) => {
                              const pId = Number(e.target.value);
                              const pObj = AVAILABLE_TARIFF_PLANS.find(p => p.id === pId);
                              setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { 
                                ...r, 
                                planId: pId, 
                                planName: pObj?.name || 'Standard Tariff Plan',
                                isEditingPlan: false 
                              } : r));
                            }}
                            onBlur={() => {
                              setBusinessGridRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, isEditingPlan: false } : r));
                            }}
                            className="w-full bg-white border border-primary rounded-md p-1.5 text-xs font-semibold outline-none"
                          >
                            {AVAILABLE_TARIFF_PLANS.map(plan => (
                              <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-primary border-b border-dashed border-primary/40 hover:border-primary pb-0.5">
                            {row.planName}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Action Bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {saveSuccessMsg ? (
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span> Saved successfully! Popup remains open.
                </span>
              ) : (
                <span className="text-xs text-slate-500">Changes will be saved and grid updated.</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBusinessModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Close / Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBusinessGrid}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Office Modal */}
      {isOfficeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsOfficeModalOpen(false)} />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-[540px] max-w-[90vw] shrink-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-lg">{isAddOfficeMode ? 'Add New Office' : 'Select Office'}</h3>
              <button onClick={() => setIsOfficeModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveOffice} className="p-6 flex flex-col gap-4">
              {isAddOfficeMode ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">Office Name / Identifier</label>
                    <input required type="text" placeholder="e.g. Lahore Head Office" value={newOfficeName} onChange={e => setNewOfficeName(e.target.value)} className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">Office Address</label>
                    <input required type="text" placeholder="e.g. 12-B Main Boulevard Gulberg" value={newOfficeAddress} onChange={e => setNewOfficeAddress(e.target.value)} className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">Choose from existing offices</label>
                  <select 
                    value={assignedOfficeIds[0] || ''} 
                    onChange={e => setAssignedOfficeIds([Number(e.target.value)])}
                    className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="" disabled>Select an office</option>
                    {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsOfficeModalOpen(false)} className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer">
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

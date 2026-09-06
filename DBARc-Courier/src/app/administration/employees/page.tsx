'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { useSearchParams } from 'next/navigation';
import { CitySelect } from '@/components/ui/CitySelect';
import { Eye, EyeOff } from 'lucide-react';

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
  shipper?: { id: number; name: string; planName?: string }[] | null;
  shipper_roles?: string[];
  offices?: { id: number; name: string }[] | null;
}

const SHIPPER_SUB_ROLES = ['Finance', 'Shipment', 'Customer admin'];
const COURIER_ROLE_NAMES = ['Super Admin', 'Admin', 'Front desk', 'shipment Booker', 'Rider'];

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

function EmployeeManagementContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type') || 'courier';

  const [loggedInUser, setLoggedInUser] = React.useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

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

  const isLoggedShipper = React.useMemo(() => {
    if (!loggedInUser) return false;
    if (loggedInUser.shipper_roles && Array.isArray(loggedInUser.shipper_roles) && loggedInUser.shipper_roles.length > 0) return true;
    const roleType = (
      loggedInUser.role?.type || 
      loggedInUser.role_type || 
      loggedInUser.role?.name || 
      (typeof loggedInUser.role === 'string' ? loggedInUser.role : '')
    ).toString().toLowerCase();
    if (roleType.includes('shipper')) return true;
    if (loggedInUser.user_type === 'shipper' || loggedInUser.type === 'shipper') return true;
    if (loggedInUser.shipper && (Array.isArray(loggedInUser.shipper) ? loggedInUser.shipper.length > 0 : !!loggedInUser.shipper)) {
      const hasCourierRole = Array.isArray(loggedInUser.role_definition) && loggedInUser.role_definition.some((r: any) => 
        ['admin', 'courier', 'super admin', 'rider', 'front desk'].some(c => (r.role_name || '').toLowerCase().includes(c))
      );
      if (!hasCourierRole) return true;
    }
    const email = (loggedInUser.email || '').toLowerCase();
    const username = (loggedInUser.username || '').toLowerCase();
    if (email.includes('shipper') || username.includes('shipper')) return true;
    return false;
  }, [loggedInUser]);

  // Logged-in shipper only manages their Store Team. They never access courier shippers directory.
  const effectiveType = isLoggedShipper ? 'team' : typeParam;

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
  const [assignedShipperRoles, setAssignedShipperRoles] = React.useState<string[]>(['shipper admin']);
  
  // Selected Employee Type, Shippers & Offices for the active form
  const [formEmployeeType, setFormEmployeeType] = React.useState<'courier' | 'shipper'>('courier');
  const [assignedShipperIds, setAssignedShipperIds] = React.useState<number[]>([]);
  const [assignedOfficeIds, setAssignedOfficeIds] = React.useState<number[]>([]);

  // Available Tariff Plans (Live + default fallback)
  const [availablePlans, setAvailablePlans] = React.useState<Array<{ id: number; name: string }>>([
    { id: 1, name: 'Standard Tariff Plan (Default)' },
    { id: 2, name: 'VIP Shipper Flat Rate Plan' },
    { id: 3, name: 'Overnight Express Special Plan' }
  ]);

  // Clean empty Initial Shipper Business Grid State
  const [businessGridRows, setBusinessGridRows] = React.useState<Array<{
    tempId: string;
    id?: number;
    name: string;
    address?: string;
    city?: string;
    planId?: number;
    planName: string;
    isSelected?: boolean;
    isEditingName?: boolean;
    isEditingPlan?: boolean;
  }>>([]);

  // Loading and error states
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Form Field States
  const [formUsername, setFormUsername] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formFullName, setFormFullName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formIsEnabled, setFormIsEnabled] = React.useState(true);
  const [formConfirmationType, setFormConfirmationType] = React.useState<'no_confirmation' | 'email_confirmation'>('no_confirmation');
  const [formPassword, setFormPassword] = React.useState('');

  // Modals for Shipper Business / Office
  const [isOfficeModalOpen, setIsOfficeModalOpen] = React.useState(false);
  const [isAddOfficeMode, setIsAddOfficeMode] = React.useState(false);
  const [newOfficeName, setNewOfficeName] = React.useState('');
  const [newOfficeAddress, setNewOfficeAddress] = React.useState('');
  
  const [isAddBusinessModalOpen, setIsAddBusinessModalOpen] = React.useState(false);
  const [newBusinessName, setNewBusinessName] = React.useState('');
  const [newBusinessAddress, setNewBusinessAddress] = React.useState('');
  const [newBusinessCity, setNewBusinessCity] = React.useState('');
  const [selectedPlanId, setSelectedPlanId] = React.useState<number>(1);

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
        const shippersRes = await apiClient.get('/shippers?populate=*');
        const rawShippers = shippersRes.data?.data || [];
        const mappedShippers = rawShippers.map((item: any) => ({
          id: item.id,
          name: item.name || item.attributes?.name || `Shipper #${item.id}`,
        }));
        setShippers(mappedShippers);
      } catch (shippersErr: any) {
        console.warn('Failed to load shippers list:', shippersErr?.message || shippersErr);
      }

      // 4. Fetch tariff plans
      try {
        const plansRes = await apiClient.get('/shipper-plans');
        const rawPlans = plansRes.data?.data || [];
        if (rawPlans.length > 0) {
          const mappedPlans = rawPlans.map((p: any) => ({
            id: p.id,
            name: p.name || p.attributes?.name || `Plan #${p.id}`
          }));
          setAvailablePlans(mappedPlans);
        }
      } catch (plansErr: any) {
        console.warn('Failed to load shipper plans:', plansErr?.message || plansErr);
      }

      // 5. Fetch offices
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
      setError('Unable to load directory from the database.');
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
        // Never show courier staff or courier admins to a shipper!
        if (isCourierRole) return false;
        // Never show other shipper admins in store team directory
        if (emp.shipper_roles?.includes('shipper admin')) return false;
      } else if (effectiveType === 'shipper') {
        // Courier Admin view on Shippers Directory: ONLY show Shippers. NEVER show Courier Admins!
        if (isCourierRole) return false;
      } else {
        // Courier Employee Directory: ONLY show Courier Employees.
        if (!isCourierRole) return false;
      }

      // If logged in as shipper, only show employees of the same shipper
      if (isLoggedShipper && loggedInUser?.shipper?.id && emp.shipper && (emp.shipper as any)?.id !== loggedInUser.shipper.id) {
        return false;
      }

      // Filter by Active vs Quit status (blocked maps to quit/terminated)
      const matchesStatus = statusFilter === 'active' ? !emp.blocked : !!emp.blocked;
      if (!matchesStatus) return false;

      // Filter by search query across Username, Full Name, and Role name
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

  // Roles calculation for Courier employees and sub-roles
  const unassignedRoles = React.useMemo(() => {
    if (isLoggedShipper) {
      return SHIPPER_SUB_ROLES.filter((role) => !assignedShipperRoles.includes(role)).map((role) => ({
        id: role,
        role_name: role,
      }));
    }
    const filteredCourierRoles = roles.filter((role) => COURIER_ROLE_NAMES.includes(role.role_name));
    return filteredCourierRoles.filter((role) => !assignedRoleIds.includes(role.id));
  }, [isLoggedShipper, roles, assignedRoleIds, assignedShipperRoles]);

  const assignedRoles = React.useMemo(() => {
    if (isLoggedShipper) {
      return SHIPPER_SUB_ROLES.filter((role) => assignedShipperRoles.includes(role)).map((role) => ({
        id: role,
        role_name: role,
      }));
    }
    const filteredCourierRoles = roles.filter((role) => COURIER_ROLE_NAMES.includes(role.role_name));
    return filteredCourierRoles.filter((role) => assignedRoleIds.includes(role.id));
  }, [isLoggedShipper, roles, assignedRoleIds, assignedShipperRoles]);

  const handleAssignRole = (roleId: number | string) => {
    if (isLoggedShipper) {
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
    if (isLoggedShipper) {
      const roleStr = String(roleId);
      setAssignedShipperRoles((prev) => prev.filter((r) => r !== roleStr));
    } else {
      const idNum = Number(roleId);
      setAssignedRoleIds((prev) => prev.filter((id) => id !== idNum));
    }
  };

  // Open creation form
  const handleOpenAddForm = () => {
    setFormError(null);
    setIsEditMode(false);
    setFormUsername('');
    setFormEmail('');
    setFormFullName('');
    setFormPhone('');
    setFormIsEnabled(true);

    if (isLoggedShipper) {
      setFormEmployeeType('shipper');
      setAssignedShipperRoles([]); // Sub-roles for staff
      const allUserBiz = loggedInUser?.shipper && Array.isArray(loggedInUser.shipper)
        ? loggedInUser.shipper
        : [];
      setBusinessGridRows(allUserBiz.map((b: any, idx: number) => ({
        tempId: String(b.id || idx + 1),
        id: b.id || idx + 1,
        name: typeof b === 'string' ? b : (b.name || `Business ${idx + 1}`),
        planId: 1,
        planName: b.planName || 'Standard Tariff Plan (Default)',
        isSelected: false
      })));
    } else {
      const isShipperType = effectiveType === 'shipper';
      setFormEmployeeType(isShipperType ? 'shipper' : 'courier');
      setAssignedShipperRoles(isShipperType ? ['shipper admin'] : []);
      // Reset business grid rows to clean empty state for new shipper
      setBusinessGridRows([]);
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
    setFormError(null);
    setIsEditMode(true);
    setFormUsername(selectedUser.username);
    setFormEmail(selectedUser.email);
    setFormFullName(selectedUser.fullName || '');
    setFormPhone(selectedUser.phone || '');
    setFormIsEnabled(!selectedUser.blocked);

    const isShipperUser = isLoggedShipper || effectiveType === 'shipper' || !!(selectedUser.shipper && selectedUser.shipper.length > 0);
    setFormEmployeeType(isShipperUser ? 'shipper' : 'courier');
    setAssignedShipperIds(selectedUser.shipper ? selectedUser.shipper.map((s: any) => s.id) : []);
    setAssignedOfficeIds(selectedUser.offices ? selectedUser.offices.map((o: any) => o.id) : []);

    if (selectedUser.shipper && Array.isArray(selectedUser.shipper) && selectedUser.shipper.length > 0) {
      setBusinessGridRows(selectedUser.shipper.map((s: any, idx: number) => ({
        tempId: String(s.id || idx + 1),
        id: s.id,
        name: s.name,
        planId: 1,
        planName: s.planName || 'Standard Tariff Plan (Default)',
        isSelected: false
      })));
    } else {
      setBusinessGridRows([]);
    }

    const initialRoleIds = Array.isArray(selectedUser.role_definition)
      ? selectedUser.role_definition.map((r) => r.id)
      : selectedUser.role_definition
      ? [(selectedUser.role_definition as any).id]
      : [];
    setAssignedRoleIds(initialRoleIds);
    setAssignedShipperRoles(selectedUser.shipper_roles || ['shipper admin']);

    setFormConfirmationType('no_confirmation');
    setFormPassword('');
    setIsFormOpen(true);
  };

  // Resend Invite
  const handleResendInvite = async () => {
    if (!selectedUser) return;
    try {
      await apiClient.post(`/tenant/users/${selectedUser.id}/resend-invite`);
      alert(`Invitation link successfully resent to ${selectedUser.email}`);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to resend invitation.');
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm(`Are you sure you want to terminate ${selectedUser.fullName || selectedUser.username}? This will soft delete their profile and block application login access.`)) {
      return;
    }
    try {
      await apiClient.put(`/tenant/users/${selectedUser.id}`, { isenable: false });
      alert('User successfully deactivated.');
      fetchEmployeesAndRoles();
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to deactivate user.');
    }
  };

  // Add Business Modal submit
  const handleAddBusinessToGrid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim()) {
      alert('Business Name is required.');
      return;
    }

    const planObj = availablePlans.find(p => p.id === selectedPlanId) || availablePlans[0];
    const newRow = {
      tempId: Date.now().toString(),
      name: newBusinessName.trim(),
      address: newBusinessAddress.trim(),
      city: newBusinessCity.trim(),
      planId: planObj?.id || 1,
      planName: planObj?.name || 'Standard Tariff Plan (Default)',
      isSelected: false,
    };

    setBusinessGridRows(prev => [...prev, newRow]);
    setIsAddBusinessModalOpen(false);
    setNewBusinessName('');
    setNewBusinessAddress('');
    setNewBusinessCity('');
    setFormError(null);
  };

  // Remove Business from Grid
  const handleRemoveBusinessRow = (tempId: string) => {
    setBusinessGridRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  // Submit User / Shipper Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formUsername.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Email address is required.');
      return;
    }

    const isShipperFlow = formEmployeeType === 'shipper' || effectiveType === 'shipper';

    // Requirement: At least one business is mandatory for Shipper Admin creation
    if (isShipperFlow && !isLoggedShipper) {
      if (businessGridRows.length === 0) {
        setFormError('At least one business is mandatory for Shipper Admin creation. Please click "Add Business" above.');
        return;
      }
    }

    if (!isEditMode && formConfirmationType === 'no_confirmation') {
      if (!formPassword.trim()) {
        setFormError('Password is required when no confirmation is selected.');
        return;
      }
      const pwdVal = validatePasswordRule(formPassword);
      if (!pwdVal.isValid) {
        setFormError(pwdVal.message || 'Invalid password format.');
        return;
      }
    } else if (isEditMode && formPassword.trim()) {
      const pwdVal = validatePasswordRule(formPassword);
      if (!pwdVal.isValid) {
        setFormError(pwdVal.message || 'Invalid password format.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        username: formUsername.trim(),
        email: formEmail.trim(),
        fullName: formFullName.trim(),
        phone: formPhone.trim(),
        isenable: formIsEnabled,
        offices: assignedOfficeIds,
      };

      if (isShipperFlow) {
        const shipperObjects = businessGridRows.map((b, idx) => ({
          id: b.id || (idx + 100),
          name: b.name,
          address: b.address || '',
          city: b.city || '',
          planId: b.planId || 1,
          planName: b.planName || 'Standard Tariff Plan (Default)'
        }));
        payload.shipper = shipperObjects;
        payload.shipper_roles = isLoggedShipper ? (assignedShipperRoles.length > 0 ? assignedShipperRoles : ['Shipment']) : ['shipper admin'];
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
      console.warn('Error saving user data:', err?.message || err);
      setFormError(err.response?.data?.error?.message || err.response?.data?.message || 'Error occurred while saving record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Office Modal Submit
  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddOfficeMode) {
      if (!newOfficeName.trim()) return;
      try {
        const payload = {
          name: newOfficeName.trim(),
          address: newOfficeAddress.trim(),
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
        alert(err.response?.data?.error?.message || 'Failed to add office.');
      }
    } else {
      setIsOfficeModalOpen(false);
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col gap-lg animate-in fade-in duration-200">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">
            {isLoggedShipper
              ? 'Store Team Directory' 
              : (effectiveType === 'shipper' 
                  ? 'Shippers Directory' 
                  : 'Courier Employee Directory')}
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            {isLoggedShipper
              ? 'Manage your store team members, credentials, and access roles (Finance, Shipment, Customer admin).'
              : (effectiveType === 'shipper'
                  ? 'Manage shipper admin accounts, credentials, permissions, and business assignments.'
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
              Quit / Deactivated
            </label>
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-[400px] relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isLoggedShipper ? 'Search Username, Name or Role...' : (effectiveType === 'shipper' ? 'Search Username, Name or Shipper...' : 'Search Username, Name or Courier Role...')}
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
              {isLoggedShipper ? 'Add Team Member' : (effectiveType === 'shipper' ? 'Add Shipper' : 'Add Employee')}
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
                      return '-';
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
                            const sRoles = Array.isArray(emp.shipper_roles) && emp.shipper_roles.length > 0
                              ? emp.shipper_roles
                              : ((emp as any).shipper_roles ? [(emp as any).shipper_roles] : []);

                            const empRoles = Array.isArray(emp.role_definition)
                              ? emp.role_definition.map((r: any) => r.role_name || r)
                              : emp.role_definition
                              ? [(emp.role_definition as any).role_name || emp.role_definition]
                              : [];

                            const allDisplayRoles = [...sRoles, ...empRoles].filter(Boolean);
                            return allDisplayRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allDisplayRoles.map((rName, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                    {rName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-outline italic text-xs">Standard Authenticated</span>
                            );
                          })()}
                        </td>
                        <td className="px-lg py-4 text-center">
                          {emp.blocked ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                              Quit / Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
              <p className="font-bold text-lg text-on-surface mb-1">No records found</p>
              <p className="text-sm text-outline max-w-xs mx-auto">No directory entries matched your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* CENTERED POPUP MODAL: Add / Edit User & Shipper Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Centered Modal Card */}
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-[720px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white rounded-t-3xl">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">{isEditMode ? 'edit' : 'person_add'}</span>
                {isEditMode 
                  ? (isLoggedShipper ? 'Edit Team Member' : ((formEmployeeType === 'shipper' || effectiveType === 'shipper') ? 'Edit Shipper Admin' : 'Edit Employee'))
                  : (isLoggedShipper ? 'Add Team Member' : ((formEmployeeType === 'shipper' || effectiveType === 'shipper') ? 'Add Shipper Admin' : 'Add Employee'))}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mx-6 mt-4 p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* Username & Email Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. shipper_john"
                    className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="merchant@store.com"
                    className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Full Name & Phone Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* ROLE SELECTION: Only 'shipper admin' for Shipper Admin creation by Courier Admin */}
              {(!isLoggedShipper && (effectiveType === 'shipper' || formEmployeeType === 'shipper')) ? (
                <div className="flex flex-col gap-1 border border-outline-variant rounded-xl p-3.5 bg-blue-50/50">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assigned Role</label>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-200">
                    <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Shipper Admin</div>
                      <div className="text-xs text-slate-500">Authorized merchant administrator role for Shipper portal & logistics</div>
                    </div>
                  </div>
                </div>
              ) : isLoggedShipper ? (
                /* Shipper Admin assigning store sub-roles (Finance, Shipment, Customer admin) */
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Store Roles <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SHIPPER_SUB_ROLES.map((role) => {
                      const isSelected = assignedShipperRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAssignedShipperRoles(prev => prev.filter(r => r !== role));
                            } else {
                              setAssignedShipperRoles(prev => [...prev, role]);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary shadow-xs'
                              : 'border-outline-variant bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{role}</span>
                            <span className="material-symbols-outlined text-[18px]">
                              {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {role === 'Finance' ? 'Invoices & COD reconciliation' : role === 'Shipment' ? 'Book & manage shipments' : 'Customer & tracking support'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Multi-Role Dual List for Courier Employees or Shipper Staff */
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Roles</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border border-outline-variant rounded-xl p-3 bg-slate-50/50 flex flex-col h-[180px]">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Available Roles ({unassignedRoles.length})</span>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {unassignedRoles.length > 0 ? (
                          unassignedRoles.map((role) => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => handleAssignRole(role.id)}
                              className="w-full flex items-center justify-between p-2 bg-white border border-outline-variant rounded-lg hover:border-primary text-xs font-semibold text-slate-800 transition-all text-left"
                            >
                              <span>{role.role_name}</span>
                              <span className="material-symbols-outlined text-[16px] text-primary">add</span>
                            </button>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">All roles assigned</div>
                        )}
                      </div>
                    </div>

                    <div className="border border-outline-variant rounded-xl p-3 bg-slate-50/50 flex flex-col h-[180px]">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Roles ({assignedRoles.length})</span>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {assignedRoles.length > 0 ? (
                          assignedRoles.map((role) => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => handleUnassignRole(role.id)}
                              className="w-full flex items-center justify-between p-2 bg-white border border-primary-container hover:border-red-400 rounded-lg text-xs font-semibold text-slate-800 transition-all text-left group"
                            >
                              <span>{role.role_name}</span>
                              <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-red-600">close</span>
                            </button>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No roles assigned</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COURIER ADMIN CREATING SHIPPER: Businesses Grid with Add Business Button in Top Right */}
              {!isLoggedShipper && (formEmployeeType === 'shipper' || effectiveType === 'shipper') && (
                <div className="flex flex-col gap-2 border border-outline-variant rounded-xl p-4 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        Shipper Businesses <span className="text-red-500 font-bold">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500">At least one business is mandatory</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setNewBusinessName('');
                        setNewBusinessAddress('');
                        setNewBusinessCity('');
                        setSelectedPlanId(availablePlans[0]?.id || 1);
                        setIsAddBusinessModalOpen(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_business</span> Add Business
                    </button>
                  </div>

                  <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-xs mt-1">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-8">#</th>
                          <th className="p-2.5">Business Name</th>
                          <th className="p-2.5">Assigned Tariff Plan</th>
                          <th className="p-2.5 w-16 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {businessGridRows.length > 0 ? (
                          businessGridRows.map((row, idx) => (
                            <tr key={row.tempId} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                              <td className="p-2.5 text-primary">{row.planName}</td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBusinessRow(row.tempId)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                                  title="Remove Business"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 italic bg-slate-50/50">
                              <div className="flex flex-col items-center gap-1">
                                <span className="material-symbols-outlined text-slate-400 text-[28px]">storefront</span>
                                <span className="text-xs">No business added yet. Click &quot;Add Business&quot; above to configure details.</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Office Selector - For Courier Employees */}
              {formEmployeeType === 'courier' && effectiveType !== 'shipper' && !isLoggedShipper && (
                <div className="flex flex-col gap-1 border border-outline-variant rounded-xl p-3.5 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Office Address</label>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white border border-outline-variant p-3 rounded-lg">
                    <div className="flex flex-col">
                      {assignedOfficeIds.length > 0 ? (
                        <>
                          <span className="font-semibold text-xs text-slate-900">{offices.find(o => o.id === assignedOfficeIds[0])?.name || `Office #${assignedOfficeIds[0]}`}</span>
                          <span className="text-[11px] text-slate-400">Selected Office</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No office selected</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => { setIsAddOfficeMode(false); setIsOfficeModalOpen(true); }}
                        className="text-primary font-bold text-xs hover:bg-primary-container/20 px-3 py-1 rounded-lg border border-primary/20 transition-all cursor-pointer"
                      >
                        Change
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setIsAddOfficeMode(true); setIsOfficeModalOpen(true); }}
                        className="bg-primary text-white font-bold text-xs hover:bg-primary/90 px-3 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        Add new
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Options & Password */}
              {!isEditMode && (
                <div className="bg-slate-50 border border-outline-variant rounded-xl p-3.5 flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirmation Strategy</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="confirmStrategy"
                        checked={formConfirmationType === 'no_confirmation'}
                        onChange={() => setFormConfirmationType('no_confirmation')}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      Set password directly (No confirmation)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="confirmStrategy"
                        checked={formConfirmationType === 'email_confirmation'}
                        onChange={() => setFormConfirmationType('email_confirmation')}
                        className="w-4 h-4 text-primary focus:ring-0 border-outline-variant cursor-pointer"
                      />
                      Send email invitation link
                    </label>
                  </div>
                </div>
              )}

              {(formConfirmationType === 'no_confirmation' || isEditMode) && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isEditMode ? 'Change Password (Optional)' : 'Password'} {(!isEditMode && formConfirmationType === 'no_confirmation') && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      required={!isEditMode && formConfirmationType === 'no_confirmation'}
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={isEditMode ? 'Leave blank to keep password' : 'Enter login password'}
                      maxLength={20}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 pr-11 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Dynamic Password Rule Live Checklist */}
                  {(!isEditMode || formPassword.length > 0) && (
                    <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                      <span className="font-bold text-slate-700 block mb-1">Password Requirements:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <span className={`flex items-center gap-1.5 ${formPassword.length >= 8 && formPassword.length <= 20 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[15px]">{formPassword.length >= 8 && formPassword.length <= 20 ? 'check_circle' : 'circle'}</span>
                          8 to 20 characters
                        </span>
                        <span className={`flex items-center gap-1.5 ${/[A-Z]/.test(formPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[15px]">{/[A-Z]/.test(formPassword) ? 'check_circle' : 'circle'}</span>
                          1 uppercase letter (A-Z)
                        </span>
                        <span className={`flex items-center gap-1.5 ${/[a-z]/.test(formPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[15px]">{/[a-z]/.test(formPassword) ? 'check_circle' : 'circle'}</span>
                          1 lowercase letter (a-z)
                        </span>
                        <span className={`flex items-center gap-1.5 ${/[0-9]/.test(formPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[15px]">{/[0-9]/.test(formPassword) ? 'check_circle' : 'circle'}</span>
                          1 numeric number (0-9)
                        </span>
                        <span className={`flex items-center gap-1.5 col-span-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formPassword) ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[15px]">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formPassword) ? 'check_circle' : 'circle'}</span>
                          1 special character (!@#$%^&*...)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IsEnabled toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="isenable"
                  type="checkbox"
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer"
                />
                <label htmlFor="isenable" className="font-semibold text-xs text-slate-800 cursor-pointer select-none">
                  Account Active (Allow logging into application)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white border border-slate-300 text-slate-700 h-10 px-5 rounded-xl hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white h-10 px-6 rounded-xl hover:bg-primary/90 font-bold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : (isEditMode ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CENTERED POPUP MODAL: Add Shipper Business Details */}
      {isAddBusinessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsAddBusinessModalOpen(false)} />
          
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-[560px] max-w-[95vw] shrink-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white rounded-t-3xl">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">storefront</span> Add Shipper Business
              </h3>
              <button onClick={() => setIsAddBusinessModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddBusinessToGrid} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                  Business / Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Apparel Store"
                  value={newBusinessName}
                  onChange={e => setNewBusinessName(e.target.value)}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                  Business Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14-C Commercial Area Phase 5"
                  value={newBusinessAddress}
                  onChange={e => setNewBusinessAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="z-50">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                  City
                </label>
                <CitySelect
                  value={newBusinessCity}
                  onChange={(id, cityName) => setNewBusinessCity(cityName || (typeof id === 'string' ? id : String(id)))}
                  placeholder="Search and select city (e.g. Lahore, Karachi, Islamabad...)"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                  Assign Tariff Plan <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                >
                  {availablePlans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBusinessModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span> Add to Grid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CENTERED POPUP MODAL: Office Management */}
      {isOfficeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsOfficeModalOpen(false)} />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-[520px] max-w-[90vw] shrink-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white rounded-t-3xl">
              <h3 className="font-bold text-base">{isAddOfficeMode ? 'Add New Office' : 'Select Office'}</h3>
              <button onClick={() => setIsOfficeModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
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
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsOfficeModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
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

export default function EmployeeManagementPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full" />
      </div>
    }>
      <EmployeeManagementContent />
    </React.Suspense>
  );
}

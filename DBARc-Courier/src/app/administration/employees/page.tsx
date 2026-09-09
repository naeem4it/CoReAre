'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { PakistanLocationSelect } from '@/components/ui/PakistanLocationSelect';
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
  tenant?: any;
}

const SHIPPER_SUB_ROLES = ['Employee'];
const COURIER_ROLE_NAMES = ['Super Admin', 'Admin', 'Front desk', 'shipment Booker', 'Rider'];

export interface DynamicTariffPlan {
  id: number;
  name: string;
  cashHandlingType?: 'percentage' | 'fixed';
  cashHandlingValue?: number;
  cashHandlingMinFee?: number;
  rtoChargeValue?: number;
  weightTiers?: Array<{ id: string; label: string }>;
  zones?: Array<{
    zoneName: string;
    tierRates: { [tierId: string]: number };
    returnCharges: number;
    insurance: string | number;
  }>;
}

export interface CustomPlanData {
  name: string;
  cashHandlingType: 'percentage' | 'fixed';
  cashHandlingValue: number;
  cashHandlingMinFee: number;
  rtoChargeValue: number;
  weightTiers: Array<{ id: string; label: string }>;
  zones: Array<{
    zoneName: string;
    tierRates: { [tierId: string]: number };
    returnCharges: number;
    insurance: string | number;
  }>;
}

const DEFAULT_CUSTOM_WEIGHT_TIERS = [
  { id: 'tier_half_kg', label: '0.01 to 0.5 kg' },
  { id: 'tier_one_kg', label: '0.51 to 1.0 kg' },
  { id: 'tier_add_kg', label: 'Additional KG' },
];

const DEFAULT_CUSTOM_ZONES = [
  { zoneName: 'Within City', tierRates: { tier_half_kg: 135, tier_one_kg: 150, tier_add_kg: 150 }, returnCharges: 50, insurance: '-' },
  { zoneName: 'Zone A', tierRates: { tier_half_kg: 165, tier_one_kg: 180, tier_add_kg: 180 }, returnCharges: 50, insurance: '-' },
  { zoneName: 'Zone B', tierRates: { tier_half_kg: 175, tier_one_kg: 195, tier_add_kg: 195 }, returnCharges: 100, insurance: '-' },
  { zoneName: 'Zone C', tierRates: { tier_half_kg: 185, tier_one_kg: 205, tier_add_kg: 205 }, returnCharges: 100, insurance: '-' },
  { zoneName: 'Zone D', tierRates: { tier_half_kg: 195, tier_one_kg: 220, tier_add_kg: 220 }, returnCharges: 100, insurance: '-' },
];

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type') || 'courier';
  const { user: authUser, isShipper, isShipperAdmin, isShipperEmployee } = useAuth();

  // Guard: Shipper Employee cannot access team/employee administration
  React.useEffect(() => {
    if (isShipperEmployee) {
      router.push('/');
    }
  }, [isShipperEmployee, router]);

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
  const [shippers, setShippers] = React.useState<{ id: number; name: string; shipper_plan?: any }[]>([]);
  const [offices, setOffices] = React.useState<{ id: number; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'quit'>('active');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Change Tariff Plan for Shipper Modal State
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = React.useState(false);
  const [targetShipperForPlanChange, setTargetShipperForPlanChange] = React.useState<{ id: number; name: string; currentPlanId?: number; currentPlanName?: string } | null>(null);
  const [newAssignedPlanId, setNewAssignedPlanId] = React.useState<number>(1);
  const [isSavingShipperPlan, setIsSavingShipperPlan] = React.useState(false);

  // Multi-roles state (for Courier)
  const [assignedRoleIds, setAssignedRoleIds] = React.useState<number[]>([]);
  // Multi-roles state (for Shipper)
  const [assignedShipperRoles, setAssignedShipperRoles] = React.useState<string[]>(['shipper admin']);
  
  // Selected Employee Type, Shippers & Offices for the active form
  const [formEmployeeType, setFormEmployeeType] = React.useState<'courier' | 'shipper'>('courier');
  const [assignedShipperIds, setAssignedShipperIds] = React.useState<number[]>([]);
  const [assignedOfficeIds, setAssignedOfficeIds] = React.useState<number[]>([]);

  // Available Tariff Plans (loaded strictly from database)
  const [availablePlans, setAvailablePlans] = React.useState<DynamicTariffPlan[]>([]);

  // View Tariff Plan Modal State
  const [isViewPlanModalOpen, setIsViewPlanModalOpen] = React.useState(false);
  const [viewingPlan, setViewingPlan] = React.useState<DynamicTariffPlan | null>(null);
  const [viewingShipperName, setViewingShipperName] = React.useState<string>('');

  // Clean empty Initial Shipper Business Grid State
  const [businessGridRows, setBusinessGridRows] = React.useState<Array<{
    tempId: string;
    id?: number;
    name: string;
    address?: string;
    city?: string;
    planId?: number | 'custom';
    planName: string;
    customPlanData?: CustomPlanData;
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
  const [selectedPlanId, setSelectedPlanId] = React.useState<number | 'custom'>(1);

  // Custom Tariff Plan configuration modal state
  const [isCustomPlanModalOpen, setIsCustomPlanModalOpen] = React.useState(false);
  const [customPlanDraft, setCustomPlanDraft] = React.useState<CustomPlanData>({
    name: '',
    cashHandlingType: 'percentage',
    cashHandlingValue: 1.5,
    cashHandlingMinFee: 30,
    rtoChargeValue: 50,
    weightTiers: DEFAULT_CUSTOM_WEIGHT_TIERS,
    zones: DEFAULT_CUSTOM_ZONES,
  });
  const [configuredCustomPlan, setConfiguredCustomPlan] = React.useState<CustomPlanData | null>(null);
  const [editingBusinessRowTempId, setEditingBusinessRowTempId] = React.useState<string | null>(null);

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

      // 2. Fetch users with roles, tenant, shippers, and offices
      const usersRes = await apiClient.get('/users?populate=role_definition,shipper,offices,role,tenant');
      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      setEmployees(rawUsers);

      // 3. Fetch shippers
      try {
        const shippersRes = await apiClient.get('/shippers/with-plans').catch(() => apiClient.get('/shippers?populate=*'));
        const rawShippers = shippersRes.data?.data || [];
        const mappedShippers = rawShippers.map((item: any) => ({
          id: item.id,
          name: item.name || item.attributes?.name || `Shipper #${item.id}`,
          shipper_plan: item.shipper_plan,
        }));
        setShippers(mappedShippers);
      } catch (shippersErr: any) {
        console.warn('Failed to load shippers list:', shippersErr?.message || shippersErr);
      }

      // 4. Fetch tariff plans from database
      try {
        const plansRes = await apiClient.get('/shipper-plan/list').catch(() => apiClient.get('/shipper-plans'));
        const rawPlans = plansRes.data?.data || [];
        if (rawPlans.length > 0) {
          const mappedPlans: DynamicTariffPlan[] = rawPlans.map((p: any) => ({
            id: p.id,
            name: p.name || p.attributes?.name || `Plan #${p.id}`,
            cashHandlingType: p.cash_handling_type || 'percentage',
            cashHandlingValue: Number(p.cash_handling_value) || 1.5,
            cashHandlingMinFee: Number(p.cash_handling_min_fee) || 30,
            rtoChargeValue: Number(p.rto_charge_value) || 50,
            weightTiers: Array.isArray(p.weight_tiers) && p.weight_tiers.length > 0 ? p.weight_tiers : DEFAULT_CUSTOM_WEIGHT_TIERS,
            zones: Array.isArray(p.zones) && p.zones.length > 0 ? p.zones : DEFAULT_CUSTOM_ZONES,
          }));
          setAvailablePlans(mappedPlans);
        } else {
          setAvailablePlans([]);
        }
      } catch (plansErr: any) {
        console.error('Failed to load shipper plans from database:', plansErr?.message || plansErr);
        setAvailablePlans([]);
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

  // Filter and Search logic strictly separating Shipper Admin vs Courier Admin & Staff
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      // 1. Super Admin is a platform-level role, strictly NOT to be shown in courier admin employee directory!
      const isSuperAdmin = Boolean(
        (emp as any).role?.name === 'Super Admin' ||
        (emp as any).role?.type === 'super-admin' ||
        (emp.username || '').toLowerCase() === 'superadmin' ||
        (emp.email || '').toLowerCase() === 'naeem4it@gmail.com' ||
        emp.role_definition?.some((r: any) => (r.role_name || '').toLowerCase() === 'super admin')
      );
      if (isSuperAdmin) return false;

      // 2. Determine if user is a Shipper Employee
      const isShipperEmployee = Boolean(
        Array.isArray(emp.shipper_roles) && 
        emp.shipper_roles.some((r: string) => r.toLowerCase() === 'employee')
      );

      // 3. Determine if user is a Shipper Admin (has shipper admin role)
      const hasShipperAdminRole = Boolean(
        (Array.isArray(emp.shipper_roles) && emp.shipper_roles.some((r: string) => r.toLowerCase().includes('shipper admin'))) ||
        (emp as any).role?.name === 'Shipper Admin' ||
        (emp as any).role_type === 'shipper' ||
        (emp.email || '').toLowerCase().includes('shipper')
      );
      const isShipperAdmin = hasShipperAdminRole && !isShipperEmployee;

      // 4. Courier User: Tenant Admin / Courier Admin, or courier operational staff (Front desk, Booker, Rider, Operations)
      const isCourierUser = !isShipperAdmin && !isShipperEmployee;

      if (isLoggedShipper) {
        // Logged-in Shipper view: only show their own store employees, never show courier staff or other shipper admins
        if (isCourierUser || isShipperAdmin) return false;
        if (loggedInUser?.shipper?.id && emp.shipper && (emp.shipper as any)?.id !== loggedInUser.shipper.id) {
          return false;
        }
      } else if (effectiveType === 'shipper') {
        // Courier Admin view on Shippers Directory:
        // STRICTLY display users with the shipper admin role linked to a shipper business
        if (!isShipperAdmin) return false;
      } else {
        // Courier Employee Directory:
        // Display all courier-side users: Tenant Admin / Courier Admin, and courier operational roles
        if (!isCourierUser) return false;
      }

      // Filter by Active vs Quit status (blocked maps to quit/terminated)
      const matchesStatus = statusFilter === 'active' ? !emp.blocked : !!emp.blocked;
      if (!matchesStatus) return false;

      // Filter by search query across Username, Full Name, Role name, and Shipper business
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const roleName = emp.role_definition?.map((r: any) => (typeof r === 'string' ? r : (r?.role_name || r?.name || ''))).join(' ') || '';
      const shipperRoles = Array.isArray(emp.shipper_roles) 
        ? emp.shipper_roles.map((r: any) => (typeof r === 'string' ? r : (r?.role_name || r?.name || ''))).join(' ') 
        : String(emp.shipper_roles || '');
      const businessNames = Array.isArray(emp.shipper) 
        ? emp.shipper.map((s: any) => (typeof s === 'string' ? s : (s?.name || ''))).join(' ') 
        : ((emp.shipper as any)?.name || '');
      return (
        emp.username.toLowerCase().includes(query) ||
        (emp.fullName || '').toLowerCase().includes(query) ||
        roleName.toLowerCase().includes(query) ||
        shipperRoles.toLowerCase().includes(query) ||
        businessNames.toLowerCase().includes(query)
      );
    });
  }, [employees, statusFilter, searchQuery, effectiveType, typeParam, isLoggedShipper, loggedInUser]);

  // Selected user shipper resolution for action button
  const selectedUserShipper = React.useMemo(() => {
    if (!selectedUser) return null;
    const rawShipper = Array.isArray(selectedUser.shipper) ? selectedUser.shipper[0] : (selectedUser as any).shipper;
    if (!rawShipper) return null;
    const sId = typeof rawShipper === 'object' ? rawShipper.id : rawShipper;
    const matchInShippers = shippers.find(s => s.id === sId);
    return {
      id: sId,
      name: matchInShippers?.name || (typeof rawShipper === 'object' ? rawShipper.name : `Shipper #${sId}`),
      shipper_plan: matchInShippers?.shipper_plan || (typeof rawShipper === 'object' ? rawShipper.shipper_plan : null)
    };
  }, [selectedUser, shippers]);

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
      setAssignedShipperRoles(['Employee']); // Default and only role for shipper staff
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

  // Open Change Tariff Plan modal for a shipper business
  const handleOpenChangePlanForShipper = (shipperId?: number, shipperName?: string, currentPlanId?: number, currentPlanName?: string) => {
    if (!shipperId) {
      alert('No shipper ID found for this business.');
      return;
    }
    setTargetShipperForPlanChange({
      id: shipperId,
      name: shipperName || `Shipper #${shipperId}`,
      currentPlanId: currentPlanId || 1,
      currentPlanName: currentPlanName || 'Standard Commercial Plan',
    });
    setNewAssignedPlanId(currentPlanId || availablePlans[0]?.id || 1);
    setIsChangePlanModalOpen(true);
  };

  // Open View Tariff Plan modal for a shipper business or plan
  const handleOpenViewPlan = async (planId?: number, planName?: string, shipperName?: string) => {
    setViewingShipperName(shipperName || '');
    let matched = availablePlans.find(p => p.id === planId);
    if (!matched && planId) {
      try {
        const res = await apiClient.get(`/shipper-plans/${planId}`).catch(() => null);
        const item = res?.data?.data;
        if (item) {
          matched = {
            id: item.id,
            name: item.name || item.attributes?.name || planName || `Plan #${item.id}`,
            cashHandlingType: item.cash_handling_type || 'percentage',
            cashHandlingValue: Number(item.cash_handling_value) || 1.5,
            cashHandlingMinFee: Number(item.cash_handling_min_fee) || 30,
            rtoChargeValue: Number(item.rto_charge_value) || 50,
            weightTiers: Array.isArray(item.weight_tiers) && item.weight_tiers.length > 0 ? item.weight_tiers : DEFAULT_CUSTOM_WEIGHT_TIERS,
            zones: Array.isArray(item.zones) && item.zones.length > 0 ? item.zones : DEFAULT_CUSTOM_ZONES,
          };
        }
      } catch (e) {
        console.warn('Failed to load plan details:', e);
      }
    }

    if (!matched) {
      matched = {
        id: planId || 1,
        name: planName || 'Standard Commercial Plan',
        cashHandlingType: 'percentage',
        cashHandlingValue: 1.5,
        cashHandlingMinFee: 30,
        rtoChargeValue: 50,
        weightTiers: DEFAULT_CUSTOM_WEIGHT_TIERS,
        zones: DEFAULT_CUSTOM_ZONES,
      };
    }

    setViewingPlan(matched);
    setIsViewPlanModalOpen(true);
  };

  // Save new plan assignment for shipper
  const handleSaveShipperPlanChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetShipperForPlanChange) return;

    try {
      setIsSavingShipperPlan(true);
      await apiClient.put(`/shippers/${targetShipperForPlanChange.id}/assign-plan`, {
        shipper_plan: newAssignedPlanId,
      });

      const selectedPlanObj = availablePlans.find(p => p.id === newAssignedPlanId);

      // Update local state in shippers
      setShippers(prev => prev.map(s => {
        if (s.id === targetShipperForPlanChange.id) {
          return {
            ...s,
            shipper_plan: selectedPlanObj || { id: newAssignedPlanId, name: `Plan #${newAssignedPlanId}` }
          };
        }
        return s;
      }));

      // Update employees list state
      setEmployees(prev => prev.map(emp => {
        if (emp.shipper && Array.isArray(emp.shipper)) {
          const hasTarget = emp.shipper.some((s: any) => s.id === targetShipperForPlanChange.id);
          if (hasTarget) {
            return {
              ...emp,
              shipper: emp.shipper.map((s: any) => {
                if (s.id === targetShipperForPlanChange.id) {
                  return {
                    ...s,
                    planName: selectedPlanObj?.name,
                    shipper_plan: selectedPlanObj,
                  };
                }
                return s;
              })
            };
          }
        }
        return emp;
      }));

      alert(`Tariff plan for "${targetShipperForPlanChange.name}" successfully updated to "${selectedPlanObj?.name || 'Selected Plan'}"!`);
      setIsChangePlanModalOpen(false);
      setTargetShipperForPlanChange(null);
    } catch (err: any) {
      console.error('Failed to change plan for shipper:', err);
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to change tariff plan for shipper.');
    } finally {
      setIsSavingShipperPlan(false);
    }
  };

  // Open Custom Tariff Plan configuration popup
  const handleOpenCustomPlanModal = (targetBusinessName?: string, existingData?: CustomPlanData | null, rowTempId?: string | null) => {
    const businessLabel = targetBusinessName || newBusinessName || 'Shipper';
    if (existingData) {
      setCustomPlanDraft(JSON.parse(JSON.stringify(existingData)));
    } else {
      setCustomPlanDraft({
        name: `${businessLabel.trim()} Custom Plan`,
        cashHandlingType: 'percentage',
        cashHandlingValue: 1.5,
        cashHandlingMinFee: 30,
        rtoChargeValue: 50,
        weightTiers: JSON.parse(JSON.stringify(DEFAULT_CUSTOM_WEIGHT_TIERS)),
        zones: JSON.parse(JSON.stringify(DEFAULT_CUSTOM_ZONES)),
      });
    }
    setEditingBusinessRowTempId(rowTempId || null);
    setIsCustomPlanModalOpen(true);
  };

  // Save Custom Tariff Plan from popup
  const handleSaveCustomPlanModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlanDraft.name.trim()) {
      alert('Plan Name is required.');
      return;
    }

    if (targetShipperForPlanChange && isChangePlanModalOpen) {
      // Save directly to Strapi and assign to targetShipperForPlanChange
      (async () => {
        try {
          setIsSavingShipperPlan(true);
          const payload = {
            data: {
              name: customPlanDraft.name.trim(),
              cash_handling_type: customPlanDraft.cashHandlingType,
              cash_handling_value: Number(customPlanDraft.cashHandlingValue),
              cash_handling_min_fee: Number(customPlanDraft.cashHandlingMinFee || 0),
              weight_tiers: customPlanDraft.weightTiers,
              zones: customPlanDraft.zones,
              shippers: [targetShipperForPlanChange.id],
            }
          };

          const createRes = await apiClient.post('/shipper-plans', payload);
          const createdPlanId = createRes.data?.data?.id || Date.now();

          await apiClient.put(`/shippers/${targetShipperForPlanChange.id}/assign-plan`, {
            shipper_plan: createdPlanId
          });

          const newPlanObj = {
            id: createdPlanId,
            name: customPlanDraft.name.trim()
          };

          setAvailablePlans(prev => [...prev.filter(p => p.id !== createdPlanId), newPlanObj]);
          setShippers(prev => prev.map(s => s.id === targetShipperForPlanChange.id ? { ...s, shipper_plan: newPlanObj } : s));
          setEmployees(prev => prev.map(emp => {
            if (emp.shipper && Array.isArray(emp.shipper)) {
              return {
                ...emp,
                shipper: emp.shipper.map((s: any) => s.id === targetShipperForPlanChange.id ? { ...s, planName: newPlanObj.name, shipper_plan: newPlanObj } : s)
              };
            }
            return emp;
          }));

          alert(`Custom tariff plan "${newPlanObj.name}" created and assigned to "${targetShipperForPlanChange.name}" successfully!`);
          setIsCustomPlanModalOpen(false);
          setIsChangePlanModalOpen(false);
          setTargetShipperForPlanChange(null);
        } catch (err: any) {
          console.error('Failed to create custom plan for shipper:', err);
          alert(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save custom plan.');
        } finally {
          setIsSavingShipperPlan(false);
        }
      })();
      return;
    }

    if (editingBusinessRowTempId) {
      // Editing an existing business row in the grid
      setBusinessGridRows(prev => prev.map(row => {
        if (row.tempId === editingBusinessRowTempId) {
          return {
            ...row,
            planName: `★ ${customPlanDraft.name.trim()}`,
            customPlanData: JSON.parse(JSON.stringify(customPlanDraft)),
          };
        }
        return row;
      }));
    } else {
      // Configuring custom plan for the business currently being added
      setConfiguredCustomPlan(JSON.parse(JSON.stringify(customPlanDraft)));
      setSelectedPlanId('custom');
    }
    setIsCustomPlanModalOpen(false);
    setEditingBusinessRowTempId(null);
  };

  // Add Business Modal submit
  const handleAddBusinessToGrid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim()) {
      alert('Business Name is required.');
      return;
    }

    const isCustom = selectedPlanId === 'custom';
    if (isCustom && !configuredCustomPlan) {
      alert('Please configure the Custom Tariff Plan rates before adding the business.');
      handleOpenCustomPlanModal(newBusinessName);
      return;
    }

    const planObj = isCustom ? null : (availablePlans.find(p => p.id === Number(selectedPlanId)) || availablePlans[0]);
    const newRow = {
      tempId: Date.now().toString(),
      name: newBusinessName.trim(),
      address: newBusinessAddress.trim(),
      city: newBusinessCity.trim(),
      planId: isCustom ? ('custom' as any) : (planObj?.id || 1),
      planName: isCustom ? `★ ${configuredCustomPlan?.name || 'Custom Plan'}` : (planObj?.name || 'Standard Tariff Plan (Default)'),
      isSelected: false,
      ...(isCustom && configuredCustomPlan ? { customPlanData: configuredCustomPlan } : {}),
    };

    setBusinessGridRows(prev => [...prev, newRow]);
    setIsAddBusinessModalOpen(false);
    setNewBusinessName('');
    setNewBusinessAddress('');
    setNewBusinessCity('');
    setConfiguredCustomPlan(null);
    setSelectedPlanId(availablePlans[0]?.id || 1);
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

    // Auto-create default business store if none was manually added
    let activeBusinessRows = [...businessGridRows];
    if (isShipperFlow && !isLoggedShipper && activeBusinessRows.length === 0) {
      const defaultName = formFullName.trim() ? `${formFullName.trim()} Store` : `${formUsername.trim()} Store`;
      activeBusinessRows = [{
        tempId: Date.now().toString(),
        name: defaultName,
        address: '',
        city: '',
        planId: availablePlans[0]?.id || 1,
        planName: availablePlans[0]?.name || 'Standard Tariff Plan (Default)',
        isSelected: false,
      }];
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
        const tenantId = loggedInUser?.tenant?.id || JSON.parse(localStorage.getItem('user') || '{}')?.tenant?.id;
        
        // Save any custom tariff plans to database first, so both records save and associate
        const shipperObjects = [];
        for (let idx = 0; idx < activeBusinessRows.length; idx++) {
          const b = activeBusinessRows[idx];
          let assignedPlanId = typeof b.planId === 'number' ? b.planId : 1;

          if (b.customPlanData) {
            try {
              const customPayload = {
                data: {
                  name: b.customPlanData.name || `${b.name} Custom Plan`,
                  charge_type: b.customPlanData.cashHandlingType === 'fixed' ? 'fixed_rupees' : 'percentage',
                  charge_value: Number(b.customPlanData.cashHandlingValue) || 0,
                  cod_charge_type: b.customPlanData.cashHandlingType === 'fixed' ? 'fixed_rupees' : 'percentage',
                  cod_charge_value: Number(b.customPlanData.cashHandlingValue) || 0,
                  rto_charge_type: 'percentage',
                  rto_charge_value: Number(b.customPlanData.rtoChargeValue) || 50,
                  cash_handling_type: b.customPlanData.cashHandlingType || 'percentage',
                  cash_handling_value: Number(b.customPlanData.cashHandlingValue) || 1.5,
                  cash_handling_min_fee: Number(b.customPlanData.cashHandlingMinFee) || 30,
                  weight_tiers: b.customPlanData.weightTiers,
                  zones: b.customPlanData.zones,
                  tenant: tenantId,
                }
              };
              const planRes = await apiClient.post('/shipper-plans', customPayload);
              if (planRes?.data?.data?.id) {
                assignedPlanId = planRes.data.data.id;
              }
            } catch (planErr: any) {
              console.warn('Failed to save custom plan to server:', planErr?.message || planErr);
            }
          }

          shipperObjects.push({
            id: (b.id && typeof b.id === 'number' && b.id < 1000000000000) ? b.id : undefined,
            name: b.name,
            address: b.address || '',
            city: b.city || '',
            planId: assignedPlanId,
            planName: b.planName || 'Standard Tariff Plan (Default)'
          });
        }

        payload.shipper = shipperObjects;
        payload.shipper_roles = isLoggedShipper ? ['Employee'] : ['shipper admin'];
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
              ? 'Manage your store team employees, credentials, and access permissions.'
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
              {isLoggedShipper ? 'Add Employee' : (effectiveType === 'shipper' ? 'Add Shipper' : 'Add Employee')}
            </button>
            <button
              onClick={handleOpenEditForm}
              disabled={!selectedUser}
              className="bg-white border border-outline-variant text-secondary h-10 px-4 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit
            </button>
            {!isShipperEmployee && (
              <button
                onClick={handleDeleteUser}
                disabled={!selectedUser || selectedUser.blocked}
                className="bg-red-50 border border-red-200 text-red-700 h-10 px-4 rounded-xl hover:bg-red-100/50 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            )}
            {effectiveType === 'shipper' && !isLoggedShipper && (
              <>
                <button
                  onClick={() => {
                    if (!selectedUserShipper) {
                      alert('Please select a shipper record from the directory first.');
                      return;
                    }
                    handleOpenViewPlan(
                      selectedUserShipper.shipper_plan?.id,
                      selectedUserShipper.shipper_plan?.name,
                      selectedUserShipper.name
                    );
                  }}
                  disabled={!selectedUser || !selectedUserShipper}
                  className="bg-slate-50 border border-slate-300 text-slate-700 h-10 px-4 rounded-xl hover:bg-slate-100 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="View assigned tariff plan rate card for the selected shipper"
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  View Plan
                </button>
                <button
                  onClick={() => {
                    if (!selectedUserShipper) {
                      alert('Please select a shipper record from the directory first.');
                      return;
                    }
                    handleOpenChangePlanForShipper(
                      selectedUserShipper.id,
                      selectedUserShipper.name,
                      selectedUserShipper.shipper_plan?.id,
                      selectedUserShipper.shipper_plan?.name
                    );
                  }}
                  disabled={!selectedUser || !selectedUserShipper}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-700 h-10 px-4 rounded-xl hover:bg-indigo-100/60 active:scale-95 transition-all font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Change tariff plan for the selected shipper"
                >
                  <span className="material-symbols-outlined text-[18px]">price_change</span>
                  Change Tariff Plan
                </button>
              </>
            )}
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
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">
                      {effectiveType === 'shipper' ? 'Business Name' : 'Office / Station'}
                    </th>
                    {effectiveType === 'shipper' && (
                      <th className="px-lg py-4 font-bold text-label-md text-slate-600">Tariff Plan</th>
                    )}
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600">Assigned Role</th>
                    <th className="px-lg py-4 font-bold text-label-md text-slate-600 text-center">Status</th>
                    {effectiveType === 'shipper' && (
                      <th className="px-lg py-4 font-bold text-label-md text-slate-600 text-center">Action</th>
                    )}
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

                    const officeNamesStr = (() => {
                      if (emp.offices && Array.isArray(emp.offices) && emp.offices.length > 0) {
                        return emp.offices.map((o: any) => o.name || `Office #${o.id}`).filter(Boolean).join(', ');
                      }
                      return 'Head Office / Hub';
                    })();

                    const empShipper = (() => {
                      if (emp.shipper && Array.isArray(emp.shipper) && emp.shipper.length > 0) {
                        const rawS = emp.shipper[0];
                        const sId = typeof rawS === 'object' ? rawS.id : rawS;
                        const match = shippers.find(s => s.id === sId);
                        return {
                          id: sId,
                          name: match?.name || (typeof rawS === 'object' ? rawS.name : `Shipper #${sId}`),
                          plan: (match as any)?.shipper_plan || (typeof rawS === 'object' ? (rawS as any).shipper_plan : null)
                        };
                      }
                      return null;
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
                        <td className="px-lg py-4 font-bold text-slate-900">
                          {effectiveType === 'shipper' ? businessNamesStr : officeNamesStr}
                        </td>
                        {effectiveType === 'shipper' && (
                          <td className="px-lg py-4">
                            {empShipper ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenViewPlan(empShipper.plan?.id, empShipper.plan?.name, empShipper.name);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 transition-all cursor-pointer shadow-2xs group"
                                title="Click to view full rate card and weight tiers"
                              >
                                <span className="material-symbols-outlined text-[14px]">price_change</span>
                                <span>{empShipper.plan?.name || 'Standard Commercial Plan'}</span>
                                <span className="material-symbols-outlined text-[14px] opacity-60 group-hover:opacity-100 text-indigo-600">visibility</span>
                              </button>
                            ) : (
                              <span className="text-outline italic text-xs">No Shipper Assigned</span>
                            )}
                          </td>
                        )}
                        <td className="px-lg py-4 font-semibold text-on-surface-variant">
                          {(() => {
                            if (effectiveType === 'shipper') {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Shipper Admin
                                </span>
                              );
                            }

                            const sRoles: string[] = (Array.isArray(emp.shipper_roles) ? emp.shipper_roles : [emp.shipper_roles])
                              .filter(Boolean)
                              .map((r: any) => (typeof r === 'string' ? r : (r?.role_name || r?.name || String(r))));

                            const empRoles: string[] = (Array.isArray(emp.role_definition) ? emp.role_definition : [emp.role_definition])
                              .filter(Boolean)
                              .map((r: any) => {
                                if (typeof r === 'string') return r;
                                if (r?.role_name) return String(r.role_name);
                                if (r?.name) return String(r.name);
                                if (typeof r === 'number') {
                                  const match = roles.find((item) => item.id === r);
                                  return match?.role_name || `Role #${r}`;
                                }
                                if (r?.id) {
                                  const match = roles.find((item) => item.id === r.id);
                                  return match?.role_name || `Role #${r.id}`;
                                }
                                return String(r || '');
                              });

                            const roleObjName = typeof (emp as any).role === 'string' 
                              ? (emp as any).role 
                              : ((emp as any).role?.name || '');
                            const isTenantAdmin = roleObjName === 'Tenant Admin' || 
                                                  roleObjName === 'Courier Admin' ||
                                                  emp.email?.toLowerCase().includes('courier') ||
                                                  emp.username?.toLowerCase().includes('courier') ||
                                                  Boolean(emp.tenant);

                            const allDisplayRoles: string[] = [...sRoles, ...empRoles]
                              .map((r) => String(r || '').trim())
                              .filter((r) => r.length > 0);

                            if (allDisplayRoles.length === 0 && isTenantAdmin) {
                              allDisplayRoles.push('Courier Admin');
                            }

                            return allDisplayRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allDisplayRoles.map((rName, i) => {
                                  const str = String(rName);
                                  return (
                                    <span key={i} className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                                      str.toLowerCase().includes('admin')
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : 'bg-slate-100 text-slate-800 border-slate-200'
                                    }`}>
                                      {str}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Courier Staff
                              </span>
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
                        {effectiveType === 'shipper' && (
                          <td className="px-lg py-4 text-center">
                            {empShipper ? (
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenViewPlan(empShipper.plan?.id, empShipper.plan?.name, empShipper.name);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                  title="View tariff rate card for this shipper"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-slate-500">visibility</span>
                                  View Plan
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenChangePlanForShipper(
                                      empShipper.id,
                                      empShipper.name,
                                      empShipper.plan?.id,
                                      empShipper.plan?.name
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                  title="Change tariff rate plan for this shipper business"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                  Change Plan
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        )}
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
                /* Shipper Admin assigning store Employee role */
                <div className="flex flex-col gap-1 border border-outline-variant rounded-xl p-3.5 bg-emerald-50/50">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assigned Role</label>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-200">
                    <span className="material-symbols-outlined text-emerald-600 text-[24px]">badge</span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Employee</div>
                      <div className="text-xs text-slate-500">Operational team member: can book single and bulk orders, manage shipments, print sheets, and handle pickups. Restricted from deletion and store administration.</div>
                    </div>
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
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={row.customPlanData ? "text-emerald-700 font-bold flex items-center gap-1" : "text-primary font-bold"}>
                                    {row.customPlanData && <span className="material-symbols-outlined text-[15px] text-emerald-600">star</span>}
                                    {row.planName}
                                  </span>
                                  {row.customPlanData && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCustomPlanModal(row.name, row.customPlanData, row.tempId)}
                                      className="text-[11px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer font-bold inline-flex items-center gap-0.5 shadow-xs"
                                      title="Edit Custom Rates"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">tune</span> Edit Rates
                                    </button>
                                  )}
                                </div>
                              </td>
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
                  City / Location
                </label>
                <PakistanLocationSelect
                  value={newBusinessCity}
                  onChange={(val, loc: any) => setNewBusinessCity(loc ? (loc.cityName || loc.tehsil) : String(val))}
                  placeholder="Search and select city / tehsil (e.g. Lahore, Karachi, Islamabad...)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Assign Tariff Plan <span className="text-red-500">*</span>
                  </label>
                  {selectedPlanId === 'custom' && configuredCustomPlan && (
                    <button
                      type="button"
                      onClick={() => handleOpenCustomPlanModal(newBusinessName, configuredCustomPlan)}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">tune</span> Edit Custom Rates
                    </button>
                  )}
                </div>
                <select
                  value={selectedPlanId}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setSelectedPlanId('custom');
                      handleOpenCustomPlanModal(newBusinessName, configuredCustomPlan);
                    } else {
                      setSelectedPlanId(Number(val));
                    }
                  }}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <optgroup label="Standard Tariff Plans">
                    {availablePlans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Tariff Plans">
                    <option value="custom">
                      {configuredCustomPlan ? `★ ${configuredCustomPlan.name} (Configured)` : '+ Custom Tariff Plan (Configure Rates...)'}
                    </option>
                  </optgroup>
                </select>

                {selectedPlanId === 'custom' && (
                  <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                      <div>
                        <p className="text-xs font-bold text-emerald-900">
                          {configuredCustomPlan ? configuredCustomPlan.name : 'Custom Plan Selected'}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          Custom rates configured. Will save and associate when Shipper Admin is submitted.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCustomPlanModal(newBusinessName, configuredCustomPlan)}
                      className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      Edit Rates
                    </button>
                  </div>
                )}
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

      {/* POPUP MODAL: Custom Tariff Plan Configuration for Shipper */}
      {isCustomPlanModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsCustomPlanModalOpen(false)} />
          
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-[860px] max-w-[96vw] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <span className="material-symbols-outlined text-[22px]">tune</span>
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Configure Custom Tariff Plan
                  </h3>
                  <p className="text-xs text-slate-300">
                    Custom rate card & COD terms for <span className="font-bold text-amber-300">{editingBusinessRowTempId ? businessGridRows.find(r => r.tempId === editingBusinessRowTempId)?.name : (newBusinessName || 'Shipper Business')}</span>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCustomPlanModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveCustomPlanModal} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Plan Name & Context Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">info</span>
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">Pending Record Association: </span>
                  This custom tariff plan will be associated with the shipper business. When you press <span className="font-bold">Create User</span> on the Shipper Admin form, both records will be saved and linked in the database.
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                  Custom Tariff Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme VIP Custom Plan"
                  value={customPlanDraft.name}
                  onChange={e => setCustomPlanDraft(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Cash Handling / COD Fees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                    COD Fee Type
                  </label>
                  <select
                    value={customPlanDraft.cashHandlingType}
                    onChange={e => setCustomPlanDraft(prev => ({ ...prev, cashHandlingType: e.target.value as any }))}
                    className="w-full bg-white border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (PKR)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                    COD Fee Value ({customPlanDraft.cashHandlingType === 'percentage' ? '%' : 'PKR'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customPlanDraft.cashHandlingValue}
                    onChange={e => setCustomPlanDraft(prev => ({ ...prev, cashHandlingValue: Number(e.target.value) }))}
                    className="w-full bg-white border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                    Min COD Fee (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customPlanDraft.cashHandlingMinFee}
                    onChange={e => setCustomPlanDraft(prev => ({ ...prev, cashHandlingMinFee: Number(e.target.value) }))}
                    className="w-full bg-white border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Weight Tier & Zone Pricing Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                    Regional Zone Rates & Weight Tiers (PKR)
                  </label>
                  <span className="text-[11px] text-slate-400">All prices in PKR</span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Zone / Region</th>
                        {customPlanDraft.weightTiers.map(t => (
                          <th key={t.id} className="p-3 text-center">{t.label}</th>
                        ))}
                        <th className="p-3 text-center">Return (RTO)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {customPlanDraft.zones.map((zone, zIdx) => (
                        <tr key={zone.zoneName} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 whitespace-nowrap flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />
                            {zone.zoneName}
                          </td>
                          {customPlanDraft.weightTiers.map(t => (
                            <td key={t.id} className="p-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-slate-400 text-[11px]">Rs.</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={zone.tierRates?.[t.id] ?? 0}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setCustomPlanDraft(prev => {
                                      const copy = JSON.parse(JSON.stringify(prev));
                                      if (!copy.zones[zIdx].tierRates) copy.zones[zIdx].tierRates = {};
                                      copy.zones[zIdx].tierRates[t.id] = val;
                                      return copy;
                                    });
                                  }}
                                  className="w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary rounded-lg p-1.5 text-center font-bold text-xs outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-slate-400 text-[11px]">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                value={zone.returnCharges ?? 50}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setCustomPlanDraft(prev => {
                                    const copy = JSON.parse(JSON.stringify(prev));
                                    copy.zones[zIdx].returnCharges = val;
                                    return copy;
                                  });
                                }}
                                className="w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary rounded-lg p-1.5 text-center font-bold text-xs outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 italic">
                  * Press Save Plan Details to apply custom rates to this shipper.
                </span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCustomPlanModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span> Save Plan Details
                  </button>
                </div>
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

      {/* CENTERED POPUP MODAL: Change Tariff Plan for Shipper Business */}
      {isChangePlanModalOpen && targetShipperForPlanChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingShipperPlan && setIsChangePlanModalOpen(false)}
          />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-200 w-[520px] max-w-[95vw] shrink-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <span className="material-symbols-outlined text-[24px]">price_change</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Change Tariff Plan</h3>
                  <p className="text-xs text-slate-500 font-medium">Update assigned price plan for shipper business</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePlanModalOpen(false)}
                disabled={isSavingShipperPlan}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveShipperPlanChange} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div className="text-slate-500 font-medium">Shipper Business:</div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">store</span>
                  {targetShipperForPlanChange.name}
                </div>
                <div className="text-slate-500 font-medium mt-2">Currently Assigned:</div>
                <div className="font-semibold text-indigo-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">sell</span>
                    {targetShipperForPlanChange.currentPlanName || 'Standard Commercial Plan'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenViewPlan(
                      targetShipperForPlanChange.currentPlanId,
                      targetShipperForPlanChange.currentPlanName,
                      targetShipperForPlanChange.name
                    )}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                    View Assigned Rates
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Select New Tariff Plan <span className="text-red-500">*</span>
                  </label>
                  {newAssignedPlanId && (
                    <button
                      type="button"
                      onClick={() => handleOpenViewPlan(
                        newAssignedPlanId,
                        availablePlans.find(p => p.id === newAssignedPlanId)?.name,
                        targetShipperForPlanChange.name
                      )}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">visibility</span>
                      Preview Selected Plan
                    </button>
                  )}
                </div>
                <select
                  value={newAssignedPlanId}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      handleOpenCustomPlanModal(targetShipperForPlanChange?.name);
                      return;
                    }
                    setNewAssignedPlanId(Number(e.target.value));
                  }}
                  disabled={isSavingShipperPlan}
                  className="w-full bg-white border border-outline-variant rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                  required
                >
                  {availablePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} {plan.id === targetShipperForPlanChange.currentPlanId ? '(Current)' : ''}
                    </option>
                  ))}
                  <option value="custom" className="font-bold text-primary">
                    + Custom Tariff Plan (Configure Rates...)
                  </option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  All rate cards, weight tiers, and cash handling percentages of the selected plan will apply to this shipper immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePlanModalOpen(false)}
                  disabled={isSavingShipperPlan}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingShipperPlan}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingShipperPlan ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Update Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: View Tariff Plan Details */}
      {isViewPlanModalOpen && viewingPlan && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsViewPlanModalOpen(false)}
          />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-200 w-[780px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <span className="material-symbols-outlined text-[24px]">price_change</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    {viewingPlan.name}
                    <span className="text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                      ID: #{viewingPlan.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {viewingShipperName ? `Tariff rate card assigned to "${viewingShipperName}"` : 'Tariff rate card details & weight tiers'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewPlanModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Key Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cash Handling (COD)</div>
                    <div className="text-sm font-bold text-slate-900">
                      {viewingPlan.cashHandlingValue ?? 1.5}{viewingPlan.cashHandlingType === 'fixed' ? ' Rs' : '%'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">shield</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Min Cash Handling Fee</div>
                    <div className="text-sm font-bold text-slate-900">
                      Rs. {viewingPlan.cashHandlingMinFee ?? 30}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">assignment_return</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Return (RTO) Fee</div>
                    <div className="text-sm font-bold text-slate-900">
                      {viewingPlan.rtoChargeValue ?? 50}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Card Matrix Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">table_chart</span>
                    Weight Tier & Regional Rates (PKR)
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">All prices exclusive of GST</span>
                </div>

                <div className="border border-outline-variant rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 bg-slate-100">Zone</th>
                          {(viewingPlan.weightTiers || DEFAULT_CUSTOM_WEIGHT_TIERS).map((tier) => (
                            <th key={tier.id} className="px-4 py-3 text-center border-l border-slate-200">
                              {tier.label}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center border-l border-slate-200 text-rose-700">RTO Charges</th>
                          <th className="px-4 py-3 text-center border-l border-slate-200">Insurance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {(viewingPlan.zones || DEFAULT_CUSTOM_ZONES).map((z, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-primary">pin_drop</span>
                              {z.zoneName}
                            </td>
                            {(viewingPlan.weightTiers || DEFAULT_CUSTOM_WEIGHT_TIERS).map((tier) => (
                              <td key={tier.id} className="px-4 py-3 text-center font-semibold text-slate-800 border-l border-slate-200">
                                Rs. {(z.tierRates as any)?.[tier.id] ?? '-'}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center font-bold text-rose-700 border-l border-slate-200">
                              {typeof z.returnCharges === 'number' ? `Rs. ${z.returnCharges}` : (z.returnCharges || '-')}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500 border-l border-slate-200">
                              {z.insurance ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50 shrink-0">
              <span className="text-xs text-slate-500">
                Managed under Courier Tariff Management
              </span>
              <button
                type="button"
                onClick={() => setIsViewPlanModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
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

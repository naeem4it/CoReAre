'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { useRouter } from 'next/navigation';

interface ExpenseCategory {
  id: number | string;
  documentId?: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface ExpenseOffice {
  id: number | string;
  documentId?: string;
  name: string;
  label: string;
}

interface ExpenseEmployee {
  id: number | string;
  documentId?: string;
  name: string;
  role: string;
  label: string;
}

interface ExpenseItem {
  id: number | string;
  documentId?: string;
  title?: string;
  amount: number;
  expense_date: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Card' | 'Mobile Wallet';
  payee?: string;
  reference_no?: string;
  notes?: string;
  status: 'Paid' | 'Pending' | 'Cancelled';
  allocation_type: 'Office' | 'Employee';
  category?: ExpenseCategory | null;
  office?: ExpenseOffice | null;
  employee?: ExpenseEmployee | null;
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 1, name: 'Fuel & Travel', is_active: true },
  { id: 2, name: 'Vehicle Maintenance & Repair', is_active: true },
  { id: 3, name: 'Office Rent & Utilities', is_active: true },
  { id: 4, name: 'Packaging & Supplies', is_active: true },
  { id: 5, name: 'Rider / Staff Advances & Allowances', is_active: true },
  { id: 6, name: 'Refreshments & Food', is_active: true },
  { id: 7, name: 'Marketing', is_active: true },
  { id: 8, name: 'Miscellaneous', is_active: true },
];

export default function ExpensesPage() {
  const router = useRouter();
  const { user, isShipper, isShipperAdmin, isShipperEmployee } = useAuth();
  const isCourierAdmin = !isShipper && !isShipperAdmin && !isShipperEmployee;

  // Data states
  const [expenses, setExpenses] = React.useState<ExpenseItem[]>([]);
  const [categories, setCategories] = React.useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [offices, setOffices] = React.useState<ExpenseOffice[]>([]);
  const [employees, setEmployees] = React.useState<ExpenseEmployee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'this_week' | 'this_month'>('this_month');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [allocationFilter, setAllocationFilter] = React.useState<'all' | 'Office' | 'Employee'>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<ExpenseItem | null>(null);
  const [isSavingExpense, setIsSavingExpense] = React.useState(false);

  // Expense Form state
  const [formData, setFormData] = React.useState({
    categoryId: '' as string | number,
    amount: '' as string | number,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash' as 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Card' | 'Mobile Wallet',
    status: 'Paid' as 'Paid' | 'Pending' | 'Cancelled',
    allocation_type: 'Office' as 'Office' | 'Employee',
    officeId: '' as string | number,
    employeeId: '' as string | number,
    payee: '',
    reference_no: '',
    notes: '',
  });

  // Category Quick Add Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [isSavingCategory, setIsSavingCategory] = React.useState(false);
  const [categoryFormData, setCategoryFormData] = React.useState({
    name: '',
    description: '',
  });

  // Delete confirmation modal state
  const [deletingExpense, setDeletingExpense] = React.useState<ExpenseItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Notification Toast
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/expense-categories', {
        params: {
          sort: 'name:asc',
          pagination: { limit: 100 },
        },
      });
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (Array.isArray(rawData) && rawData.length > 0) {
        const parsed: ExpenseCategory[] = rawData.map((item: any) => {
          const attrs = item.attributes || item;
          return {
            id: item.documentId || item.id,
            documentId: item.documentId,
            name: attrs.name || item.name || '',
            description: attrs.description || item.description || '',
            is_active: attrs.is_active ?? item.is_active ?? true,
          };
        });
        setCategories(parsed);
        return parsed;
      }
      return DEFAULT_CATEGORIES;
    } catch (err) {
      console.warn('Failed to load expense categories:', err);
      return DEFAULT_CATEGORIES;
    }
  };

  // Fetch Offices with City / Address for distinction, strictly scoped to active tenant
  const fetchOffices = async () => {
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenant || storedUser?.tenant?.id || storedUser?.tenant;

      const filters: any = { type: 'courier' };
      if (tenantId) {
        filters.tenant = tenantId;
      }

      const res = await apiClient.get('/offices', {
        params: {
          filters,
          populate: ['city', 'tenant'],
          pagination: { limit: 100 },
        },
      });
      const raw = res.data?.data || [];

      // Strictly isolate to the current tenant's offices added from Office Hub
      const filtered = raw.filter((item: any) => {
        if (!tenantId) return true;
        const attrs = item.attributes || item;
        const offTenantId = attrs.tenant?.data?.id || attrs.tenant?.id || attrs.tenant;
        return offTenantId ? Number(offTenantId) === Number(tenantId) : false;
      });

      const parsed: ExpenseOffice[] = filtered.map((item: any) => {
        const attrs = item.attributes || item;
        const name = attrs.name || `Office #${item.id}`;
        const cityData = attrs.city?.data?.attributes || attrs.city?.data || attrs.city;
        const cityName = cityData?.CityName || cityData?.name || (typeof cityData === 'string' ? cityData : '');
        const address = attrs.address || '';
        
        let label = name;
        if (cityName) {
          label = `${name} (${cityName})`;
        } else if (address) {
          label = `${name} (${address.slice(0, 25)})`;
        }

        return {
          id: item.documentId || item.id,
          documentId: item.documentId,
          name,
          label,
        };
      });
      setOffices(parsed);
    } catch (err) {
      console.warn('Failed to load courier offices:', err);
    }
  };

  // Fetch Employees with Role formatting: EmployeeName (Role), strictly scoped to active tenant
  const fetchEmployees = async () => {
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenant || storedUser?.tenant?.id || storedUser?.tenant;

      const res = await apiClient.get('/users?populate=role_definition,role,tenant,shipper');
      const rawUsers = Array.isArray(res.data) 
        ? res.data 
        : (Array.isArray(res.data?.data) ? res.data.data : []);

      const courierStaff = rawUsers.filter((u: any) => {
        if (u.blocked) return false;

        // Tenant isolation: employee must belong to this active tenant
        if (tenantId) {
          const uTenantId = u.tenant?.data?.id || u.tenant?.id || u.tenant || u.tenant_id;
          if (uTenantId && Number(uTenantId) !== Number(tenantId)) {
            return false;
          }
        }

        const email = (u.email || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        if (email.includes('superadmin') || username.includes('superadmin')) return false;

        const hasShipperBusiness = Array.isArray(u.shipper) ? u.shipper.length > 0 : Boolean(u.shipper && u.shipper.id);
        const hasShipperRoles = Array.isArray(u.shipper_roles) && u.shipper_roles.length > 0;
        const isShipperUser = (hasShipperBusiness || hasShipperRoles || email.includes('shipper') || username.includes('shipper')) && 
          (!Array.isArray(u.role_definition) || u.role_definition.length === 0);

        return !isShipperUser;
      });

      const mapped: ExpenseEmployee[] = courierStaff.map((u: any) => {
        let roleName = 'Staff';
        if (Array.isArray(u.role_definition) && u.role_definition.length > 0) {
          roleName = u.role_definition
            .map((r: any) => r.role_name || r.name || (typeof r === 'string' ? r : ''))
            .filter(Boolean)
            .join(', ');
        } else if (u.role?.name && u.role.name !== 'Authenticated') {
          roleName = u.role.name;
        } else if ((u.username || '').toLowerCase().includes('rider') || (u.email || '').toLowerCase().includes('rider')) {
          roleName = 'Rider';
        } else if ((u.username || '').toLowerCase().includes('admin') || (u.email || '').toLowerCase().includes('admin')) {
          roleName = 'Admin';
        } else if ((u.username || '').toLowerCase().includes('dispatch')) {
          roleName = 'Dispatcher';
        }

        const fullName = (u.fullName || u.full_name || `${u.firstname || ''} ${u.lastname || ''}`).trim();
        const displayName = fullName || u.username || u.email || `Staff #${u.id}`;

        return {
          id: u.id,
          documentId: u.documentId,
          name: displayName,
          role: roleName,
          label: `${displayName} (${roleName})`,
        };
      });

      setEmployees(mapped);
    } catch (err) {
      console.warn('Failed to load courier employees:', err);
    }
  };

  // Fetch Expenses
  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/expenses', {
        params: {
          sort: 'expense_date:desc,createdAt:desc',
          populate: ['category', 'office', 'office.city', 'employee', 'employee.role_definition', 'employee.role'],
          pagination: { limit: 500 },
        },
      });
      const raw = res.data?.data || [];
      const parsed: ExpenseItem[] = raw.map((item: any) => {
        const attrs = item.attributes || item;
        const catData = attrs.category?.data || attrs.category;
        const offData = attrs.office?.data || attrs.office;
        const empData = attrs.employee?.data || attrs.employee;

        let parsedEmp: ExpenseEmployee | null = null;
        if (empData) {
          const empAttrs = empData.attributes || empData;
          let roleName = 'Staff';
          if (Array.isArray(empAttrs.role_definition) && empAttrs.role_definition.length > 0) {
            roleName = empAttrs.role_definition.map((r: any) => r.role_name || r.name || r).join(', ');
          } else if (empAttrs.role?.name) {
            roleName = empAttrs.role.name;
          }
          const fullName = (empAttrs.fullName || `${empAttrs.firstname || ''} ${empAttrs.lastname || ''}`).trim();
          const displayName = fullName || empAttrs.username || empAttrs.email || 'Employee';
          parsedEmp = {
            id: empData.id,
            documentId: empData.documentId,
            name: displayName,
            role: roleName,
            label: `${displayName} (${roleName})`,
          };
        }

        let parsedOffice: ExpenseOffice | null = null;
        if (offData) {
          const offAttrs = offData.attributes || offData;
          const offName = offAttrs.name || `Office #${offData.id}`;
          const cityData = offAttrs.city?.data?.attributes || offAttrs.city?.data || offAttrs.city;
          const cityName = cityData?.CityName || cityData?.name || '';
          parsedOffice = {
            id: offData.documentId || offData.id,
            documentId: offData.documentId,
            name: offName,
            label: cityName ? `${offName} (${cityName})` : offName,
          };
        }

        return {
          id: item.id,
          documentId: item.documentId || attrs.documentId,
          title: attrs.title || '',
          amount: Number(attrs.amount || 0),
          expense_date: attrs.expense_date || '',
          payment_method: attrs.payment_method || 'Cash',
          payee: attrs.payee || '',
          reference_no: attrs.reference_no || '',
          notes: attrs.notes || '',
          status: attrs.status || 'Paid',
          allocation_type: attrs.allocation_type || (parsedEmp ? 'Employee' : 'Office'),
          category: catData
            ? {
                id: catData.documentId || catData.id,
                documentId: catData.documentId,
                name: catData.attributes?.name || catData.name || '',
              }
            : null,
          office: parsedOffice,
          employee: parsedEmp,
        };
      });
      setExpenses(parsed);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      triggerToast('Failed to load expenses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Load categories and static dependencies on mount immediately
  React.useEffect(() => {
    fetchCategories();
    fetchOffices();
    fetchEmployees();
  }, []);

  // When user context is confirmed or refreshed
  React.useEffect(() => {
    if (!user) return;
    if (!isCourierAdmin) {
      router.push('/');
      return;
    }
    fetchExpenses();
    fetchOffices();
    fetchEmployees();
  }, [user, isCourierAdmin]);

  // Handle Opening Expense Modal (Create or Edit)
  const handleOpenExpenseModal = (expense?: ExpenseItem) => {
    // Refresh offices and employees so modal has immediate active data
    fetchOffices();
    fetchEmployees();

    const defaultCatId = categories[0]?.documentId || categories[0]?.id || DEFAULT_CATEGORIES[0].id;
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        categoryId: expense.category?.documentId || expense.category?.id || defaultCatId,
        amount: expense.amount,
        expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
        payment_method: expense.payment_method || 'Cash',
        status: expense.status || 'Paid',
        allocation_type: expense.allocation_type || (expense.employee ? 'Employee' : 'Office'),
        officeId: expense.office?.documentId || expense.office?.id || '',
        employeeId: expense.employee?.id || '',
        payee: expense.payee || '',
        reference_no: expense.reference_no || '',
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        categoryId: defaultCatId,
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        status: 'Paid',
        allocation_type: 'Office',
        officeId: '',
        employeeId: '',
        payee: '',
        reference_no: '',
        notes: '',
      });
    }
    setIsExpenseModalOpen(true);
  };

  // Handle Saving Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      triggerToast('Please select an expense category', 'error');
      return;
    }
    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      triggerToast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    // Resolve category name for title
    const selectedCategory = categories.find(
      c => String(c.documentId || c.id) === String(formData.categoryId)
    );
    const categoryName = selectedCategory?.name || 'Expense';

    try {
      setIsSavingExpense(true);
      const payload: any = {
        title: categoryName,
        category: formData.categoryId,
        amount: numAmount,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        status: formData.status,
        allocation_type: formData.allocation_type,
        payee: formData.payee.trim() || undefined,
        reference_no: formData.reference_no.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (formData.allocation_type === 'Office') {
        payload.office = formData.officeId ? formData.officeId : null;
        payload.employee = null;
      } else {
        if (!formData.employeeId) {
          triggerToast('Please select an employee', 'error');
          setIsSavingExpense(false);
          return;
        }
        payload.employee = Number(formData.employeeId);
        payload.office = null;
      }

      const tenantId = user?.tenant?.id || user?.tenant;
      if (tenantId) {
        payload.tenant = tenantId;
      }

      const expenseId = editingExpense?.documentId || editingExpense?.id;
      if (editingExpense) {
        await apiClient.put(`/expenses/${expenseId}`, { data: payload });
        triggerToast(`Expense record updated successfully!`, 'success');
      } else {
        await apiClient.post('/expenses', { data: payload });
        triggerToast(`Expense for "${categoryName}" recorded!`, 'success');
      }

      setIsExpenseModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      triggerToast(err?.response?.data?.error?.message || 'Error saving expense record', 'error');
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Handle Saving New Category from Quick Modal
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const catName = categoryFormData.name.trim();
    if (!catName) {
      triggerToast('Please enter category name', 'error');
      return;
    }

    try {
      setIsSavingCategory(true);
      const tenantId = user?.tenant?.id || user?.tenant;
      const catPayload: any = {
        name: catName,
        description: categoryFormData.description.trim() || undefined,
        is_active: true,
      };
      if (tenantId) {
        catPayload.tenant = tenantId;
      }

      const res = await apiClient.post('/expense-categories', {
        data: catPayload,
      });

      const newId = res.data?.data?.documentId || res.data?.data?.id;
      triggerToast(`Category "${catName}" created!`, 'success');

      // Refresh categories and automatically set this category in the open expense form
      const updatedCategories = await fetchCategories();
      if (newId) {
        setFormData(prev => ({ ...prev, categoryId: newId }));
      } else {
        const found = updatedCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (found) {
          setFormData(prev => ({ ...prev, categoryId: found.documentId || found.id }));
        }
      }

      setIsCategoryModalOpen(false);
      setCategoryFormData({ name: '', description: '' });
    } catch (err: any) {
      console.error('Failed to create category:', err);
      triggerToast(err?.response?.data?.error?.message || 'Failed to create category', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Handle Deleting Expense
  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      setIsDeleting(true);
      const deleteId = deletingExpense.documentId || deletingExpense.id;
      await apiClient.delete(`/expenses/${deleteId}`);
      triggerToast(`Expense record removed`, 'success');
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      triggerToast('Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPayee = (item.payee || '').toLowerCase().includes(q);
        const matchesRef = (item.reference_no || '').toLowerCase().includes(q);
        const matchesCat = (item.category?.name || '').toLowerCase().includes(q);
        const matchesEmp = (item.employee?.name || '').toLowerCase().includes(q);
        const matchesOff = (item.office?.name || '').toLowerCase().includes(q);
        const matchesNotes = (item.notes || '').toLowerCase().includes(q);
        if (!matchesPayee && !matchesRef && !matchesCat && !matchesEmp && !matchesOff && !matchesNotes) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (String(item.category?.id) !== categoryFilter && String(item.category?.documentId) !== categoryFilter) {
          return false;
        }
      }

      // Allocation filter
      if (allocationFilter !== 'all') {
        if (item.allocation_type !== allocationFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      }

      // Date filter
      if (dateFilter !== 'all' && item.expense_date) {
        const itemDate = new Date(item.expense_date);
        const now = new Date();

        if (dateFilter === 'today') {
          const isToday =
            itemDate.getFullYear() === now.getFullYear() &&
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getDate() === now.getDate();
          if (!isToday) return false;
        } else if (dateFilter === 'this_week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          if (itemDate < startOfWeek) return false;
        } else if (dateFilter === 'this_month') {
          const isThisMonth =
            itemDate.getFullYear() === now.getFullYear() &&
            itemDate.getMonth() === now.getMonth();
          if (!isThisMonth) return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, categoryFilter, allocationFilter, statusFilter, dateFilter]);

  // Summary KPIs Calculation
  const kpis = React.useMemo(() => {
    const now = new Date();
    let totalThisMonth = 0;
    let totalToday = 0;
    const catTotals: Record<string, number> = {};

    expenses.forEach(item => {
      if (item.status === 'Cancelled') return;
      const amt = Number(item.amount) || 0;
      const d = item.expense_date ? new Date(item.expense_date) : null;

      if (d) {
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          totalThisMonth += amt;
        }
        if (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        ) {
          totalToday += amt;
        }
      }

      const catName = item.category?.name || 'Uncategorized';
      catTotals[catName] = (catTotals[catName] || 0) + amt;
    });

    let topCategory = 'None';
    let topCategoryAmount = 0;
    Object.entries(catTotals).forEach(([name, val]) => {
      if (val > topCategoryAmount) {
        topCategoryAmount = val;
        topCategory = name;
      }
    });

    return {
      totalThisMonth,
      totalToday,
      topCategory,
      topCategoryAmount,
      totalCount: expenses.length,
    };
  }, [expenses]);

  if (!isCourierAdmin) {
    return null;
  }

  return (
    <PortalLayout>
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[110] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-red-950 text-red-200 border-red-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">payments</span>
              Expense Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Log, track, and categorize operational expenditures across courier offices and employees.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCategoryFormData({ name: '', description: '' });
                setIsCategoryModalOpen(true);
              }}
              className="px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">category</span>
              New Category
            </button>

            <button
              onClick={() => handleOpenExpenseModal()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-2 shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Expense
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Month Total */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month's Spend</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                PKR {kpis.totalThisMonth.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Active paid & pending expenses</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">calendar_month</span>
            </div>
          </div>

          {/* Today Total */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Spend</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                PKR {kpis.totalToday.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Disbursements logged today</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">today</span>
            </div>
          </div>

          {/* Top Category */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Spend Category</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[150px]">
                {kpis.topCategory}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                PKR {kpis.topCategoryAmount.toLocaleString()} total
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">pie_chart</span>
            </div>
          </div>

          {/* Total Transactions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Records</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {kpis.totalCount}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{categories.length} active categories</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">receipt_long</span>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search payee, ref, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={String(cat.documentId || cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Allocation Filter */}
            <div>
              <select
                value={allocationFilter}
                onChange={e => setAllocationFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Allocations</option>
                <option value="Office">Offices & Hubs</option>
                <option value="Employee">Staff & Employees</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Data Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Date & Category</th>
                  <th className="px-5 py-3.5">Allocation (Office / Staff)</th>
                  <th className="px-5 py-3.5">Payee & Method</th>
                  <th className="px-5 py-3.5">Reference #</th>
                  <th className="px-5 py-3.5">Amount (PKR)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                        <span>Loading expense records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-600 block">
                        receipt_long
                      </span>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No expenses found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try changing your filters or record a new expense.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(item => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date & Category */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[14px]">label</span>
                            {item.category?.name || 'Uncategorized'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {item.expense_date}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 line-clamp-1">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Allocation (Office or Employee) */}
                      <td className="px-5 py-4 text-xs">
                        {item.allocation_type === 'Employee' && item.employee ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
                            <span className="material-symbols-outlined text-[16px] text-primary">badge</span>
                            {item.employee.label}
                          </span>
                        ) : item.office ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
                            <span className="material-symbols-outlined text-[16px] text-amber-600">domain</span>
                            {item.office.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 italic">
                            <span className="material-symbols-outlined text-[15px]">domain</span>
                            Head Office / General
                          </span>
                        )}
                      </td>

                      {/* Payee & Method */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.payee || '—'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.payment_method}
                        </div>
                      </td>

                      {/* Reference # */}
                      <td className="px-5 py-4 text-xs">
                        {item.reference_no ? (
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                            {item.reference_no}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          PKR {Number(item.amount).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                            item.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : item.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenExpenseModal(item)}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingExpense(item)}
                            title="Delete Expense"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
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

      {/* ==================== CREATE / EDIT EXPENSE MODAL ==================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            style={{ width: '100%', maxWidth: '680px' }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {editingExpense ? 'edit_note' : 'add_circle'}
                </span>
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h2>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expense Category with Add Button */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Expense Category <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFormData({ name: '', description: '' });
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add Category
                    </button>
                  </div>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  >
                    <option value="" disabled>
                      Select an expense category...
                    </option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.documentId || cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Allocation Type Radio Buttons: Office vs Employee */}
                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Expense Allocation <span className="text-red-500">*</span>
                  </span>

                  <div className="flex items-center gap-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="allocation_type"
                        value="Office"
                        checked={formData.allocation_type === 'Office'}
                        onChange={() => setFormData(prev => ({ ...prev, allocation_type: 'Office' }))}
                        className="w-4 h-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px] text-amber-600">domain</span>
                        Office
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="allocation_type"
                        value="Employee"
                        checked={formData.allocation_type === 'Employee'}
                        onChange={() => setFormData(prev => ({ ...prev, allocation_type: 'Employee' }))}
                        className="w-4 h-4 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px] text-primary">badge</span>
                        Employee
                      </span>
                    </label>
                  </div>

                  {/* Office Dropdown (shown when Office is selected) */}
                  {formData.allocation_type === 'Office' && (
                    <div className="pt-1 animate-in fade-in duration-150">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Select Office / Hub
                      </label>
                      <select
                        value={formData.officeId}
                        onChange={e => setFormData(prev => ({ ...prev, officeId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                      >
                        <option value="">Head Office / General</option>
                        {offices.map(off => (
                          <option key={off.id} value={off.documentId || off.id}>
                            {off.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Employee Dropdown (shown when Employee is selected) */}
                  {formData.allocation_type === 'Employee' && (
                    <div className="pt-1 animate-in fade-in duration-150">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Select Employee <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.employeeId}
                        onChange={e => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                      >
                        <option value="" disabled>
                          Select an employee...
                        </option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Amount (PKR) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden font-semibold"
                  />
                </div>

                {/* Expense Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={e => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online / Card">Online / Card</option>
                    <option value="Mobile Wallet">Mobile Wallet (Easypaisa/JazzCash)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payee / Vendor */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Payee / Vendor <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PSO Petrol Pump, Stationery Mart"
                    value={formData.payee}
                    onChange={e => setFormData(prev => ({ ...prev, payee: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Voucher / Reference # <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Voucher #1024, Bill #4928"
                    value={formData.reference_no}
                    onChange={e => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  />
                </div>

                {/* Notes / Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Notes & Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional context or breakdown..."
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingExpense && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  )}
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== QUICK ADD CATEGORY MODAL ==================== */}
      {/* High z-index (z-[100]) and explicit width style to completely prevent collapse */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            style={{ width: '100%', maxWidth: '480px', minWidth: '320px' }}
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">category</span>
                Add New Expense Category
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Software Subscriptions"
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this expense type..."
                  value={categoryFormData.description}
                  onChange={e => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingCategory && (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  )}
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            style={{ width: '100%', maxWidth: '400px' }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">delete</span>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Expense Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this expense for{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  "{deletingExpense.category?.name || 'Expense'}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting && (
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

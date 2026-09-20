'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Package, 
  Truck, 
  Fuel, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  CreditCard, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  Plus,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Clock,
  Briefcase
} from 'lucide-react';

interface ExpenseItem {
  id: number | string;
  documentId?: string;
  title?: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  payee?: string;
  reference_no?: string;
  notes?: string;
  status: 'Paid' | 'Pending' | 'Cancelled';
  allocation_type: 'Office' | 'Employee';
  category?: { id: number | string; name: string } | null;
  office?: { id: number | string; name: string; city?: any } | null;
  employee?: { id: number | string; username?: string; fullName?: string } | null;
}

interface HubMetric {
  id: string | number;
  name: string;
  city: string;
  totalExpenses: number;
  parcelCount: number;
  totalRevenue: number;
  costPerParcel: number;
  operatingMarginPct: number;
}

export default function ExecutiveExpenseReportPage() {
  const { user } = useAuth();
  
  // Data State
  const [expenses, setExpenses] = React.useState<ExpenseItem[]>([]);
  const [parcels, setParcels] = React.useState<any[]>([]);
  const [offices, setOffices] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter Controls
  const [dateRangePreset, setDateRangePreset] = React.useState<'today' | '7days' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('mtd');
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  const [selectedHub, setSelectedHub] = React.useState<string>('all');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Tab View
  const [activeTab, setActiveTab] = React.useState<'overview' | 'hubs' | 'breakdown' | 'audit'>('overview');

  // Load All Relevant Data (Tenant Isolated)
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

      // 1. Fetch Expenses
      const expRes = await apiClient.get('/expenses?populate=*&pagination[limit]=500&sort[0]=expense_date:desc');
      let expList: ExpenseItem[] = expRes.data?.data || [];

      // 2. Fetch Parcels for revenue & unit economics calculation
      const pRes = await apiClient.get('/parcels?populate=*&pagination[limit]=1000&sort[0]=createdAt:desc');
      let parcelList: any[] = pRes.data?.data || [];

      // 3. Fetch Offices
      const offRes = await apiClient.get('/offices?populate=*&pagination[limit]=100');
      let officeList: any[] = offRes.data?.data || [];

      // 4. Fetch Categories
      const catRes = await apiClient.get('/expense-categories?pagination[limit]=100');
      let catList: any[] = catRes.data?.data || [];

      // Tenant isolation filter
      if (tenantId) {
        expList = expList.filter((e: any) => {
          const tId = e.tenant?.id || e.tenant?.data?.id || e.tenant;
          return !tId || Number(tId) === Number(tenantId);
        });

        parcelList = parcelList.filter((p: any) => {
          const tId = p.origin_office?.tenant?.id || p.shipper?.tenant?.id || p.tenant?.id;
          return !tId || Number(tId) === Number(tenantId);
        });

        officeList = officeList.filter((o: any) => {
          const tId = o.tenant?.id || o.tenant?.data?.id || o.tenant;
          return !tId || Number(tId) === Number(tenantId);
        });
      }

      setExpenses(expList);
      setParcels(parcelList);
      setOffices(officeList);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to load expense report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute Date Boundaries based on selected preset
  const dateBoundaries = React.useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateRangePreset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (dateRangePreset === '7days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 7);
      return { start: past.toISOString().split('T')[0], end: todayStr };
    }
    if (dateRangePreset === 'mtd') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    if (dateRangePreset === 'qtd') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    if (dateRangePreset === 'ytd') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: '1970-01-01', end: '2099-12-31' };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Filtered Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      // Date filter
      const expDate = e.expense_date ? e.expense_date.split('T')[0] : '';
      if (dateBoundaries.start && expDate < dateBoundaries.start) return false;
      if (dateBoundaries.end && expDate > dateBoundaries.end) return false;

      // Hub / Office filter
      if (selectedHub !== 'all') {
        const offId = e.office?.id || (typeof e.office === 'number' ? e.office : null);
        if (String(offId) !== String(selectedHub)) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const catName = e.category?.name || (typeof e.category === 'string' ? e.category : '');
        if (catName.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (e.status !== selectedStatus) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (e.title || '').toLowerCase();
        const payee = (e.payee || '').toLowerCase();
        const cat = (e.category?.name || '').toLowerCase();
        const ref = (e.reference_no || '').toLowerCase();
        if (!title.includes(q) && !payee.includes(q) && !cat.includes(q) && !ref.includes(q)) return false;
      }

      return true;
    });
  }, [expenses, dateBoundaries, selectedHub, selectedCategory, selectedStatus, searchQuery]);

  // Filtered Parcels for period metrics
  const filteredParcels = React.useMemo(() => {
    return parcels.filter(p => {
      const pDate = p.createdAt ? p.createdAt.split('T')[0] : '';
      if (dateBoundaries.start && pDate < dateBoundaries.start) return false;
      if (dateBoundaries.end && pDate > dateBoundaries.end) return false;

      if (selectedHub !== 'all') {
        const oId = p.origin_office?.id || p.destination_office?.id;
        if (String(oId) !== String(selectedHub)) return false;
      }

      return true;
    });
  }, [parcels, dateBoundaries, selectedHub]);

  // High-Level Financial Calculations
  const metrics = React.useMemo(() => {
    const totalOpEx = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const paidOpEx = filteredExpenses.filter(e => e.status === 'Paid').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const pendingOpEx = filteredExpenses.filter(e => e.status === 'Pending').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const totalShipments = filteredParcels.length;
    const deliveredShipments = filteredParcels.filter(p => {
      const st = (p.status || '').toLowerCase();
      return st.includes('delivered') && !st.includes('undelivered');
    }).length;

    // Delivery Service Revenue
    const courierRevenue = filteredParcels.reduce((acc, p) => acc + (Number(p.delivery_charges) || 250), 0);

    // Cost Per Shipment (CPS)
    const costPerShipment = totalShipments > 0 ? Math.round(totalOpEx / totalShipments) : 0;
    const costPerDelivered = deliveredShipments > 0 ? Math.round(totalOpEx / deliveredShipments) : costPerShipment;

    // Expense-to-Revenue Ratio (%)
    const expenseToRevenueRatio = courierRevenue > 0 ? Math.min(Math.round((totalOpEx / courierRevenue) * 100), 999) : 0;

    // Net Operating Profit / Loss
    const netOperatingProfit = courierRevenue - totalOpEx;
    const profitMarginPct = courierRevenue > 0 ? Math.round((netOperatingProfit / courierRevenue) * 100) : 0;

    return {
      totalOpEx,
      paidOpEx,
      pendingOpEx,
      totalShipments,
      deliveredShipments,
      courierRevenue,
      costPerShipment,
      costPerDelivered,
      expenseToRevenueRatio,
      netOperatingProfit,
      profitMarginPct,
    };
  }, [filteredExpenses, filteredParcels]);

  // Category Distribution Aggregation
  const categoryStats = React.useMemo(() => {
    const map: { [key: string]: { count: number; total: number; color: string } } = {};
    const defaultColors = [
      '#4f46e5', // indigo
      '#0284c7', // sky
      '#059669', // emerald
      '#d97706', // amber
      '#e11d48', // rose
      '#7c3aed', // violet
      '#ea580c', // orange
      '#64748b', // slate
    ];

    filteredExpenses.forEach(e => {
      const catName = e.category?.name || e.title || 'Uncategorized';
      if (!map[catName]) {
        const colorIdx = Object.keys(map).length % defaultColors.length;
        map[catName] = { count: 0, total: 0, color: defaultColors[colorIdx] };
      }
      map[catName].count += 1;
      map[catName].total += Number(e.amount) || 0;
    });

    const list = Object.entries(map).map(([name, data]) => ({
      name,
      count: data.count,
      total: data.total,
      percentage: metrics.totalOpEx > 0 ? ((data.total / metrics.totalOpEx) * 100).toFixed(1) : '0',
      color: data.color
    }));

    return list.sort((a, b) => b.total - a.total);
  }, [filteredExpenses, metrics.totalOpEx]);

  // Payment Method Breakdown
  const paymentMethodStats = React.useMemo(() => {
    const map: { [key: string]: number } = {};
    filteredExpenses.forEach(e => {
      const pm = e.payment_method || 'Cash';
      map[pm] = (map[pm] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).map(([method, amount]) => ({
      method,
      amount,
      percentage: metrics.totalOpEx > 0 ? Math.round((amount / metrics.totalOpEx) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, metrics.totalOpEx]);

  // Hub Performance Matrix
  const hubMetrics: HubMetric[] = React.useMemo(() => {
    return offices.map(office => {
      const offId = office.id;
      const offExpenses = filteredExpenses
        .filter(e => {
          const eOffId = e.office?.id || (typeof e.office === 'number' ? e.office : null);
          return String(eOffId) === String(offId);
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const offParcels = filteredParcels.filter(p => {
        const origId = p.origin_office?.id;
        const destId = p.destination_office?.id;
        return String(origId) === String(offId) || String(destId) === String(offId);
      });

      const parcelCount = offParcels.length;
      const totalRevenue = offParcels.reduce((sum, p) => sum + (Number(p.delivery_charges) || 250), 0);
      const costPerParcel = parcelCount > 0 ? Math.round(offExpenses / parcelCount) : offExpenses;
      const operatingMarginPct = totalRevenue > 0 ? Math.round(((totalRevenue - offExpenses) / totalRevenue) * 100) : (offExpenses > 0 ? -100 : 0);

      const cityName = office.city?.CityName || office.city?.name || (typeof office.city === 'string' ? office.city : 'Hub');

      return {
        id: offId,
        name: office.name || `Office #${offId}`,
        city: cityName,
        totalExpenses: offExpenses,
        parcelCount,
        totalRevenue,
        costPerParcel,
        operatingMarginPct
      };
    }).sort((a, b) => b.totalExpenses - a.totalExpenses);
  }, [offices, filteredExpenses, filteredParcels]);

  // Export CSV Data
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense data available to export for this period.');
      return;
    }

    const headers = ['Expense ID', 'Date', 'Title / Payee', 'Category', 'Hub / Office', 'Allocated To', 'Payment Method', 'Status', 'Reference #', 'Amount (PKR)', 'Notes'];
    
    const rows = filteredExpenses.map(e => [
      e.id,
      e.expense_date ? e.expense_date.split('T')[0] : '',
      `"${(e.title || e.payee || 'Expense').replace(/"/g, '""')}"`,
      `"${(e.category?.name || 'Uncategorized').replace(/"/g, '""')}"`,
      `"${(e.office?.name || 'General HQ').replace(/"/g, '""')}"`,
      e.allocation_type,
      e.payment_method,
      e.status,
      `"${(e.reference_no || '-').replace(/"/g, '""')}"`,
      Number(e.amount) || 0,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Executive_Expense_Report_${dateBoundaries.start}_to_${dateBoundaries.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-24 font-sans print:p-0 print:m-0">
        
        {/* Executive Header Banner */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-slate-800 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                C-Level & Executive Intelligence
              </span>
              <span className="text-slate-400 text-xs font-semibold">• Live Financial Audit</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-primary" /> Executive Expense & OpEx Report
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-2xl">
              Strategic cost oversight, unit economics, hub profitability matrices, and cash outflow reconciliation across all courier operations.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="bg-primary hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" /> Print Board Report
            </button>
          </div>
        </div>

        {/* Print-Only Header (for Board Meetings) */}
        <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Executive Operational Expense Report</h1>
              <p className="text-xs text-slate-600">DBARc Express Courier Operations • Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-900">Period: {dateBoundaries.start} to {dateBoundaries.end}</span>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Date Range Presets */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDateRangePreset('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRangePreset === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('7days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRangePreset === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('mtd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRangePreset === 'mtd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month to Date (MTD)
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('qtd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRangePreset === 'qtd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quarter to Date (QTD)
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('ytd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRangePreset === 'ytd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Year to Date (YTD)
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRangePreset === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Dates (if active) */}
            {dateRangePreset === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 outline-none"
                />
              </div>
            )}
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Hub Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Filter by Hub / Facility
              </label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Hubs & Stations ({offices.length})</option>
                {offices.map(o => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name || `Office #${o.id}`} ({o.city?.CityName || o.city?.name || 'Hub'})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Expense Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Expense Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Payment Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Statuses (Paid & Pending)</option>
                <option value="Paid">Paid / Settled Only</option>
                <option value="Pending">Pending / Unsettled Only</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" /> Search Payee or Ref #
              </label>
              <input
                type="text"
                placeholder="Search description, payee, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* EXECUTIVE KPI SCORECARDS (5 KEY METRICS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Total OpEx */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total OpEx</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                PKR {metrics.totalOpEx.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">PKR {metrics.paidOpEx.toLocaleString()} Paid</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">PKR {metrics.pendingOpEx.toLocaleString()} Pending</span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-primary w-full absolute bottom-0 left-0" />
          </div>

          {/* Card 2: Cost Per Shipment (Unit Economics) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Cost Per Parcel (CPS)</span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                PKR {metrics.costPerShipment.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ parcel</span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                Across {metrics.totalShipments.toLocaleString()} shipments ({metrics.deliveredShipments} delivered)
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-sky-400 to-blue-600 w-full absolute bottom-0 left-0" />
          </div>

          {/* Card 3: Expense to Revenue Ratio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">OpEx to Revenue %</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {metrics.expenseToRevenueRatio}%
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  metrics.expenseToRevenueRatio <= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {metrics.expenseToRevenueRatio <= 50 ? 'Healthy' : 'Monitor'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                Total Revenue: PKR {metrics.courierRevenue.toLocaleString()}
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500 w-full absolute bottom-0 left-0" />
          </div>

          {/* Card 4: Net Operating Margin */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Net Operating Margin</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-black tracking-tight ${metrics.netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                PKR {metrics.netOperatingProfit.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                <span>Net Margin: <strong>{metrics.profitMarginPct}%</strong></span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-600 w-full absolute bottom-0 left-0" />
          </div>

          {/* Card 5: Top Cost Driver */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Primary Cost Driver</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Fuel className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-base font-black text-slate-900 tracking-tight truncate">
                {categoryStats[0]?.name || 'None'}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                PKR {(categoryStats[0]?.total || 0).toLocaleString()} ({categoryStats[0]?.percentage || 0}% of OpEx)
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-rose-400 to-red-600 w-full absolute bottom-0 left-0" />
          </div>

        </div>

        {/* Navigation Tabs for In-depth Views */}
        <div className="flex items-center gap-2 border-b border-slate-200 pt-2 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-primary text-primary bg-primary-50/50 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PieChartIcon className="w-4 h-4" /> Category & Outflow Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hubs')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hubs'
                ? 'border-primary text-primary bg-primary-50/50 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" /> Hub Profitability Matrix ({offices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-primary text-primary bg-primary-50/50 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" /> Detailed Expense Audit Log ({filteredExpenses.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & COST DISTRIBUTION */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Category Breakdown with Visual Progress Bars */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" /> Operational Cost Breakdown by Category
                  </h3>
                  <p className="text-xs text-slate-500">Distribution of operational spending across departments and cost centers</p>
                </div>
                <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                  {categoryStats.length} Active Categories
                </span>
              </div>

              {categoryStats.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  No expense records found for the selected period and filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map((cat, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">({cat.count} records)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 font-mono">PKR {cat.total.toLocaleString()}</span>
                          <span className="text-xs font-extrabold text-slate-500 w-12 text-right">{cat.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(Number(cat.percentage), 2)}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Executive Summary Callout */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900">Executive Cost Optimization Insight:</div>
                  <p className="text-slate-600 leading-relaxed">
                    {categoryStats.length > 0
                      ? `Your highest expenditure category is "${categoryStats[0].name}", accounting for ${categoryStats[0].percentage}% (PKR ${categoryStats[0].total.toLocaleString()}) of total operational expenses. Maintaining strict fleet fueling logs or consolidating vendor supplies could yield an estimated 5-12% monthly savings.`
                      : 'No significant spending anomalies detected for this timeframe.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Payment Methods & Allocation Mix */}
            <div className="space-y-6">
              
              {/* Payment Methods Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" /> Payment & Cash Outflows
                  </h3>
                </div>

                <div className="space-y-3">
                  {paymentMethodStats.map((pm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{pm.method}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{pm.percentage}% of disbursements</div>
                      </div>
                      <div className="text-right font-bold text-slate-900 font-mono">
                        PKR {pm.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allocation Mix Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" /> Overhead vs Field Allowances
                  </h3>
                </div>

                {(() => {
                  const officeExp = filteredExpenses.filter(e => e.allocation_type === 'Office').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const staffExp = filteredExpenses.filter(e => e.allocation_type === 'Employee').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const total = officeExp + staffExp || 1;
                  const offPct = Math.round((officeExp / total) * 100);
                  const stfPct = Math.round((staffExp / total) * 100);

                  return (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-indigo-900">Facility & Hub Overheads</div>
                          <div className="text-[10px] text-indigo-600">Rent, utilities, stationary, fixed costs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-indigo-950">PKR {officeExp.toLocaleString()}</div>
                          <div className="text-[10px] font-bold text-indigo-700">{offPct}%</div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-amber-900">Rider / Field Allowances</div>
                          <div className="text-[10px] text-amber-600">Daily fuel, per-diem, mileage incentives</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-amber-950">PKR {staffExp.toLocaleString()}</div>
                          <div className="text-[10px] font-bold text-amber-700">{stfPct}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: HUB PROFITABILITY MATRIX */}
        {activeTab === 'hubs' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" /> Hub & Branch Financial Efficiency Matrix
                </h3>
                <p className="text-xs text-slate-400">Comparing shipment volumes, courier revenue, operational expenses, and profit margins per hub</p>
              </div>
              <span className="text-xs font-extrabold text-amber-400">
                Target CPS: &lt; PKR 350 / parcel
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Facility / Hub Name</th>
                    <th className="p-4">Location</th>
                    <th className="p-4 text-center">Processed Parcels</th>
                    <th className="p-4 text-right">Revenue Generated</th>
                    <th className="p-4 text-right">OpEx Incurred</th>
                    <th className="p-4 text-center">Cost Per Parcel (CPS)</th>
                    <th className="p-4 text-right">Hub Margin %</th>
                    <th className="p-4 text-center">Financial Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {hubMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">No hub data available.</td>
                    </tr>
                  ) : (
                    hubMetrics.map((hub) => {
                      const isProfitable = hub.operatingMarginPct > 0;
                      return (
                        <tr key={hub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span>{hub.name}</span>
                          </td>
                          <td className="p-4 text-slate-600">{hub.city}</td>
                          <td className="p-4 text-center font-bold text-slate-800 font-mono">{hub.parcelCount.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-emerald-600 font-mono">PKR {hub.totalRevenue.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-slate-900 font-mono">PKR {hub.totalExpenses.toLocaleString()}</td>
                          <td className="p-4 text-center font-bold text-slate-900 font-mono">PKR {hub.costPerParcel.toLocaleString()}</td>
                          <td className={`p-4 text-right font-black font-mono ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {hub.operatingMarginPct > 0 ? `+${hub.operatingMarginPct}%` : `${hub.operatingMarginPct}%`}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              hub.operatingMarginPct >= 20
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : hub.operatingMarginPct >= 0
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {hub.operatingMarginPct >= 20 ? 'High Margin' : hub.operatingMarginPct >= 0 ? 'Balanced' : 'Cost Heavy'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DETAILED AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-400" /> Detailed Operational Expense Journal
                </h3>
                <p className="text-xs text-slate-400">Complete transaction log matching date and hub parameters</p>
              </div>
              <span className="text-xs font-bold text-slate-300">
                Showing {filteredExpenses.length} transactions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Title / Payee</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Facility / Hub</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Reference #</th>
                    <th className="p-4 text-right">Amount (PKR)</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        No expenses match your active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-600 font-mono">
                          {exp.expense_date ? exp.expense_date.split('T')[0] : '-'}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          <div>{exp.title || exp.payee || 'Expense Item'}</div>
                          {exp.payee && exp.title && (
                            <div className="text-[10px] text-slate-400 font-normal">Payee: {exp.payee}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-block bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg text-[11px] font-bold">
                            {exp.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-700">
                          {exp.office?.name || 'Central Head Office'}
                        </td>
                        <td className="p-4 text-slate-600 font-mono">{exp.payment_method}</td>
                        <td className="p-4 text-slate-500 font-mono text-[11px]">{exp.reference_no || '-'}</td>
                        <td className="p-4 text-right font-black text-slate-900 font-mono text-sm">
                          PKR {Number(exp.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            exp.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : exp.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {exp.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

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
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Clock,
  Briefcase,
  Percent,
  Receipt,
  Scale,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  PlusCircle
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
}

interface HubProfitMetric {
  id: string | number;
  name: string;
  city: string;
  parcelCount: number;
  deliveredCount: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  marginPct: number;
}

export default function ProfitLossReportPage() {
  const { user } = useAuth();

  // Data States
  const [expenses, setExpenses] = React.useState<ExpenseItem[]>([]);
  const [parcels, setParcels] = React.useState<any[]>([]);
  const [offices, setOffices] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter Controls
  const [dateRangePreset, setDateRangePreset] = React.useState<'today' | '7days' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('mtd');
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  const [selectedHub, setSelectedHub] = React.useState<string>('all');

  // Tab View
  const [activeTab, setActiveTab] = React.useState<'statement' | 'visuals' | 'hubs'>('statement');

  // Load Financial Data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null) || storedUser?.tenant?.id || storedUser?.tenant;

      // 1. Expenses
      const expRes = await apiClient.get('/expenses?populate=*&pagination[limit]=500&sort[0]=expense_date:desc');
      let expList: ExpenseItem[] = expRes.data?.data || [];

      // 2. Parcels
      const pRes = await apiClient.get('/parcels?populate=*&pagination[limit]=1000&sort[0]=createdAt:desc');
      let parcelList: any[] = pRes.data?.data || [];

      // 3. Offices
      const offRes = await apiClient.get('/offices?populate=*&pagination[limit]=100');
      let officeList: any[] = offRes.data?.data || [];

      // Tenant isolation
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
    } catch (err) {
      console.error('Failed to load P&L data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute Date Boundaries
  const dateBoundaries = React.useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateRangePreset === 'today') {
      return { start: todayStr, end: todayStr, label: 'Today' };
    }
    if (dateRangePreset === '7days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 7);
      return { start: past.toISOString().split('T')[0], end: todayStr, label: 'Last 7 Days' };
    }
    if (dateRangePreset === 'mtd') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr, label: 'Month to Date (MTD)' };
    }
    if (dateRangePreset === 'qtd') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr, label: 'Quarter to Date (QTD)' };
    }
    if (dateRangePreset === 'ytd') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr, label: 'Year to Date (YTD)' };
    }
    if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate, label: 'Custom Range' };
    }
    return { start: '1970-01-01', end: '2099-12-31', label: 'All Time' };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Filtered Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      const expDate = e.expense_date ? e.expense_date.split('T')[0] : '';
      if (dateBoundaries.start && expDate < dateBoundaries.start) return false;
      if (dateBoundaries.end && expDate > dateBoundaries.end) return false;

      if (selectedHub !== 'all') {
        const offId = e.office?.id || (typeof e.office === 'number' ? e.office : null);
        if (String(offId) !== String(selectedHub)) return false;
      }

      // Ignore cancelled expenses
      if (e.status === 'Cancelled') return false;

      return true;
    });
  }, [expenses, dateBoundaries, selectedHub]);

  // Filtered Parcels for Income
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

  // Financial Calculations & Statement Breakdown
  const financialData = React.useMemo(() => {
    // 1. REVENUE (INCOME) BREAKDOWN
    let standardFreightRevenue = 0;
    let expressPremiumRevenue = 0;
    let codHandlingCommission = 0;
    let flyerPackagingSales = 0;

    filteredParcels.forEach(p => {
      const deliveryFee = Number(p.delivery_charges) || 250;
      const isExpress = (p.service_type || '').toLowerCase().includes('overnight') || (p.service_type || '').toLowerCase().includes('express');
      
      if (isExpress) {
        expressPremiumRevenue += Math.round(deliveryFee * 0.3); // 30% premium portion
        standardFreightRevenue += Math.round(deliveryFee * 0.7);
      } else {
        standardFreightRevenue += deliveryFee;
      }

      // COD handling fee (1.5% of COD amount or min 50 for COD parcels)
      const codAmt = Number(p.cod_amount) || 0;
      if (codAmt > 0) {
        codHandlingCommission += Math.round(Math.max(codAmt * 0.015, 30));
      }
    });

    // Estimation for flyer/packaging sales (based on parcel volume)
    flyerPackagingSales = filteredParcels.length * 20;

    const totalGrossRevenue = standardFreightRevenue + expressPremiumRevenue + codHandlingCommission + flyerPackagingSales;

    // 2. DIRECT DELIVERY COSTS (COGS)
    let fuelAndTravelCosts = 0;
    let riderCommissions = 0;
    let packagingDirectCosts = 0;
    let tplOutsourceCharges = 0;

    // 3. OPERATING OVERHEAD (OPEX)
    let facilityRentUtilities = 0;
    let officeStaffSalaries = 0;
    let vehicleMaintenance = 0;
    let marketingAndTech = 0;
    let miscellaneousOverhead = 0;

    filteredExpenses.forEach(e => {
      const catName = (e.category?.name || e.title || '').toLowerCase();
      const amt = Number(e.amount) || 0;

      if (catName.includes('fuel') || catName.includes('travel') || catName.includes('diesel')) {
        fuelAndTravelCosts += amt;
      } else if (catName.includes('rider') || catName.includes('allowance') || catName.includes('advance') || e.allocation_type === 'Employee') {
        riderCommissions += amt;
      } else if (catName.includes('packag') || catName.includes('suppl') || catName.includes('flyer')) {
        packagingDirectCosts += amt;
      } else if (catName.includes('3pl') || catName.includes('outsource') || catName.includes('cargo')) {
        tplOutsourceCharges += amt;
      } else if (catName.includes('rent') || catName.includes('utilit') || catName.includes('electric') || catName.includes('water')) {
        facilityRentUtilities += amt;
      } else if (catName.includes('staff') || catName.includes('salar') || catName.includes('payroll')) {
        officeStaffSalaries += amt;
      } else if (catName.includes('maint') || catName.includes('repair') || catName.includes('vehicle')) {
        vehicleMaintenance += amt;
      } else if (catName.includes('market') || catName.includes('soft') || catName.includes('tech') || catName.includes('sms')) {
        marketingAndTech += amt;
      } else {
        miscellaneousOverhead += amt;
      }
    });

    const totalDirectCosts = fuelAndTravelCosts + riderCommissions + packagingDirectCosts + tplOutsourceCharges;
    const grossProfit = totalGrossRevenue - totalDirectCosts;
    const grossMarginPct = totalGrossRevenue > 0 ? Math.round((grossProfit / totalGrossRevenue) * 100) : 0;

    const totalOpEx = facilityRentUtilities + officeStaffSalaries + vehicleMaintenance + marketingAndTech + miscellaneousOverhead;
    const totalAllExpenses = totalDirectCosts + totalOpEx;

    // NET PROFIT / LOSS
    const netProfitOrLoss = totalGrossRevenue - totalAllExpenses;
    const netProfitMarginPct = totalGrossRevenue > 0 ? Math.round((netProfitOrLoss / totalGrossRevenue) * 100) : 0;

    return {
      // Income
      standardFreightRevenue,
      expressPremiumRevenue,
      codHandlingCommission,
      flyerPackagingSales,
      totalGrossRevenue,

      // Direct Costs (COGS)
      fuelAndTravelCosts,
      riderCommissions,
      packagingDirectCosts,
      tplOutsourceCharges,
      totalDirectCosts,

      // Gross
      grossProfit,
      grossMarginPct,

      // OpEx Overheads
      facilityRentUtilities,
      officeStaffSalaries,
      vehicleMaintenance,
      marketingAndTech,
      miscellaneousOverhead,
      totalOpEx,

      // Bottom-Line
      totalAllExpenses,
      netProfitOrLoss,
      netProfitMarginPct,
      isProfit: netProfitOrLoss >= 0,
      totalShipments: filteredParcels.length
    };
  }, [filteredParcels, filteredExpenses]);

  // Hub Profitability Matrix
  const hubMetrics: HubProfitMetric[] = React.useMemo(() => {
    return offices.map(office => {
      const offId = office.id;

      // Expenses for this office
      const offExpenses = filteredExpenses
        .filter(e => {
          const eOffId = e.office?.id || (typeof e.office === 'number' ? e.office : null);
          return String(eOffId) === String(offId);
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Parcels for this office
      const offParcels = filteredParcels.filter(p => {
        const origId = p.origin_office?.id;
        const destId = p.destination_office?.id;
        return String(origId) === String(offId) || String(destId) === String(offId);
      });

      const parcelCount = offParcels.length;
      const deliveredCount = offParcels.filter(p => (p.status || '').toLowerCase().includes('delivered')).length;
      
      const totalIncome = offParcels.reduce((sum, p) => sum + (Number(p.delivery_charges) || 250), 0) + (parcelCount * 40);
      const netProfit = totalIncome - offExpenses;
      const marginPct = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : (offExpenses > 0 ? -100 : 0);

      const cityName = office.city?.CityName || office.city?.name || (typeof office.city === 'string' ? office.city : 'Hub');

      return {
        id: offId,
        name: office.name || `Office #${offId}`,
        city: cityName,
        parcelCount,
        deliveredCount,
        totalIncome,
        totalExpenses: offExpenses,
        netProfit,
        marginPct
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }, [offices, filteredExpenses, filteredParcels]);

  // Export CSV Statement
  const handleExportCSV = () => {
    const lines = [
      ['PROFIT & LOSS STATEMENT (INCOME STATEMENT)'],
      ['Period', `${dateBoundaries.start} to ${dateBoundaries.end} (${dateBoundaries.label})`],
      ['Generated On', new Date().toLocaleString()],
      [''],
      ['SECTION / ACCOUNT LINE', 'AMOUNT (PKR)', 'REVENUE %'],
      ['--- OPERATING REVENUE (INCOME) ---'],
      ['Standard Courier Freight Charges', financialData.standardFreightRevenue, `${financialData.totalGrossRevenue > 0 ? ((financialData.standardFreightRevenue / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Express & Same-Day Service Premiums', financialData.expressPremiumRevenue, `${financialData.totalGrossRevenue > 0 ? ((financialData.expressPremiumRevenue / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Cash-on-Delivery (COD) Handling Fees', financialData.codHandlingCommission, `${financialData.totalGrossRevenue > 0 ? ((financialData.codHandlingCommission / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Flyer & Packaging Sales', financialData.flyerPackagingSales, `${financialData.totalGrossRevenue > 0 ? ((financialData.flyerPackagingSales / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['TOTAL OPERATING REVENUE (INCOME)', financialData.totalGrossRevenue, '100.0%'],
      [''],
      ['--- DIRECT DELIVERY COSTS (COGS) ---'],
      ['Fleet Fuel & Diesel Expenses', financialData.fuelAndTravelCosts, `${financialData.totalGrossRevenue > 0 ? ((financialData.fuelAndTravelCosts / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Rider Mileage & Field Allowances', financialData.riderCommissions, `${financialData.totalGrossRevenue > 0 ? ((financialData.riderCommissions / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Packaging Consumables Cost', financialData.packagingDirectCosts, `${financialData.totalGrossRevenue > 0 ? ((financialData.packagingDirectCosts / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['3PL Partner & Airline Cargo Charges', financialData.tplOutsourceCharges, `${financialData.totalGrossRevenue > 0 ? ((financialData.tplOutsourceCharges / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['TOTAL DIRECT DELIVERY COSTS (COGS)', financialData.totalDirectCosts, `${financialData.totalGrossRevenue > 0 ? ((financialData.totalDirectCosts / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      [''],
      ['GROSS PROFIT', financialData.grossProfit, `${financialData.grossMarginPct}%`],
      [''],
      ['--- OPERATING EXPENSES (OPEX) ---'],
      ['Hub & Facility Rents / Utilities', financialData.facilityRentUtilities, `${financialData.totalGrossRevenue > 0 ? ((financialData.facilityRentUtilities / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Staff Salaries, Overtime & Allowances', financialData.officeStaffSalaries, `${financialData.totalGrossRevenue > 0 ? ((financialData.officeStaffSalaries / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Vehicle Repairs & Fleet Maintenance', financialData.vehicleMaintenance, `${financialData.totalGrossRevenue > 0 ? ((financialData.vehicleMaintenance / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Marketing, SMS Gateways & Tech', financialData.marketingAndTech, `${financialData.totalGrossRevenue > 0 ? ((financialData.marketingAndTech / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['Miscellaneous & Admin Overhead', financialData.miscellaneousOverhead, `${financialData.totalGrossRevenue > 0 ? ((financialData.miscellaneousOverhead / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['TOTAL OPERATING EXPENSES (OPEX)', financialData.totalOpEx, `${financialData.totalGrossRevenue > 0 ? ((financialData.totalOpEx / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      [''],
      ['TOTAL ALL EXPENSES (COGS + OPEX)', financialData.totalAllExpenses, `${financialData.totalGrossRevenue > 0 ? ((financialData.totalAllExpenses / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%`],
      ['NET PROFIT / (LOSS)', financialData.netProfitOrLoss, `${financialData.netProfitMarginPct}%`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Profit_Loss_Statement_${dateBoundaries.start}_to_${dateBoundaries.end}.csv`);
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
                Official Financial Statement
              </span>
              <span className="text-slate-400 text-xs font-semibold">• Audited Income & Expense P&L</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Scale className="w-7 h-7 text-primary" /> Profit & Loss Statement (P&L Report)
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-2xl">
              Real-time calculation of operating income, direct delivery costs (COGS), facility overheads, gross margins, and bottom-line net profit.
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
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export P&L (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="bg-primary hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" /> Print Statement
            </button>
          </div>
        </div>

        {/* Print-Only Header */}
        <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Profit & Loss Statement (Income & Expense)</h1>
              <p className="text-xs text-slate-600">DBARc Express Courier Operations • Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-900">Period: {dateBoundaries.start} to {dateBoundaries.end}</span>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          {/* Date Presets */}
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
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRangePreset('mtd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRangePreset === 'mtd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MTD
            </button>
            <button
              type="button"
              onClick={() => setDateRangePreset('qtd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRangePreset === 'qtd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              QTD
            </button>
            <button
              type="button"
              onClick={() => setDateRangePreset('ytd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRangePreset === 'ytd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              YTD
            </button>
            <button
              type="button"
              onClick={() => setDateRangePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRangePreset === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Inputs */}
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

          {/* Hub Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[200px]"
            >
              <option value="all">All Hubs & Branches ({offices.length})</option>
              {offices.map(o => (
                <option key={o.id} value={String(o.id)}>
                  {o.name || `Office #${o.id}`} ({o.city?.CityName || o.city?.name || 'Hub'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 CORE EXECUTIVE FINANCIAL CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Gross Income */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Gross Income (Revenue)</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-emerald-600 tracking-tight font-mono">
                PKR {financialData.totalGrossRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                From {financialData.totalShipments.toLocaleString()} shipments & value-added services
              </div>
            </div>
            <div className="h-1 bg-emerald-500 w-full absolute bottom-0 left-0" />
          </div>

          {/* Card 2: Total Expenses (Direct + OpEx) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Expenses (COGS + OpEx)</span>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-rose-600 tracking-tight font-mono">
                PKR {financialData.totalAllExpenses.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-2">
                <span>Direct: <strong>PKR {financialData.totalDirectCosts.toLocaleString()}</strong></span>
                <span>•</span>
                <span>OpEx: <strong>PKR {financialData.totalOpEx.toLocaleString()}</strong></span>
              </div>
            </div>
            <div className="h-1 bg-rose-500 w-full absolute bottom-0 left-0" />
          </div>

          {/* Card 3: Net Profit / Loss */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                {financialData.isProfit ? 'Net Operating Profit' : 'Net Operating Loss'}
              </span>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                financialData.isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {financialData.isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-3xl font-black tracking-tight font-mono ${
                financialData.isProfit ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {financialData.isProfit ? '+' : ''}PKR {financialData.netProfitOrLoss.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                Income minus all operational outflows
              </div>
            </div>
            <div className={`h-1 w-full absolute bottom-0 left-0 ${financialData.isProfit ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          </div>

          {/* Card 4: Net Profit Margin % */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Net Profit Margin %</span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-3xl font-black tracking-tight font-mono ${
                financialData.netProfitMarginPct >= 0 ? 'text-indigo-600' : 'text-rose-600'
              }`}>
                {financialData.netProfitMarginPct}%
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                Gross Margin: <strong>{financialData.grossMarginPct}%</strong>
              </div>
            </div>
            <div className="h-1 bg-indigo-500 w-full absolute bottom-0 left-0" />
          </div>

        </div>

        {/* View Selection Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pt-2 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'statement'
                ? 'border-primary text-primary bg-primary-50/50 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Receipt className="w-4 h-4" /> Formal P&L Statement (Table)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visuals')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'visuals'
                ? 'border-primary text-primary bg-primary-50/50 rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Visual Breakdown & Margin Analysis
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
            <Building2 className="w-4 h-4" /> Hub Profit Contribution ({offices.length})
          </button>
        </div>

        {/* TAB 1: FORMAL P&L STATEMENT */}
        {activeTab === 'statement' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" /> Income Statement / Profit & Loss Breakdown
                </h2>
                <p className="text-xs text-slate-400">Statement period: {dateBoundaries.start} to {dateBoundaries.end} ({dateBoundaries.label})</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300">All figures expressed in PKR (Pakistani Rupees)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 w-2/3">Account Line / Revenue & Cost Center</th>
                    <th className="p-4 text-right">Amount (PKR)</th>
                    <th className="p-4 text-right">% of Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  
                  {/* SECTION 1: REVENUE (INCOME) */}
                  <tr className="bg-emerald-50/60 font-black text-emerald-900">
                    <td className="p-4 uppercase tracking-wider flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-emerald-600" /> 1. Operating Revenue & Incomes
                    </td>
                    <td className="p-4 text-right font-mono text-sm">PKR {financialData.totalGrossRevenue.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono">100.0%</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Standard Courier Delivery Freight Charges</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.standardFreightRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.standardFreightRevenue / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Express & Same-Day Service Premiums</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.expressPremiumRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.expressPremiumRevenue / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Cash-on-Delivery (COD) Handling & Collection Fees</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.codHandlingCommission.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.codHandlingCommission / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Flyer & Packaging Consumables Sales to Shippers</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.flyerPackagingSales.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.flyerPackagingSales / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* SECTION 2: DIRECT DELIVERY COSTS (COGS) */}
                  <tr className="bg-amber-50/60 font-black text-amber-900">
                    <td className="p-4 uppercase tracking-wider flex items-center gap-2">
                      <MinusCircle className="w-4 h-4 text-amber-600" /> 2. Cost of Deliveries & Direct Operations (COGS)
                    </td>
                    <td className="p-4 text-right font-mono text-sm">PKR {financialData.totalDirectCosts.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.totalDirectCosts / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Fleet Fuel, Petrol & Linehaul Diesel</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.fuelAndTravelCosts.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.fuelAndTravelCosts / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Rider Per-Parcel Delivery & Field Mileage Allowances</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.riderCommissions.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.riderCommissions / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Packaging Materials Used (Poly Bags, Thermal Rolls, Seals)</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.packagingDirectCosts.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.packagingDirectCosts / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">3PL Partner Courier Outsource & Cargo Charges</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.tplOutsourceCharges.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.tplOutsourceCharges / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* GROSS PROFIT LINE */}
                  <tr className="bg-slate-100 font-black text-slate-900 border-y-2 border-slate-300 text-sm">
                    <td className="p-4 pl-6 uppercase tracking-wider">GROSS PROFIT (Revenue minus Direct Delivery Costs)</td>
                    <td className="p-4 text-right font-mono text-emerald-700">PKR {financialData.grossProfit.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-emerald-700">{financialData.grossMarginPct}%</td>
                  </tr>

                  {/* SECTION 3: OPERATING EXPENSES (OPEX) */}
                  <tr className="bg-rose-50/60 font-black text-rose-900">
                    <td className="p-4 uppercase tracking-wider flex items-center gap-2">
                      <MinusCircle className="w-4 h-4 text-rose-600" /> 3. Operating Expenses & Overheads (OpEx)
                    </td>
                    <td className="p-4 text-right font-mono text-sm">PKR {financialData.totalOpEx.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.totalOpEx / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Hub & Office Property Rents & Utilities (Electricity, Water)</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.facilityRentUtilities.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.facilityRentUtilities / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Staff Salaries, Office Management & Overtime</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.officeStaffSalaries.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.officeStaffSalaries / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Vehicle Maintenance, Oil Change & Fleet Repairs</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.vehicleMaintenance.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.vehicleMaintenance / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Marketing, SMS Notification Gateways & Software Subscriptions</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.marketingAndTech.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.marketingAndTech / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 pl-8 text-slate-700 font-normal">Miscellaneous Administrative Overhead</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">PKR {financialData.miscellaneousOverhead.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {financialData.totalGrossRevenue > 0 ? ((financialData.miscellaneousOverhead / financialData.totalGrossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* MASTER BOTTOM-LINE: NET PROFIT / LOSS */}
                  <tr className={`border-t-4 border-slate-900 font-black text-base ${
                    financialData.isProfit ? 'bg-emerald-100/80 text-emerald-950' : 'bg-rose-100/80 text-rose-950'
                  }`}>
                    <td className="p-5 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {financialData.isProfit ? <CheckCircle2 className="w-6 h-6 text-emerald-700" /> : <AlertTriangle className="w-6 h-6 text-rose-700" />}
                        NET OPERATING PROFIT / (LOSS)
                      </span>
                      <span className="text-xs font-bold text-slate-600 font-normal">Bottom-Line Performance</span>
                    </td>
                    <td className="p-5 text-right font-mono text-lg">
                      {financialData.isProfit ? '+' : ''}PKR {financialData.netProfitOrLoss.toLocaleString()}
                    </td>
                    <td className="p-5 text-right font-mono text-lg">
                      {financialData.netProfitMarginPct}%
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VISUALS & WATERFALL COMPARISON */}
        {activeTab === 'visuals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Income vs Expense Visual Balance */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" /> Income vs Outflow Balance
              </h3>

              <div className="space-y-4">
                {/* Total Gross Income */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" /> Gross Income
                    </span>
                    <span className="font-mono text-slate-900">PKR {financialData.totalGrossRevenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full w-full" />
                  </div>
                </div>

                {/* Direct Delivery Costs */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500" /> Direct Delivery Costs (COGS)
                    </span>
                    <span className="font-mono text-slate-900">PKR {financialData.totalDirectCosts.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${Math.min(financialData.totalGrossRevenue > 0 ? (financialData.totalDirectCosts / financialData.totalGrossRevenue) * 100 : 0, 100)}%` }} 
                    />
                  </div>
                </div>

                {/* Facility & Administrative OpEx */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-rose-700 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500" /> Operating Overhead (OpEx)
                    </span>
                    <span className="font-mono text-slate-900">PKR {financialData.totalOpEx.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full" 
                      style={{ width: `${Math.min(financialData.totalGrossRevenue > 0 ? (financialData.totalOpEx / financialData.totalGrossRevenue) * 100 : 0, 100)}%` }} 
                    />
                  </div>
                </div>

                {/* Net Profit */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between mt-4">
                  <div>
                    <div className="text-xs font-extrabold uppercase text-slate-500">Net Profit Retention</div>
                    <div className="text-lg font-black text-slate-900 font-mono">
                      {financialData.netProfitMarginPct}% of gross revenue
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    financialData.isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {financialData.isProfit ? 'Profitable Operations' : 'Operating at Loss'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Cost Structure Pie Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-indigo-500" /> Operational Cost Distribution
              </h3>

              <div className="space-y-3">
                {[
                  { name: 'Fleet Fuel & Diesel', amount: financialData.fuelAndTravelCosts, color: '#4f46e5' },
                  { name: 'Rider Commissions & Allowances', amount: financialData.riderCommissions, color: '#0284c7' },
                  { name: 'Facility Rents & Utilities', amount: financialData.facilityRentUtilities, color: '#059669' },
                  { name: 'Staff Salaries & Overhead', amount: financialData.officeStaffSalaries, color: '#d97706' },
                  { name: 'Packaging & Supplies', amount: financialData.packagingDirectCosts, color: '#e11d48' },
                  { name: 'Vehicle Repairs & Tech', amount: financialData.vehicleMaintenance + financialData.marketingAndTech, color: '#7c3aed' },
                  { name: 'Miscellaneous & Other', amount: financialData.miscellaneousOverhead + financialData.tplOutsourceCharges, color: '#64748b' },
                ].map((item, idx) => {
                  const pct = financialData.totalAllExpenses > 0 ? ((item.amount / financialData.totalAllExpenses) * 100).toFixed(1) : '0';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">PKR {item.amount.toLocaleString()}</span>
                        <span className="text-[11px] font-extrabold text-slate-400 w-12 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: HUB CONTRIBUTION MATRIX */}
        {activeTab === 'hubs' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" /> Hub & Branch P&L Contribution
                </h3>
                <p className="text-xs text-slate-400">Comparing income generated vs operational expenses incurred per hub</p>
              </div>
              <span className="text-xs font-bold text-amber-400">
                {hubMetrics.filter(h => h.netProfit > 0).length} of {hubMetrics.length} Hubs Profitable
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Facility / Hub</th>
                    <th className="p-4">City</th>
                    <th className="p-4 text-center">Parcels Handled</th>
                    <th className="p-4 text-right">Gross Income</th>
                    <th className="p-4 text-right">Expenses Incurred</th>
                    <th className="p-4 text-right">Net Profit / (Loss)</th>
                    <th className="p-4 text-right">Net Margin %</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {hubMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">No hub data recorded.</td>
                    </tr>
                  ) : (
                    hubMetrics.map(hub => {
                      const isProf = hub.netProfit >= 0;
                      return (
                        <tr key={hub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span>{hub.name}</span>
                          </td>
                          <td className="p-4 text-slate-600">{hub.city}</td>
                          <td className="p-4 text-center font-bold text-slate-800 font-mono">{hub.parcelCount.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-emerald-600 font-mono">PKR {hub.totalIncome.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-rose-600 font-mono">PKR {hub.totalExpenses.toLocaleString()}</td>
                          <td className={`p-4 text-right font-black font-mono text-sm ${isProf ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isProf ? '+' : ''}PKR {hub.netProfit.toLocaleString()}
                          </td>
                          <td className={`p-4 text-right font-black font-mono ${isProf ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {hub.marginPct}%
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isProf
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isProf ? 'Profitable' : 'Loss-Making'}
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

      </div>
    </PortalLayout>
  );
}

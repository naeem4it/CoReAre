'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, RefreshCw, Search, BarChart3 } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';

interface ArrivalSummaryRow {
  sNo: number;
  brandName: string;
  city: string;
  shipments: number;
  salesPerson: string;
  karachi: number;
  lahore: number;
  rawalpindi: number;
  islamabad: number;
  multan: number;
  faisalabad: number;
  sialkot: number;
  quetta: number;
  hyderabad: number;
  otherCities: number;
}


export default function CustomerServiceArrivalSummaryPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [selectedCity, setSelectedCity] = React.useState('All');
  const [selectedCustomer, setSelectedCustomer] = React.useState('All');
  const [selectedSalesPerson, setSelectedSalesPerson] = React.useState('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [summaryData, setSummaryData] = React.useState<ArrivalSummaryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchArrivalSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/parcels?populate[shipper]=*&populate[destination_city]=*&filters[status][$in][0]=Arrived&filters[status][$in][1]=Arrived At Destination&filters[status][$in][2]=Out For delivery&filters[status][$in][3]=Delivered&pagination[pageSize]=500';
      if (fromDate) url += `&filters[createdAt][$gte]=${fromDate}`;
      if (toDate) url += `&filters[createdAt][$lte]=${toDate}T23:59:59`;

      const res = await apiClient.get(url);
      const parcels: any[] = res.data?.data || [];

      // Group by shipper/brand name
      const groups: Record<string, { brandName: string; city: string; cityCounts: Record<string, number>; salesPerson: string }> = {};
      for (const p of parcels) {
        const brand = p.shipper?.name || p.pickup_location?.shipper?.name || 'Unassigned';
        const originCity = p.pickup_location?.city?.name || p.origin_city?.name || 'LHE';
        const destCity = p.destination_city?.name || p.destination_city || 'Other';

        if (!groups[brand]) {
          groups[brand] = { brandName: brand, city: originCity, cityCounts: {}, salesPerson: '' };
        }
        groups[brand].cityCounts[destCity] = (groups[brand].cityCounts[destCity] || 0) + 1;
      }

      const majorCities = ['Karachi', 'Lahore', 'Rawalpindi', 'Islamabad', 'Multan', 'Faisalabad', 'Sialkot', 'Quetta', 'Hyderabad'];
      const rows: ArrivalSummaryRow[] = Object.values(groups).map((g, i) => {
        const total = Object.values(g.cityCounts).reduce((a, b) => a + b, 0);
        const otherCities = total - majorCities.reduce((a, c) => a + (g.cityCounts[c] || 0), 0);
        return {
          sNo: i + 1,
          brandName: g.brandName,
          city: g.city,
          shipments: total,
          salesPerson: g.salesPerson,
          karachi: g.cityCounts['Karachi'] || 0,
          lahore: g.cityCounts['Lahore'] || 0,
          rawalpindi: g.cityCounts['Rawalpindi'] || 0,
          islamabad: g.cityCounts['Islamabad'] || 0,
          multan: g.cityCounts['Multan'] || 0,
          faisalabad: g.cityCounts['Faisalabad'] || 0,
          sialkot: g.cityCounts['Sialkot'] || 0,
          quetta: g.cityCounts['Quetta'] || 0,
          hyderabad: g.cityCounts['Hyderabad'] || 0,
          otherCities: Math.max(0, otherCities),
        };
      });

      rows.sort((a, b) => b.shipments - a.shipments);
      setSummaryData(rows);
    } catch (err) {
      console.error('Failed to load arrival summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  React.useEffect(() => { fetchArrivalSummary(); }, [fetchArrivalSummary]);

  const customerOptions = React.useMemo(() => {
    return Array.from(new Set(summaryData.map(s => s.brandName).filter(Boolean)));
  }, [summaryData]);

  const salesPersonOptions = React.useMemo(() => {
    return Array.from(new Set(summaryData.map(s => s.salesPerson).filter(Boolean)));
  }, [summaryData]);

  const filteredData = React.useMemo(() => {
    return summaryData.filter(row => {
      const matchCity = selectedCity === 'All' || row.city.toLowerCase() === selectedCity.toLowerCase();
      const matchCustomer = selectedCustomer === 'All' || row.brandName.toLowerCase() === selectedCustomer.toLowerCase();
      const matchSales = selectedSalesPerson === 'All' || row.salesPerson.toLowerCase() === selectedSalesPerson.toLowerCase();
      const matchSearch = !searchQuery || (
        row.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.salesPerson.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchCity && matchCustomer && matchSales && matchSearch;
    });
  }, [summaryData, selectedCity, selectedCustomer, selectedSalesPerson, searchQuery]);

  const totals = React.useMemo(() => {
    return filteredData.reduce((acc, row) => ({
      shipments: acc.shipments + row.shipments,
      karachi: acc.karachi + row.karachi,
      lahore: acc.lahore + row.lahore,
      rawalpindi: acc.rawalpindi + row.rawalpindi,
      islamabad: acc.islamabad + row.islamabad,
      multan: acc.multan + row.multan,
      faisalabad: acc.faisalabad + row.faisalabad,
      sialkot: acc.sialkot + row.sialkot,
      quetta: acc.quetta + row.quetta,
      hyderabad: acc.hyderabad + row.hyderabad,
      otherCities: acc.otherCities + row.otherCities
    }), { shipments: 0, karachi: 0, lahore: 0, rawalpindi: 0, islamabad: 0, multan: 0, faisalabad: 0, sialkot: 0, quetta: 0, hyderabad: 0, otherCities: 0 });
  }, [filteredData]);

  const handleExportExcel = () => {
    const header = "Brand Name,City,Shipments,Karachi,Lahore,Rawalpindi,Islamabad,Multan,Faisalabad,Sialkot,Quetta,Hyderabad,Other Cities\n";
    const rows = filteredData.map(r => `"${r.brandName}","${r.city}",${r.shipments},${r.karachi},${r.lahore},${r.rawalpindi},${r.islamabad},${r.multan},${r.faisalabad},${r.sialkot},${r.quetta},${r.hyderabad},${r.otherCities}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arrival_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">CustomerService / Arrival Summary</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Filters Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="Lahore">Lahore</option>
                <option value="Karachi">Karachi</option>
                <option value="Islamabad">Islamabad</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer (Shipper)</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="All">All Customers</option>
                {customerOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sales Person</label>
              <select
                value={selectedSalesPerson}
                onChange={(e) => setSelectedSalesPerson(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="All">All Sales Persons</option>
                {salesPersonOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative pt-2">
            <Search className="w-4 h-4 absolute left-3 top-[18px] text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand name or sales person..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" /> Regional Destination Breakdown Matrix ({filteredData.length} Brands)
            </span>
            <span className="text-xs text-amber-400 font-bold">Total CNs: {totals.shipments}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">S.No#</th>
                  <th className="p-3.5">Brand Name</th>
                  <th className="p-3.5 text-center">City</th>
                  <th className="p-3.5 text-center bg-slate-200">Shipments</th>
                  <th className="p-3.5">Sales Person</th>
                  <th className="p-3.5 text-center">Karachi</th>
                  <th className="p-3.5 text-center">Lahore</th>
                  <th className="p-3.5 text-center">Rawalpindi</th>
                  <th className="p-3.5 text-center">Islamabad</th>
                  <th className="p-3.5 text-center">Multan</th>
                  <th className="p-3.5 text-center">Faisalabad</th>
                  <th className="p-3.5 text-center">Sialkot</th>
                  <th className="p-3.5 text-center">Quetta</th>
                  <th className="p-3.5 text-center">Hyderabad</th>
                  <th className="p-3.5 text-center">Other Cities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {filteredData.map((r, idx) => (
                  <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900">{r.brandName}</td>
                    <td className="p-3.5 text-center font-bold text-slate-700">{r.city}</td>
                    <td className="p-3.5 text-center font-bold text-primary bg-slate-50">{r.shipments}</td>
                    <td className="p-3.5 text-slate-700">{r.salesPerson}</td>
                    <td className="p-3.5 text-center">{r.karachi}</td>
                    <td className="p-3.5 text-center">{r.lahore}</td>
                    <td className="p-3.5 text-center">{r.rawalpindi}</td>
                    <td className="p-3.5 text-center">{r.islamabad}</td>
                    <td className="p-3.5 text-center">{r.multan}</td>
                    <td className="p-3.5 text-center">{r.faisalabad}</td>
                    <td className="p-3.5 text-center">{r.sialkot}</td>
                    <td className="p-3.5 text-center">{r.quetta}</td>
                    <td className="p-3.5 text-center">{r.hyderabad}</td>
                    <td className="p-3.5 text-center">{r.otherCities}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
                <tr>
                  <td colSpan={3} className="p-4 font-bold text-amber-400">Total CN#</td>
                  <td className="p-4 text-center font-black text-amber-400 text-sm bg-slate-800">{totals.shipments}</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-center">{totals.karachi}</td>
                  <td className="p-4 text-center">{totals.lahore}</td>
                  <td className="p-4 text-center">{totals.rawalpindi}</td>
                  <td className="p-4 text-center">{totals.islamabad}</td>
                  <td className="p-4 text-center">{totals.multan}</td>
                  <td className="p-4 text-center">{totals.faisalabad}</td>
                  <td className="p-4 text-center">{totals.sialkot}</td>
                  <td className="p-4 text-center">{totals.quetta}</td>
                  <td className="p-4 text-center">{totals.hyderabad}</td>
                  <td className="p-4 text-center">{totals.otherCities}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Download, RefreshCw, Search, BarChart3, Package, Filter, List, Building2, Truck, FileText } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { SearchableSelect, SearchableOption } from '@/components/ui/SearchableSelect';
import { FLAT_PAKISTAN_LOCATIONS } from '@/shared/data/pakistan-locations';
import { 
  SHIPMENT_STATUSES, 
  normalizeShipmentStatus, 
  getDbStatusQueryValues 
} from '@/shared/constants/shipment-statuses';

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

interface ArrivalShipmentDetail {
  id: string;
  trackingNumber: string;
  shipperName: string;
  consigneeName: string;
  origin: string;
  destination: string;
  warehouse: string;
  riderName: string;
  manifestNumber: string;
  status: string;
  bookingDate: string;
  arrivalDate: string;
  pieces: number;
  weight: number;
  codAmount: number;
}

export default function CustomerServiceArrivalSummaryPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [selectedCity, setSelectedCity] = React.useState('All');
  const [selectedCustomer, setSelectedCustomer] = React.useState('All');
  const [selectedStatus, setSelectedStatus] = React.useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = React.useState('All');
  const [selectedRider, setSelectedRider] = React.useState('All');
  const [manifestQuery, setManifestQuery] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'matrix' | 'details'>('matrix');

  const [summaryData, setSummaryData] = React.useState<ArrivalSummaryRow[]>([]);
  const [detailParcels, setDetailParcels] = React.useState<ArrivalShipmentDetail[]>([]);
  const [allShippers, setAllShippers] = React.useState<any[]>([]);
  const [offices, setOffices] = React.useState<any[]>([]);
  const [riders, setRiders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch dropdown metadata (Shippers, Offices, Riders)
  React.useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [shippersRes, officesRes, ridersRes] = await Promise.allSettled([
          apiClient.get('/shippers?populate=*&pagination[pageSize]=500'),
          apiClient.get('/offices?populate=*&pagination[pageSize]=100'),
          apiClient.get('/users?populate=role_definition,role&pagination[pageSize]=200')
        ]);

        if (shippersRes.status === 'fulfilled') {
          setAllShippers(shippersRes.value.data?.data || []);
        }
        if (officesRes.status === 'fulfilled') {
          setOffices(officesRes.value.data?.data || []);
        }
        if (ridersRes.status === 'fulfilled') {
          const rawUsers = ridersRes.value.data || [];
          const usersList = Array.isArray(rawUsers) ? rawUsers : (rawUsers as any).data || [];
          const riderUsers = usersList.filter((u: any) => 
            u.role?.name?.toLowerCase() === 'rider' || 
            (Array.isArray(u.role_definition) && u.role_definition.some((r: any) => (r.role_name || r.name || '').toLowerCase() === 'rider'))
          );
          setRiders(riderUsers);
        }
      } catch (err) {
        console.warn('Metadata fetch warning:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Arrival-Related Shipments (5 valid arrival statuses)
  const fetchArrivalSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Valid Arrival-related statuses
      const arrivalStatuses = [
        ...getDbStatusQueryValues(SHIPMENT_STATUSES.PICKED_UP_BY_RIDER),
        ...getDbStatusQueryValues(SHIPMENT_STATUSES.NOT_ARRIVED),
        ...getDbStatusQueryValues(SHIPMENT_STATUSES.ARRIVED_ORIGIN),
        ...getDbStatusQueryValues(SHIPMENT_STATUSES.IN_TRANSIT),
        ...getDbStatusQueryValues(SHIPMENT_STATUSES.ARRIVED_DEST),
      ];

      const statusQueryParams = arrivalStatuses.map((s, idx) => `filters[status][$in][${idx}]=${encodeURIComponent(s)}`).join('&');
      const url = `/parcels?populate[shipper]=true&populate[destination_city]=true&populate[source_city]=true&populate[origin_office]=true&populate[load_sheet][populate][rider]=true&populate[manifest]=true&populate[pickup_location][populate]=*&${statusQueryParams}&pagination[pageSize]=1000&sort[0]=createdAt:desc`;

      const res = await apiClient.get(url);
      const rawParcels: any[] = res.data?.data || [];

      // Safe date filtering
      const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
      const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;

      const parcels = rawParcels.filter((p: any) => {
        if (!fromDate && !toDate) return true;
        const dateStr = p.arrival_date || p.createdAt;
        if (!dateStr) return true;
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) return true;
        return t >= fromTs && t <= toTs;
      });

      // Map raw parcels to detailed records
      const details: ArrivalShipmentDetail[] = parcels.map((p: any) => {
        const normStatus = normalizeShipmentStatus(p.status);
        const originCity = p.source_city?.CityName || p.source_city?.name || p.origin_office?.name || 'Origin';
        const destCity = p.destination_city?.CityName || p.destination_city?.name || p.destination_city || 'Destination';
        const warehouseName = p.origin_office?.name || 'Central Warehouse';
        const rName = p.load_sheet?.rider?.name || p.load_sheet?.rider?.username || 'Unassigned';
        const mNum = p.manifest?.manifest_number ? String(p.manifest.manifest_number) : '-';

        return {
          id: String(p.id),
          trackingNumber: p.tracking_number,
          shipperName: p.shipper?.name || p.pickup_location?.shipper?.name || 'Unassigned Shipper',
          consigneeName: p.recipient_name || 'Customer',
          origin: originCity,
          destination: destCity,
          warehouse: warehouseName,
          riderName: rName,
          manifestNumber: mNum,
          status: normStatus,
          bookingDate: p.createdAt ? p.createdAt.split('T')[0] : '',
          arrivalDate: p.arrival_date ? p.arrival_date.split('T')[0] : '',
          pieces: p.pieces || 1,
          weight: Number(p.weight) || 1.0,
          codAmount: Number(p.cod_amount) || 0,
        };
      });

      setDetailParcels(details);

      // Group for Regional Breakdown Matrix
      const groups: Record<string, { brandName: string; city: string; cityCounts: Record<string, number>; salesPerson: string }> = {};
      for (const d of details) {
        const brand = d.shipperName;
        const originCity = d.origin;
        const destCity = d.destination;

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

  // City Options
  const cityOptions: SearchableOption[] = React.useMemo(() => {
    const citySet = new Set<string>();
    const priorityCities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Hyderabad'];
    priorityCities.forEach(c => citySet.add(c));
    detailParcels.forEach(p => {
      if (p.origin) citySet.add(p.origin);
      if (p.destination) citySet.add(p.destination);
    });
    return Array.from(citySet).map(c => ({ value: c, label: c }));
  }, [detailParcels]);

  // Customer (Shipper) Options
  const customerOptions: SearchableOption[] = React.useMemo(() => {
    const shipperMap = new Map<string, string>();
    allShippers.forEach((s: any) => {
      const name = s.name || s.attributes?.name;
      if (name) shipperMap.set(name.toLowerCase(), name);
    });
    detailParcels.forEach(p => {
      if (p.shipperName && p.shipperName !== 'Unassigned Shipper') {
        shipperMap.set(p.shipperName.toLowerCase(), p.shipperName);
      }
    });
    return Array.from(shipperMap.values()).sort((a, b) => a.localeCompare(b)).map(name => ({ value: name, label: name }));
  }, [allShippers, detailParcels]);

  // Filtered Detailed Parcels
  const filteredDetails = React.useMemo(() => {
    return detailParcels.filter(row => {
      const matchCity = selectedCity === 'All' || row.origin.toLowerCase() === selectedCity.toLowerCase() || row.destination.toLowerCase() === selectedCity.toLowerCase();
      const matchCustomer = selectedCustomer === 'All' || row.shipperName.toLowerCase() === selectedCustomer.toLowerCase();
      const matchStatus = selectedStatus === 'All' || row.status === selectedStatus;
      const matchWarehouse = selectedWarehouse === 'All' || row.warehouse.toLowerCase().includes(selectedWarehouse.toLowerCase());
      const matchRider = selectedRider === 'All' || row.riderName.toLowerCase() === selectedRider.toLowerCase();
      const matchManifest = !manifestQuery.trim() || row.manifestNumber.includes(manifestQuery.trim());
      const matchSearch = !searchQuery || (
        row.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.shipperName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.consigneeName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return matchCity && matchCustomer && matchStatus && matchWarehouse && matchRider && matchManifest && matchSearch;
    });
  }, [detailParcels, selectedCity, selectedCustomer, selectedStatus, selectedWarehouse, selectedRider, manifestQuery, searchQuery]);

  // Filtered Summary Matrix Data
  const filteredSummary = React.useMemo(() => {
    return summaryData.filter(row => {
      const matchCity = selectedCity === 'All' || row.city.toLowerCase() === selectedCity.toLowerCase();
      const matchCustomer = selectedCustomer === 'All' || row.brandName.toLowerCase() === selectedCustomer.toLowerCase();
      const matchSearch = !searchQuery || row.brandName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCity && matchCustomer && matchSearch;
    });
  }, [summaryData, selectedCity, selectedCustomer, searchQuery]);

  const totals = React.useMemo(() => {
    return filteredSummary.reduce((acc, row) => ({
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
  }, [filteredSummary]);

  const handleExportExcel = () => {
    if (activeTab === 'matrix') {
      const header = "Brand Name,Origin City,Total Shipments,Karachi,Lahore,Rawalpindi,Islamabad,Multan,Faisalabad,Sialkot,Quetta,Hyderabad,Other Cities\n";
      const rows = filteredSummary.map(r => `"${r.brandName}","${r.city}",${r.shipments},${r.karachi},${r.lahore},${r.rawalpindi},${r.islamabad},${r.multan},${r.faisalabad},${r.sialkot},${r.quetta},${r.hyderabad},${r.otherCities}`).join("\n");
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Arrival_Summary_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const header = "Tracking #,Shipper,Consignee,Origin,Destination,Warehouse,Rider,Manifest #,Status,Booking Date,Pieces,Weight,COD\n";
      const rows = filteredDetails.map(d => `"${d.trackingNumber}","${d.shipperName}","${d.consigneeName}","${d.origin}","${d.destination}","${d.warehouse}","${d.riderName}","${d.manifestNumber}","${d.status}","${d.bookingDate}",${d.pieces},${d.weight},${d.codAmount}`).join("\n");
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Arrival_Shipments_Log_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Service Module</div>
            <h1 className="text-xl font-bold tracking-tight">Customer Service / Arrival Summary</h1>
            <p className="text-xs text-slate-400">Reports arrival-related shipments across all 5 operational inbound stages.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={fetchArrivalSummary}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrival Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="All">All Arrival Stages</option>
                <option value={SHIPMENT_STATUSES.PICKED_UP_BY_RIDER}>1. Picked up by rider</option>
                <option value={SHIPMENT_STATUSES.NOT_ARRIVED}>2. Not Arrived</option>
                <option value={SHIPMENT_STATUSES.ARRIVED_ORIGIN}>3. Arrived at warehouse (Origin)</option>
                <option value={SHIPMENT_STATUSES.IN_TRANSIT}>4. In Transit</option>
                <option value={SHIPMENT_STATUSES.ARRIVED_DEST}>5. Arrived at warehouse (Dest)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer / Shipper</label>
              <SearchableSelect
                value={selectedCustomer}
                onChange={(val) => setSelectedCustomer(val)}
                options={customerOptions}
                placeholder="Select shipper..."
                allOptionLabel="All Customers"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</label>
              <SearchableSelect
                value={selectedCity}
                onChange={(val) => setSelectedCity(val)}
                options={cityOptions}
                placeholder="Select city..."
                allOptionLabel="All Cities"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Warehouse</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="All">All Warehouses</option>
                {offices.map((o: any) => (
                  <option key={o.id} value={o.name || `Office #${o.id}`}>{o.name || `Office #${o.id}`}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivering Rider</label>
              <select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="All">All Riders</option>
                {riders.map((r: any) => (
                  <option key={r.id} value={r.name || r.username}>{r.name || r.username}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manifest #</label>
              <input
                type="text"
                placeholder="Filter by Manifest #..."
                value={manifestQuery}
                onChange={(e) => setManifestQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">AWB / Shipment Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search AWB tracking #, shipper, or consignee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex border-b border-slate-200 pt-2">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'matrix' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Regional Destination Matrix ({filteredSummary.length} Brands)
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" /> Detailed Arrival Log ({filteredDetails.length} Shipments)
            </button>
          </div>
        </div>

        {/* Tab 1: Regional Destination Breakdown Matrix */}
        {activeTab === 'matrix' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" /> Regional Destination Breakdown Matrix ({filteredSummary.length} Brands)
              </span>
              <span className="text-xs text-amber-400 font-bold">Total Arrival Shipments: {totals.shipments}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">S.No#</th>
                    <th className="p-3.5">Brand Name</th>
                    <th className="p-3.5 text-center">City</th>
                    <th className="p-3.5 text-center bg-slate-200">Arrivals</th>
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
                  {filteredSummary.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-slate-400">No arrival records match your filters.</td>
                    </tr>
                  ) : (
                    filteredSummary.map((r, idx) => (
                      <tr key={r.sNo} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900">{r.brandName}</td>
                        <td className="p-3.5 text-center font-bold text-slate-700">{r.city}</td>
                        <td className="p-3.5 text-center font-bold text-primary bg-slate-50">{r.shipments}</td>
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
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
                  <tr>
                    <td colSpan={3} className="p-4 font-bold text-amber-400">Total Inbound Arrivals</td>
                    <td className="p-4 text-center font-black text-amber-400 text-sm bg-slate-800">{totals.shipments}</td>
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
        )}

        {/* Tab 2: Detailed Arrival Shipments Log */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
              <span>Arrival Shipment Records ({filteredDetails.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Tracking #</th>
                    <th className="p-3.5">Shipper</th>
                    <th className="p-3.5">Consignee</th>
                    <th className="p-3.5 text-center">Route</th>
                    <th className="p-3.5">Warehouse</th>
                    <th className="p-3.5">Rider / Manifest</th>
                    <th className="p-3.5 text-center">Arrival Status</th>
                    <th className="p-3.5 text-right">COD (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {filteredDetails.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">No arrival shipment records found.</td>
                    </tr>
                  ) : (
                    filteredDetails.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-bold font-mono text-primary">{d.trackingNumber}</td>
                        <td className="p-3.5 text-slate-900">{d.shipperName}</td>
                        <td className="p-3.5 text-slate-800">{d.consigneeName}</td>
                        <td className="p-3.5 text-center font-bold text-slate-700">{d.origin} &rarr; {d.destination}</td>
                        <td className="p-3.5 text-slate-700">{d.warehouse}</td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          <div>Rider: {d.riderName}</div>
                          <div>Manifest: {d.manifestNumber}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === SHIPMENT_STATUSES.ARRIVED_ORIGIN || d.status === SHIPMENT_STATUSES.ARRIVED_DEST
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : d.status === SHIPMENT_STATUSES.IN_TRANSIT
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : d.status === SHIPMENT_STATUSES.NOT_ARRIVED
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900">
                          {d.codAmount ? `PKR ${d.codAmount.toLocaleString()}` : 'Rs. 0'}
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

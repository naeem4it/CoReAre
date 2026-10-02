'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { RiderService } from '@/services/api';
import { RouteAssignmentItem } from '@/services/route.service';
import {
  UserCheck,
  Calendar,
  Building2,
  Route as RouteIcon,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bike,
  Search,
  Filter,
  Trash2,
  Check,
  X,
  RefreshCw,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function RouteAssignmentPage() {
  const { user } = useAuth();
  const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : 2);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Data states
  const [assignments, setAssignments] = React.useState<RouteAssignmentItem[]>([]);
  const [offices, setOffices] = React.useState<any[]>([]);
  const [riders, setRiders] = React.useState<any[]>([]);
  const [routes, setRoutes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Form states
  const [selectedDate, setSelectedDate] = React.useState(todayStr);
  const [selectedOfficeId, setSelectedOfficeId] = React.useState('');
  const [selectedRiderId, setSelectedRiderId] = React.useState('');
  const [selectedRouteId, setSelectedRouteId] = React.useState('');
  const [selectedShift, setSelectedShift] = React.useState<'Morning' | 'Evening' | 'Night' | 'Full Day'>('Full Day');
  const [vehicleNumber, setVehicleNumber] = React.useState('');
  const [assignmentNotes, setAssignmentNotes] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Search & Filter
  const [filterDate, setFilterDate] = React.useState(todayStr);
  const [filterOffice, setFilterOffice] = React.useState('');
  const [filterRider, setFilterRider] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');

  // Toast
  const [toast, setToast] = React.useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch initial data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Assignments
      const assignRes = await apiClient.get('/route-assignments?populate=*&sort[0]=assignment_date:desc&pagination[pageSize]=10000');
      const loadedAssign = (assignRes.data?.data || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        ...(item.attributes || item),
      }));
      setAssignments(loadedAssign);

      // 2. Fetch Offices
      const officeRes = await apiClient.get('/offices?populate=*&filters[type][$eq]=courier&pagination[pageSize]=100');
      const loadedOffices = (officeRes.data?.data || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        ...(item.attributes || item),
      }));
      setOffices(loadedOffices);
      if (loadedOffices.length > 0 && !selectedOfficeId) {
        setSelectedOfficeId(String(loadedOffices[0].id));
      }

      // 3. Fetch Riders
      const riderRes = await RiderService.getAll();
      const loadedRiders = riderRes.data || [];
      setRiders(loadedRiders);

      // 4. Fetch Routes (Active only)
      const routeRes = await apiClient.get('/routes?filters[status][$eq]=Active&populate=*&pagination[pageSize]=100');
      const loadedRoutes = (routeRes.data?.data || []).map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        ...(item.attributes || item),
      }));
      setRoutes(loadedRoutes);
    } catch (err: any) {
      console.error('Failed to load s:', err);
      triggerToast('Failed to load assignments: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedOfficeId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Routes valid for the selected Office / Hub
  const availableRoutesForOffice = React.useMemo(() => {
    if (!selectedOfficeId) return routes;
    return routes.filter(r => String(r.office?.id) === String(selectedOfficeId) || !r.office);
  }, [routes, selectedOfficeId]);

  // Handle Create Assignment
  const handleAssignRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDate) {
      setFormError('Please select an operational date.');
      return;
    }
    if (!selectedOfficeId) {
      setFormError('Please select an operational Office / Hub.');
      return;
    }
    if (!selectedRiderId) {
      setFormError('Please select a Rider.');
      return;
    }
    if (!selectedRouteId) {
      setFormError('Please select a Route to assign.');
      return;
    }

    // 1. Verify Rider and Route compatibility
    const chosenRoute = routes.find(r => String(r.id) === String(selectedRouteId));
    const chosenRider = riders.find(rd => String(rd.id) === String(selectedRiderId));

    if (chosenRoute?.office && chosenRider?.office) {
      const routeOfficeId = String(chosenRoute.office.id || chosenRoute.office);
      const riderOfficeId = String(chosenRider.office.id || chosenRider.office);
      if (routeOfficeId !== riderOfficeId) {
        const routeHub = chosenRoute.office.name || 'Selected Hub';
        const riderHub = chosenRider.office.name || 'Rider Primary Hub';
        setFormError(`Incompatible Hub Assignment: Route "${chosenRoute.route_code}" belongs to ${routeHub}, but Rider "${chosenRider.name || chosenRider.username}" is registered under ${riderHub}.`);
        return;
      }
    }

    // 2. Prevent duplicate active assignment for the same rider on the same date and shift
    const existingActive = assignments.find(a =>
      String(a.rider?.id) === String(selectedRiderId) &&
      a.assignment_date === selectedDate &&
      a.shift === selectedShift &&
      a.status === 'Active'
    );
    if (existingActive) {
      const existingCode = existingActive.route?.route_code || 'another route';
      setFormError(`Duplicate Assignment: Rider is already actively assigned to route "${existingCode}" on ${selectedDate} (${selectedShift} shift).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        assignment_date: selectedDate,
        shift: selectedShift,
        vehicle_number: vehicleNumber.trim() || undefined,
        status: 'Active',
        notes: assignmentNotes.trim() || undefined,
        office: Number(selectedOfficeId),
        rider: Number(selectedRiderId),
        route: Number(selectedRouteId),
        tenant: Number(tenantId),
      };

      await apiClient.post('/route-assignments', { data: payload });
      triggerToast(`Assigned ${chosenRoute?.route_code || 'Route'} to ${chosenRider?.name || 'Rider'} for ${selectedDate}.`);

      // Reset selection
      setSelectedRouteId('');
      setVehicleNumber('');
      setAssignmentNotes('');
      fetchData();
    } catch (err: any) {
      console.error('Failed to assign route:', err);
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to save assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change (Complete or Cancel)
  const handleUpdateStatus = async (item: RouteAssignmentItem, newStatus: 'Completed' | 'Cancelled') => {
    try {
      const targetId = item.documentId || item.id;
      await apiClient.put(`/route-assignments/${targetId}`, {
        data: { status: newStatus }
      });
      triggerToast(`Assignment marked ${newStatus}.`);
      setAssignments(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a));
    } catch (err: any) {
      triggerToast('Failed to update status: ' + err.message, 'error');
    }
  };

  const handleDeleteAssignment = async (item: RouteAssignmentItem) => {
    if (!confirm('Are you sure you want to remove this ?')) return;
    try {
      const targetId = item.documentId || item.id;
      await apiClient.delete(`/route-assignments/${targetId}`);
      triggerToast('Assignment deleted.');
      setAssignments(prev => prev.filter(a => a.id !== item.id));
    } catch (err: any) {
      triggerToast('Failed to delete assignment: ' + err.message, 'error');
    }
  };

  // Filtered assignments
  const filteredAssignments = React.useMemo(() => {
    return assignments.filter(a => {
      if (filterDate && a.assignment_date !== filterDate) return false;
      if (filterOffice && String(a.office?.id) !== filterOffice) return false;
      if (filterRider && String(a.rider?.id) !== filterRider) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const rName = (a.rider?.name || a.rider?.username || '').toLowerCase();
        const rtCode = (a.route?.route_code || '').toLowerCase();
        const rtName = (a.route?.name || '').toLowerCase();
        if (!rName.includes(term) && !rtCode.includes(term) && !rtName.includes(term)) return false;
      }
      return true;
    });
  }, [assignments, filterDate, filterOffice, filterRider, searchTerm]);

  return (
    <PortalLayout>
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
        {/* Toast */}
        {toast.show && (
          <div className={`fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-950 text-red-100 border border-red-800'
            }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-on-surface">Rider Route Assignment</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Assign operational routes to delivery riders by date and shift
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/administration/routes"
              className="px-4 py-2.5 bg-surface-container-highest text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RouteIcon className="w-4 h-4" />
              <span>Route Master</span>
            </Link>
            <Link
              href="/operations/delivery-sheet"
              className="px-4 py-2.5 bg-primary text-white hover:bg-primary/90 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Delivery Sheets &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Assignment Creation Form Box */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-black text-slate-800">Dispatch Route to Rider</h2>
            </div>
            <span className="text-[11px] text-slate-400">Riders can work on different routes on different operational dates</span>
          </div>

          <form onSubmit={handleAssignRoute} className="flex flex-col gap-4 text-xs">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Operational Date */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Office / Hub */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Office / Hub <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedOfficeId}
                  onChange={(e) => {
                    setSelectedOfficeId(e.target.value);
                    setSelectedRouteId('');
                  }}
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white font-medium focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Hub...</option>
                  {offices.map(o => (
                    <option key={o.id} value={String(o.id)}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Rider Selection */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Rider <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRiderId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setSelectedRiderId(rId);
                    const chosen = riders.find(rd => String(rd.id) === String(rId));
                    if (chosen?.office?.id) {
                      setSelectedOfficeId(String(chosen.office.id));
                    }
                  }}
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white font-medium focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Choose Rider...</option>
                  {riders.map(r => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name || r.username || `Rider #${r.id}`} {r.office?.name ? `[${r.office.name}]` : ''} {r.phone ? `(${r.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Route Selection */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <RouteIcon className="w-3.5 h-3.5 text-slate-400" /> Route <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white font-medium focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Active Route...</option>
                  {availableRoutesForOffice.map(rt => (
                    <option key={rt.id} value={String(rt.id)}>
                      {rt.route_code} - {rt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Shift */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Shift
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as any)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                >
                  <option value="Full Day">Full Day</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              {/* Vehicle Number */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-slate-400" /> Vehicle / Bike Reg (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LHR-8902 or Motorbike-102"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Action Button */}
              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-primary text-white hover:bg-primary/90 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Assign Route</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Assignments Filter & Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-black text-sm text-slate-800">Operational Daily Roster</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                {filteredAssignments.length} Assigned
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-1.5 border border-outline-variant rounded-xl bg-surface-container-low font-medium focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${!filterDate ? 'bg-primary text-white border-primary' : 'bg-white border-outline-variant text-slate-600 hover:bg-slate-50'
                  }`}
              >
                All Dates
              </button>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter rider or route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-outline-variant rounded-xl bg-surface-container-low text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 flex items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Loading assignments...</span>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No route assignments found for the selected date. Assign a route above to populate the rider schedule.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Rider</th>
                    <th className="py-3 px-4">Hub / Office</th>
                    <th className="py-3 px-4">Assigned Route</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {filteredAssignments.map((a) => {
                    const riderName = a.rider?.name || a.rider?.username || `Rider #${a.rider?.id || ''}`;
                    const routeCode = a.route?.route_code || '-';
                    const routeName = a.route?.name || '';
                    const hubName = a.office?.name || '-';

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">{a.assignment_date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2 mt-2">
                          <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{riderName}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{hubName}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
                              {routeCode}
                            </span>
                            {routeName && <span className="text-[10px] text-slate-500 mt-0.5">{routeName}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{a.shift}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{a.vehicle_number || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                            a.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {a.status === 'Active' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(a, 'Completed')}
                                title="Mark Completed"
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(a)}
                              title="Delete Assignment"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

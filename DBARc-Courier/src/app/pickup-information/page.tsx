'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/shared/api/api-client';

interface PickupFormValues {
  clientName: string;
  phoneNumber: string;
  requested_date: string;
  pickupAddress: string;
  status: string;
  courierAssigned: string;
  totalWeight: number;
  parcel_count: number;
  priority: string;
}

export default function PickupInformationPage() {
  const [riders, setRiders] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiClient.get('/riders').then(res => {
      setRiders(res.data?.data || []);
    }).catch(err => console.warn('Could not fetch riders:', err));
  }, []);

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<PickupFormValues>({
    defaultValues: {
      clientName: '',
      phoneNumber: '',
      requested_date: todayStr,
      pickupAddress: '',
      status: 'pending',
      courierAssigned: '',
      totalWeight: 1,
      parcel_count: 1,
      priority: 'Standard'
    }
  });

  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const onSubmit = async (data: PickupFormValues) => {
    try {
      setSubmitStatus('idle');
      
      const payload = {
        requested_date: data.requested_date,
        parcel_count: Number(data.parcel_count),
        status: data.status,
      };

      await apiClient.post('/pickup-requests', { data: payload });
      setSubmitStatus('success');
      reset();
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to create pickup request:', error);
      setSubmitStatus('error');
    }
  };


  return (
    <PortalLayout>
    <div className="flex-1 p-lg bg-surface-container-low min-h-[calc(100vh-64px)] w-full">
      <div className="mb-lg flex justify-between items-end">
        <div>
          <nav className="flex gap-xs text-outline font-label-md mb-xs">
            <span>Shipments</span>
            <span>/</span>
            <span className="text-primary">Pickup Information</span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Pickup Information</h1>
        </div>
        <div className="flex gap-sm">
          <button className="px-md py-2 border border-outline text-secondary font-semibold rounded hover:bg-surface-container-high transition-colors flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">list</span>
            List View
          </button>
        </div>
      </div>

      {submitStatus === 'success' && (
        <div className="mb-lg bg-emerald-50 text-emerald-800 p-sm border border-emerald-200 rounded-xl flex items-center gap-md">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="font-label-md">Pickup request created successfully!</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="mb-lg bg-red-50 text-red-800 p-sm border border-red-200 rounded-xl flex items-center gap-md">
          <span className="material-symbols-outlined">error</span>
          <p className="font-label-md">Failed to create pickup request. Please try again.</p>
        </div>
      )}


      {/* Form Container */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">local_shipping</span>
            Pickup Details
          </h3>
          <span className="bg-primary-fixed text-on-primary-fixed px-sm py-1 rounded-full text-label-md">DRAFT #PK-98231</span>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-lg grid grid-cols-12 gap-x-gutter gap-y-md">
          {/* Section: Sender Info */}
          <div className="col-span-12 md:col-span-6 grid grid-cols-1 gap-md">
            <h4 className="font-label-md text-primary uppercase tracking-widest border-b border-primary-fixed pb-xs mb-xs">Origin Details</h4>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface-variant">Client Name</label>
              <input {...register('clientName')} className="w-full h-10 border border-outline-variant rounded px-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all" type="text" />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Phone Number</label>
                <input {...register('phoneNumber')} className="w-full h-10 border border-outline-variant rounded px-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all" type="tel" />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Pickup Date</label>
                <div className="relative">
                  <input {...register('requested_date', { required: true })} className="w-full h-10 border border-outline-variant rounded px-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all" type="date" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface-variant">Pickup Address</label>
              <textarea {...register('pickupAddress')} className="w-full border border-outline-variant rounded p-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all resize-none" rows={3}></textarea>
            </div>
          </div>
          {/* Section: Logistical Controls */}
          <div className="col-span-12 md:col-span-6 grid grid-cols-1 gap-md">
            <h4 className="font-label-md text-primary uppercase tracking-widest border-b border-primary-fixed pb-xs mb-xs">Status & Logistics</h4>
            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Status</label>
                <select {...register('status')} className="w-full h-10 border border-outline-variant rounded px-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-white appearance-none cursor-pointer">
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Courier Assigned</label>
                <select {...register('courierAssigned')} className="w-full h-10 border border-outline-variant rounded px-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all bg-white">
                  <option value="">Select Courier / Rider</option>
                  {riders.map((r: any) => (
                    <option key={r.id} value={r.name || r.attributes?.name || `Rider #${r.id}`}>
                      {r.name || r.attributes?.name || `Rider #${r.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Total Weight (kg)</label>
                <input {...register('totalWeight')} className="w-full h-10 border border-outline-variant rounded px-sm font-tabular-nums text-right focus:ring-2 focus:ring-primary outline-none transition-all" type="number" step="0.1" />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Package Count</label>
                <input {...register('parcel_count')} className="w-full h-10 border border-outline-variant rounded px-sm font-tabular-nums text-right focus:ring-2 focus:ring-primary outline-none transition-all" type="number" />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Priority</label>
                <select {...register('priority')} className="w-full h-10 border border-outline-variant rounded px-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all">
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Overnight">Overnight</option>
                </select>
              </div>
            </div>
            <div className="bg-surface p-sm rounded-lg border border-outline-variant mt-xs">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>info</span>
                <p className="text-label-md text-on-surface-variant">Scheduled pickup estimated between 14:00 - 16:00 local time.</p>
              </div>
            </div>
          </div>
          {/* Footer Actions */}
          <div className="col-span-12 mt-lg flex justify-between items-center border-t border-outline-variant pt-lg">
            <button className="px-lg py-3 text-error font-semibold hover:bg-error-container/20 rounded transition-colors flex items-center gap-xs" type="button">
              <span className="material-symbols-outlined">delete</span>
              Cancel Request
            </button>
            <div className="flex gap-sm">
              <button 
                className="px-lg py-3 border border-outline text-secondary font-semibold rounded hover:bg-surface-container-high transition-all active:scale-95" 
                type="button" 
                onClick={() => reset()}
              >
                Reset Form
              </button>
              <button 
                className="px-xl py-3 bg-primary-container text-white font-bold rounded shadow-md hover:brightness-110 transition-all active:scale-95 flex items-center gap-sm disabled:opacity-70" 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined">save</span>
                )}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* Map/Route Preview Card (Aesthetic Detail) */}
      <div className="mt-lg grid grid-cols-12 gap-gutter">
        <div className="col-span-12 lg:col-span-8 bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm h-64 relative group cursor-pointer">
          <div className="absolute inset-0 bg-slate-200 flex items-center justify-center overflow-hidden">
            {/* Simulated Map Pattern */}
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(#0052ff 1px, transparent 0)", backgroundSize: "24px 24px"}}></div>
            <div className="z-10 bg-white/90 backdrop-blur-md p-md rounded-lg shadow-lg border border-outline-variant flex flex-col items-center">
              <span className="material-symbols-outlined text-primary text-[48px] mb-xs">map</span>
              <span className="font-headline-md">Live Route Preview</span>
              <span className="text-label-md text-outline">Click to expand geographic view</span>
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 bg-white border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-headline-md mb-sm">Fleet Efficiency</h4>
            <div className="flex justify-between items-center mb-xs">
              <span className="text-body-md text-on-surface-variant">Route Density</span>
              <span className="font-tabular-nums text-primary">88%</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full mb-md overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{width: "88%"}}></div>
            </div>
            <p className="text-label-md text-outline">This pickup adds 12km to existing route V-202. Within optimal threshold.</p>
          </div>
          <button className="w-full py-2 bg-secondary text-on-secondary font-semibold rounded hover:opacity-90 transition-opacity">
            View Alternatives
          </button>
        </div>
      </div>
    </div>
    </PortalLayout>
  );
}

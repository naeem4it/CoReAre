import { mockTrackingData } from '@/entities/tracking/model/tracking.model';
import { TrackingTimeline } from '@/features/tracking/ui/TrackingTimeline';
import { notFound } from 'next/navigation';
import { Package, Search } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export default function TrackingPage({ params }: { params: { id: string } }) {
  const info = mockTrackingData[params.id];

  if (!info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
         <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center">
            <Package className="h-10 w-10 text-slate-300" />
         </div>
         <h1 className="text-2xl font-bold text-slate-900">Tracking Number Not Found</h1>
         <p className="text-slate-500 max-w-xs">We couldn't find any record for "#{params.id}". Please check the number and try again.</p>
         <div className="w-full max-w-sm flex gap-2">
            <Input placeholder="Enter Tracking ID" className="h-12 rounded-xl" />
            <Button size="lg" className="rounded-xl">Track</Button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-600 px-4 py-1 rounded-full text-sm font-bold border border-primary-100">
             <Package className="h-4 w-4" /> Shipments Tracking
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">#{info.trackingId}</h1>
          <p className="text-slate-500 font-medium">Tracking your parcel in real-time across the DBARc network.</p>
        </div>

        <TrackingTimeline info={info} />

        <div className="pt-12 text-center">
           <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Powered by DBARc Logistics Engine</p>
        </div>
      </div>
    </div>
  );
}

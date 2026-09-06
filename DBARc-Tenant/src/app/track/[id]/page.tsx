'use client';

import * as React from 'react';
import { TrackingTimeline } from '@/features/tracking/ui/TrackingTimeline';
import { Package, Search, Loader2 } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { apiClient } from '@/shared/api/api-client';
import { useRouter } from 'next/navigation';
import { TrackingInfo, TrackingStep } from '@/entities/tracking/model/tracking.model';

export default function TrackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [trackingIdInput, setTrackingIdInput] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [info, setInfo] = React.useState<TrackingInfo | null>(null);
  const [notFoundError, setNotFoundError] = React.useState(false);

  const fetchTracking = async (trackingNum: string) => {
    try {
      setLoading(true);
      setNotFoundError(false);
      const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(trackingNum)}&populate=*`);
      const parcel = res.data?.data?.[0];

      if (!parcel) {
        setNotFoundError(true);
        setInfo(null);
        return;
      }

      const status = parcel.status || 'Total Booking';
      const createdAt = parcel.createdAt
        ? new Date(parcel.createdAt).toLocaleDateString() + ' ' + new Date(parcel.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recent';
      const origin = parcel.source_city?.name || 'Origin Hub';
      const destination = parcel.destination_city?.name || parcel.recipient_address || 'Destination Hub';

      const isBooked = ['Total Booking', 'booked', 'Not Arrived', 'Arrived', 'Arrived At Destination', 'Out For delivery', 'Delivered'].includes(status);
      const isArrived = ['Arrived', 'Arrived At Destination', 'Out For delivery', 'Delivered'].includes(status);
      const isOutForDelivery = ['Out For delivery', 'Delivered'].includes(status);
      const isDelivered = status === 'Delivered';

      const timeline: TrackingStep[] = [
        {
          status: 'Order Booked',
          location: origin,
          date: createdAt,
          isCompleted: isBooked,
          isCurrent: status === 'Total Booking' || status === 'booked' || status === 'Not Arrived',
        },
        {
          status: 'Arrived at Hub',
          location: origin + ' Facility',
          date: parcel.arrival_date ? new Date(parcel.arrival_date).toLocaleDateString() : (isArrived ? 'Processed' : '-'),
          isCompleted: isArrived,
          isCurrent: status === 'Arrived' || status === 'Arrived At Destination',
        },
        {
          status: 'Out for Delivery',
          location: destination,
          date: isOutForDelivery ? 'In Transit' : '-',
          isCompleted: isOutForDelivery,
          isCurrent: status === 'Out For delivery',
        },
        {
          status: 'Delivered',
          location: parcel.recipient_address || 'Customer Doorstep',
          date: parcel.delivered_date ? new Date(parcel.delivered_date).toLocaleDateString() : (isDelivered ? 'Completed' : '-'),
          isCompleted: isDelivered,
          isCurrent: isDelivered,
        },
      ];

      let mappedStatus: TrackingInfo['status'] = 'Created';
      if (status === 'Delivered') mappedStatus = 'Delivered';
      else if (status === 'Out For delivery') mappedStatus = 'Out for Delivery';
      else if (['Arrived', 'Arrived At Destination'].includes(status)) mappedStatus = 'In Transit';
      else if (['Failed Attempt', 'Ready To Return', 'Return Dispatched', 'Return to Shipper'].includes(status)) mappedStatus = 'Failed';

      setInfo({
        trackingId: parcel.tracking_number,
        status: mappedStatus,
        timeline,
        rider: parcel.rider ? {
          name: parcel.rider.name || parcel.rider.user?.fullName || 'Assigned Courier Rider',
          phone: parcel.rider.phone || '+92 300 0000000',
          photo: 'R',
        } : undefined,
      });
    } catch (err) {
      console.warn('Could not fetch tracking data:', err);
      setNotFoundError(true);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (params.id) {
      fetchTracking(params.id);
    }
  }, [params.id]);

  const handleSearchNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingIdInput.trim()) {
      router.push(`/track/${encodeURIComponent(trackingIdInput.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-600 font-medium">Tracking parcel #{params.id}...</p>
      </div>
    );
  }

  if (notFoundError || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-50">
        <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center">
          <Package className="h-10 w-10 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Tracking Number Not Found</h1>
        <p className="text-slate-500 max-w-xs">We couldn't find any record for "#{params.id}". Please check the number and try again.</p>
        <form onSubmit={handleSearchNew} className="w-full max-w-sm flex gap-2">
          <Input 
            value={trackingIdInput} 
            onChange={(e) => setTrackingIdInput(e.target.value)} 
            placeholder="Enter Tracking ID (e.g. DBA-...)" 
            className="h-12 rounded-xl bg-white" 
          />
          <Button type="submit" size="lg" className="rounded-xl">Track</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 pt-24">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight whitespace-nowrap">
            DBARC
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">
            [Digital Business Automation for Routing & Courier]
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-600 px-4 py-1 rounded-full text-sm font-bold border border-primary-100">
            <Package className="h-4 w-4" /> Shipments Tracking
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">#{info.trackingId}</h1>
          <p className="text-slate-500 font-medium">Tracking your parcel in real-time across the DBARc network.</p>
        </div>

        <TrackingTimeline info={info} />

        <div className="pt-8 text-center">
          <form onSubmit={handleSearchNew} className="max-w-md mx-auto flex gap-2 mb-4">
            <Input 
              value={trackingIdInput} 
              onChange={(e) => setTrackingIdInput(e.target.value)} 
              placeholder="Track another shipment..." 
              className="h-11 rounded-xl bg-white" 
            />
            <Button type="submit" className="rounded-xl px-5">Search</Button>
          </form>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Powered by DBARc Logistics Engine</p>
        </div>
      </div>
    </div>
  );
}

import * as React from 'react';
import { TrackingInfo } from '../model/tracking.model';
import { CheckCircle2, Circle, Clock, MapPin, Phone, User } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

export const TrackingTimeline = ({ info }: { info: TrackingInfo }) => {
  return (
    <div className="space-y-8">
      {/* Timeline */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {info.timeline.map((step, idx) => (
          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Icon */}
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-500',
              step.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : step.isCurrent ? 'bg-primary-600 border-primary-600 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-300'
            )}>
              {step.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </div>
            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[45%] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className={cn('font-bold', step.isCurrent ? 'text-primary-600' : 'text-slate-900')}>{step.status}</div>
                <time className="font-mono text-xs text-slate-500">{step.date}</time>
              </div>
              <div className="text-slate-500 text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {step.location}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rider Info & Map (if applicable) */}
      {info.status === 'Out for Delivery' && info.rider && (
        <div className="animate-in fade-in zoom-in duration-500 space-y-4">
          <Card className="bg-primary-600 text-white border-none shadow-xl overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl font-black border border-white/10">
                  {info.rider.photo}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Your Rider</p>
                  <h4 className="text-xl font-bold">{info.rider.name}</h4>
                </div>
              </div>
              <Button className="bg-white text-primary-600 hover:bg-white/90 font-bold rounded-xl h-12 px-6">
                <Phone className="h-4 w-4 mr-2" /> Contact
              </Button>
            </CardContent>
          </Card>

          {/* Mock Map */}
          <div className="h-64 bg-slate-200 rounded-3xl relative overflow-hidden group shadow-inner border-4 border-white">
            <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/74.3587,31.5204,12/800x400?access_token=mock')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -top-12 -left-1/2 w-max bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-xl border border-slate-100 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary-600 animate-ping" />
                  Rider is 5 mins away
                </div>
                <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white border-4 border-white shadow-2xl">
                  <MapPin className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/20">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Live Tracking</p>
              <p className="text-xs font-bold text-slate-900">Current Zone: Gulberg, Lahore</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

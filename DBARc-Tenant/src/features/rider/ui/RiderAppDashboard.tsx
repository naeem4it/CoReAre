'use client';

import * as React from 'react';
import { Camera, User, FileText, CheckCircle2, CloudOff, Wifi, MapPin, Phone } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { cn } from '@/shared/lib/utils';

export const ProofOfDelivery = ({ shipmentId, onComplete }: { shipmentId: string, onComplete: () => void }) => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [isPhotoTaken, setIsPhotoTaken] = React.useState(false);
  const [receiverName, setReceiverName] = React.useState('');
  const [isDelivered, setIsDelivered] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleMarkDelivered = () => {
    const podData = {
      shipmentId,
      receiverName,
      timestamp: new Date().toISOString(),
      photo: 'mock-base64-data',
    };

    if (isOffline) {
      // Offline-first logic
      const pendingSync = JSON.parse(localStorage.getItem('pending_sync') || '[]');
      pendingSync.push(podData);
      localStorage.setItem('pending_sync', JSON.stringify(pendingSync));
      alert('Offline: POD saved locally. Will sync when online.');
    } else {
      console.log('Syncing POD to server...', podData);
    }

    setIsDelivered(true);
    setTimeout(onComplete, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">POD: {shipmentId}</h2>
        {isOffline ? (
          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-bold border border-amber-100">
            <CloudOff className="h-3 w-3" /> OFFLINE
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
            <Wifi className="h-3 w-3" /> ONLINE
          </div>
        )}
      </div>

      <div 
        onClick={() => setIsPhotoTaken(true)}
        className={cn(
          'aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all',
          isPhotoTaken ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-primary-500'
        )}
      >
        {isPhotoTaken ? (
          <><CheckCircle2 className="h-10 w-10" /><span className="font-bold">Photo Captured</span></>
        ) : (
          <><Camera className="h-10 w-10" /><span className="font-bold">Capture Delivery Photo</span></>
        )}
      </div>

      <Input 
        label="Receiver Name / Relation" 
        placeholder="e.g., Self, Security Guard" 
        value={receiverName}
        onChange={(e) => setReceiverName(e.target.value)}
      />

      <div className="pt-4">
        <label className="flex items-center gap-3 p-6 bg-slate-900 text-white rounded-3xl cursor-pointer shadow-xl shadow-slate-900/20 group">
          <input 
            type="checkbox" 
            className="hidden" 
            checked={isDelivered}
            onChange={(e) => {
              if(e.target.checked && receiverName && isPhotoTaken) handleMarkDelivered();
            }}
          />
          <div className={cn(
            'h-8 w-14 rounded-full p-1 transition-colors duration-300 flex items-center',
            isDelivered ? 'bg-emerald-500' : 'bg-white/20'
          )}>
            <div className={cn(
              'h-6 w-6 bg-white rounded-full transition-transform duration-300 shadow-lg',
              isDelivered ? 'translate-x-6' : 'translate-x-0'
            )} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg leading-none">Slide to Deliver</p>
            <p className="text-[10px] opacity-60 uppercase tracking-widest mt-1">Confirm and finalize task</p>
          </div>
        </label>
      </div>
    </div>
  );
};

export const RiderAppDashboard = () => {
  const [activeTab, setActiveTab] = React.useState<'assigned' | 'pod'>('assigned');
  const [selectedTask, setSelectedTask] = React.useState<string | null>(null);

  const tasks = [
    { id: 'CR-782104', recipient: 'Maria J.', address: 'DHA Phase 5, House 12', type: 'COD', amount: 3500 },
    { id: 'CR-782102', recipient: 'Zohaib A.', address: 'Gulberg, Street 4, Block B', type: 'PAID', amount: 0 },
  ];

  if (activeTab === 'pod' && selectedTask) {
    return (
      <div className="p-6 pb-24">
         <button onClick={() => setActiveTab('assigned')} className="text-primary-600 font-bold mb-6 flex items-center gap-1">
            ← Back to List
         </button>
         <ProofOfDelivery shipmentId={selectedTask} onComplete={() => setActiveTab('assigned')} />
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">Welcome Back,</p>
          <h1 className="text-2xl font-black text-slate-900">Ahmed Khan</h1>
        </div>
        <div className="h-12 w-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-primary-600/30">
          A
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 text-white p-4 rounded-3xl">
          <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Today's Tasks</p>
          <p className="text-2xl font-black">12</p>
        </div>
        <div className="bg-emerald-500 text-white p-4 rounded-3xl">
          <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Earnings</p>
          <p className="text-2xl font-black">PKR 850</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Assigned Deliveries</h3>
        {tasks.map((task) => (
          <Card key={task.id} className="border-none shadow-md rounded-3xl overflow-hidden active:scale-[0.98] transition-transform" onClick={() => { setSelectedTask(task.id); setActiveTab('pod'); }}>
            <CardContent className="p-5 flex items-center justify-between">
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">#{task.id}</span>
                    <span className={cn(
                      'text-[10px] font-black px-2 py-0.5 rounded-full',
                      task.type === 'COD' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {task.type} {task.amount > 0 && `PKR ${task.amount}`}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{task.recipient}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {task.address}
                    </p>
                  </div>
               </div>
               <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center">
                  <Phone className="h-4 w-4 text-slate-400" />
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Nav Mock for Mobile App feel */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-slate-900/90 backdrop-blur-md rounded-3xl flex items-center justify-around px-4 border border-white/10 shadow-2xl z-50">
          <div className="text-primary-400"><Wifi className="h-6 w-6" /></div>
          <div className="text-white/40"><MapPin className="h-6 w-6" /></div>
          <div className="text-white/40"><FileText className="h-6 w-6" /></div>
          <div className="text-white/40"><User className="h-6 w-6" /></div>
      </nav>
    </div>
  );
};

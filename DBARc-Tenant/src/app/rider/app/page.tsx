import { RiderAppDashboard } from '@/features/rider/ui/RiderAppDashboard';

export default function RiderAppPage() {
  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative overflow-hidden">
      {/* App Header Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary-50 to-transparent pointer-events-none" />
      
      <RiderAppDashboard />
    </div>
  );
}

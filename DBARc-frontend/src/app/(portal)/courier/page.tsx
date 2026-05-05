import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Package, Truck, Users, BarChart3 } from 'lucide-react';

export default function CourierDashboard() {
  const stats = [
    { label: 'Active Shipments', value: '452', icon: Package, color: 'text-blue-600' },
    { label: 'Riders Online', value: '38', icon: Truck, color: 'text-emerald-600' },
    { label: 'Pending Pickups', value: '24', icon: Users, color: 'text-purple-600' },
    { label: 'Today\'s Revenue', value: '$8,240', icon: BarChart3, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Courier Dashboard</h1>
        <p className="text-slate-500">Manage your logistics operations and rider fleet.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-400 mt-1">
                <span className="text-emerald-500 font-medium">+5.4%</span> from yesterday
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[300px]">
          <CardHeader>
            <CardTitle>Delivery Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48 text-slate-400 italic">
            Chart coming soon...
          </CardContent>
        </Card>
        <Card className="min-h-[300px]">
          <CardHeader>
            <CardTitle>Top Performing Riders</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48 text-slate-400 italic">
            List coming soon...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

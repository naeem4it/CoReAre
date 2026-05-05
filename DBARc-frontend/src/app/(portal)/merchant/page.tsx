import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Package, FileText, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export default function MerchantDashboard() {
  const stats = [
    { label: 'My Orders', value: '86', icon: Package, color: 'text-blue-600' },
    { label: 'In Transit', value: '12', icon: FileText, color: 'text-emerald-600' },
    { label: 'Completed', value: '74', icon: BarChart3, color: 'text-purple-600' },
    { label: 'Alerts', value: '2', icon: AlertCircle, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Merchant Portal</h1>
          <p className="text-slate-500">Track your shipments and manage customer deliveries.</p>
        </div>
        <Button size="lg" className="rounded-xl shadow-lg shadow-primary-600/20">
          Create New Shipment
        </Button>
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-full text-slate-400 italic py-20">
            No active shipments found. Start by creating one!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { BarChart3, Building2, ShieldCheck, Users } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Tenants', value: '128', icon: Building2, color: 'text-blue-600' },
    { label: 'Active Sessions', value: '1,420', icon: Users, color: 'text-emerald-600' },
    { label: 'System Health', value: '99.9%', icon: ShieldCheck, color: 'text-purple-600' },
    { label: 'Revenue (MTD)', value: '$42,500', icon: BarChart3, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
        <p className="text-slate-500">Monitor and manage the DBARc platform.</p>
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
                <span className="text-emerald-500 font-medium">+12%</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-full text-slate-400 italic py-20">
            Real-time activity logs will appear here...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

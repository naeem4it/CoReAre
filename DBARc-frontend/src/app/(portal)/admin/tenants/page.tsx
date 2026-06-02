import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Building2, Users, ShieldCheck, BarChart3 } from 'lucide-react';

export default function AdminTenantsPage() {
  const tenantStats = [
    { label: 'Active Tenants', value: '64', icon: Building2, color: 'text-blue-600' },
    { label: 'Pending Invites', value: '8', icon: Users, color: 'text-emerald-600' },
    { label: 'Compliance Status', value: 'Good', icon: ShieldCheck, color: 'text-purple-600' },
    { label: 'Tenant Growth', value: '+18%', icon: BarChart3, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tenant Management</h1>
        <p className="text-slate-500">View and administer tenants across the DBARc platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tenantStats.map((stat) => (
          <Card key={stat.label} hoverEffect>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-h-[420px]">
        <CardHeader>
          <CardTitle>Tenant Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-500 italic py-24 text-center">
            Tenant details are not yet implemented in this preview.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

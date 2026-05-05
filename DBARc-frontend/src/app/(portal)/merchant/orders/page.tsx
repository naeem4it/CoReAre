import { ShipmentTable } from '@/features/shipment/ui/ShipmentTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipment History</h1>
          <p className="text-slate-500">Track and manage all your previous bookings.</p>
        </div>
        <Link href="/merchant/new-order">
          <Button className="rounded-xl shadow-lg shadow-primary-600/20">
            <Plus className="h-5 w-5 mr-2" /> Book New Shipment
          </Button>
        </Link>
      </div>

      <ShipmentTable />
    </div>
  );
}

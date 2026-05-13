'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Plus } from 'lucide-react';
import { CourierShipmentsTable } from '@/features/courier/ui/CourierShipmentsTable';

export default function ShipmentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments Management</h1>
          <p className="text-slate-500">Manage all shipments, assign to riders, and track delivery status.</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary-600/20">
          <Plus className="h-5 w-5 mr-2" /> Bulk Assign
        </Button>
      </div>

      <CourierShipmentsTable />
    </div>
  );
}
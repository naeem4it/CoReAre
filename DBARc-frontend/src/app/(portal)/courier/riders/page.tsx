'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Plus } from 'lucide-react';
import { RidersTable } from '@/features/courier/ui/RidersTable';

export default function RidersPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riders Management</h1>
          <p className="text-slate-500">Manage delivery riders and their assignments.</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary-600/20">
          <Plus className="h-5 w-5 mr-2" /> Add New Rider
        </Button>
      </div>

      <RidersTable />
    </div>
  );
}
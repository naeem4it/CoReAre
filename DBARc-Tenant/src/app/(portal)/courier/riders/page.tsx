'use client';

import { RidersTable } from '@/features/courier/ui/RidersTable';

export default function RidersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Riders Management</h1>
        <p className="text-slate-500">Manage delivery riders, hire new staff, and configure statuses.</p>
      </div>

      <RidersTable />
    </div>
  );
}
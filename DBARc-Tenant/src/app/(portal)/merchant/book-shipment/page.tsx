'use client';

import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/Card';
import { CreateShipmentForm } from '@/features/shipment/ui/CreateShipmentForm';
import { BulkUploadWidget } from '@/features/shipment/ui/BulkUploadWidget';
import { Package, UploadCloud, Plus } from 'lucide-react';

export default function BookShipmentPage() {
  const [bookingMode, setBookingMode] = React.useState<'single' | 'bulk'>('single');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              New Booking
            </span>
            <span className="text-xs text-slate-400">• Real-Time Tracking Assignment</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Book Shipment</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Create single parcel bookings or upload batch spreadsheets for pickup.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setBookingMode('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              bookingMode === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Single Booking
          </button>
          <button
            onClick={() => setBookingMode('bulk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              bookingMode === 'bulk'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Bulk CSV Upload
          </button>
        </div>
      </div>

      {/* Content Area */}
      {bookingMode === 'single' ? (
        <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <CreateShipmentForm />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <BulkUploadWidget />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

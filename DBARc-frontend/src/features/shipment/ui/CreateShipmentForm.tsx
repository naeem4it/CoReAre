'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shipmentSchema, ShipmentFormValues, regions } from '@/entities/shipment/model/shipment.schema';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card, CardContent } from '@/shared/ui/Card';
import { Package, User, MapPin, BadgeDollarSign } from 'lucide-react';

import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';

export const CreateShipmentForm = () => {
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      weight: 0.5,
      codAmount: 0,
    },
  });

  const onSubmit = async (data: ShipmentFormValues) => {
    try {
      // Generate tracking number
      const trackingId = `DBA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      await apiClient.post('/parcels', {
        data: {
          tracking_number: trackingId,
          status: 'created',
          cod_amount: data.codAmount,
          weight: data.weight,
          delivery_charges: 250.00, // Fixed for now
          recipient_name: data.customerName,
          recipient_phone: data.customerPhone,
          recipient_address: data.customerAddress,
          tenant: user?.tenantId,
          shipper: user?.id,
        }
      });

      alert(`Shipment Created! Tracking #: ${trackingId}`);
      reset();
    } catch (err: any) {
      console.error('Failed to create shipment:', err);
      alert('Error: ' + (err.response?.data?.error?.message || 'Failed to create shipment.'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logistics Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800">Shipment Details</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Origin Region</label>
              <select
                {...register('originRegion')}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Select Origin</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.originRegion && <p className="text-xs text-red-500 font-medium">{errors.originRegion.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Destination</label>
              <select
                {...register('destinationRegion')}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Select Destination</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.destinationRegion && <p className="text-xs text-red-500 font-medium">{errors.destinationRegion.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              {...register('weight', { valueAsNumber: true })}
              error={errors.weight?.message}
            />
            <Input
              label="COD Amount (PKR)"
              type="number"
              {...register('codAmount', { valueAsNumber: true })}
              error={errors.codAmount?.message}
              placeholder="0"
            />
          </div>
        </section>

        {/* Customer Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800">Customer Details</h3>
          </div>

          <Input
            label="Full Name"
            placeholder="John Doe"
            {...register('customerName')}
            error={errors.customerName?.message}
          />

          <Input
            label="Phone Number"
            placeholder="+92 300 1234567"
            {...register('customerPhone')}
            error={errors.customerPhone?.message}
          />

          <Input
            label="Complete Address"
            placeholder="House #, Street, Area..."
            {...register('customerAddress')}
            error={errors.customerAddress?.message}
          />
        </section>
      </div>

      <Card className="bg-slate-50 border-dashed border-2">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-600">
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
              <BadgeDollarSign className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Estimated Delivery Charge</p>
              <p className="text-2xl font-bold text-slate-900">PKR 250.00</p>
            </div>
          </div>
          <Button size="lg" type="submit" isLoading={isSubmitting} className="px-12 rounded-xl">
            Book Shipment
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shipmentSchema, ShipmentFormValues } from '@/entities/shipment/model/shipment.schema';
import { PakistanLocationSelect } from '@/shared/ui/PakistanLocationSelect';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card, CardContent } from '@/shared/ui/Card';
import { Package, User, MapPin, BadgeDollarSign, Navigation } from 'lucide-react';

import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';

const PAKISTAN_CITY_COORDINATES = [
  { name: 'Lahore', lat: 31.5497, lng: 74.3436 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
  { name: 'Multan', lat: 30.1575, lng: 71.5249 },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750 },
  { name: 'Sialkot', lat: 32.4945, lng: 74.5229 },
  { name: 'Gujranwala', lat: 32.1877, lng: 74.1945 },
  { name: 'Hyderabad', lat: 25.3960, lng: 68.3578 },
  { name: 'Sukkur', lat: 27.7052, lng: 68.8574 },
  { name: 'Bahawalpur', lat: 29.3544, lng: 71.6911 },
  { name: 'Sargodha', lat: 32.0836, lng: 72.6711 },
  { name: 'Abbottabad', lat: 34.1688, lng: 73.2215 },
  { name: 'Mardan', lat: 34.1989, lng: 72.0404 },
  { name: 'Muzaffarabad', lat: 34.3597, lng: 73.4711 },
  { name: 'Gilgit', lat: 35.9221, lng: 74.3087 },
  { name: 'Mirpur', lat: 33.1484, lng: 73.7519 },
  { name: 'Gwadar', lat: 25.1216, lng: 62.3254 },
];

export const CreateShipmentForm = () => {
  const { user } = useAuthStore();
  const defaultOutletId = user?.outlets && user.outlets.length > 0 ? String(user.outlets[0].id) : '';
  const [isDetectingLocation, setIsDetectingLocation] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema) as any,
    defaultValues: {
      sourceCity: '' as any,
      destinationCity: '' as any,
      weight: 0.5,
      codAmount: 0,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      pickupLocation: defaultOutletId,
    },
  });

  const sourceCityVal = watch('sourceCity');
  const destCityVal = watch('destinationCity');
  const weightVal = watch('weight') || 0.5;

  const estimatedCharges = React.useMemo(() => {
    if (!sourceCityVal || !destCityVal) return 250;
    const isSameCity = String(sourceCityVal).toLowerCase().trim() === String(destCityVal).toLowerCase().trim();
    const baseRate = isSameCity ? 180 : 280;
    const extraWeight = Math.max(0, (Number(weightVal) || 0.5) - 1);
    return Math.round(baseRate + extraWeight * 80);
  }, [sourceCityVal, destCityVal, weightVal]);

  const handleDetectOriginLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingLocation(false);
        const { latitude, longitude } = position.coords;
        let closest = PAKISTAN_CITY_COORDINATES[0];
        let minDist = Infinity;
        for (const city of PAKISTAN_CITY_COORDINATES) {
          const dist = Math.hypot(city.lat - latitude, city.lng - longitude);
          if (dist < minDist) {
            minDist = dist;
            closest = city;
          }
        }
        setValue('sourceCity', closest.name, { shouldValidate: true });
      },
      (err) => {
        setIsDetectingLocation(false);
        console.warn('Geolocation detection error:', err);
        alert('Could not detect location. Please select your origin city manually.');
      },
      { timeout: 10000 }
    );
  };

  const onSubmit = async (data: ShipmentFormValues) => {
    try {
      // Generate tracking number
      const trackingId = `DBA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      await apiClient.post('/parcels', {
        data: {
          tracking_number: trackingId,
          status: 'Total Booking',
          cod_amount: data.codAmount,
          weight: data.weight,
          delivery_charges: estimatedCharges,
          recipient_name: data.customerName,
          recipient_phone: data.customerPhone,
          recipient_address: data.customerAddress,
          source_city: data.sourceCity,
          destination_city: data.destinationCity,
          tenant: user?.tenantId,
          shipper: user?.id,
          pickup_location: data.pickupLocation ? Number(data.pickupLocation) : null,
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
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Origin City / Tehsil</label>
                <button
                  type="button"
                  onClick={handleDetectOriginLocation}
                  disabled={isDetectingLocation}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  <Navigation className={`h-3 w-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                  {isDetectingLocation ? 'Detecting...' : 'Auto-Detect Location'}
                </button>
              </div>
              <Controller
                name="sourceCity"
                control={control}
                render={({ field }) => (
                  <PakistanLocationSelect
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val)}
                    placeholder="Select Origin Location"
                    error={errors.sourceCity?.message}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Destination City / Tehsil</label>
              <Controller
                name="destinationCity"
                control={control}
                render={({ field }) => (
                  <PakistanLocationSelect
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val)}
                    placeholder="Select Destination Location"
                    error={errors.destinationCity?.message}
                  />
                )}
              />
            </div>
          </div>

          {user?.outlets && user.outlets.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Pickup Outlet/Location</label>
              <select
                {...register('pickupLocation')}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {user.outlets.length > 1 && <option value="">Select Pickup Outlet</option>}
                {user.outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name || outlet.id}
                  </option>
                ))}
              </select>
              {errors.pickupLocation && <p className="text-xs text-red-500 font-medium">{errors.pickupLocation.message}</p>}
            </div>
          )}

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
              <p className="text-2xl font-bold text-slate-900">PKR {estimatedCharges.toFixed(2)}</p>
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

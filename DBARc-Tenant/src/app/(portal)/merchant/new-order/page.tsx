import { CreateShipmentForm } from '@/features/shipment/ui/CreateShipmentForm';
import { BulkUploadWidget } from '@/features/shipment/ui/BulkUploadWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function NewOrderPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Shipment</h1>
        <p className="text-slate-500">Book single parcels or upload in bulk using a CSV file.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Single Shipment Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateShipmentForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Shipment Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <BulkUploadWidget />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

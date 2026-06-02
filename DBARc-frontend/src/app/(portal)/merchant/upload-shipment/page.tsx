import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function UploadShipmentPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Upload Shipment</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Upload shipment manifests and bulk package information here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

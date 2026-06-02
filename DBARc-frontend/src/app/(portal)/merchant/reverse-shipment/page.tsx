import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function ReverseShipmentPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Reverse Shipment</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Manage reverse shipments and returns for your merchant orders.</p>
        </CardContent>
      </Card>
    </div>
  );
}

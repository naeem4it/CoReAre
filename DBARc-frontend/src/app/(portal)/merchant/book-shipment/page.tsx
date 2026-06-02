import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function BookShipmentPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Book Shipment</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Book a new shipment and manage merchant pickup and delivery details.</p>
        </CardContent>
      </Card>
    </div>
  );
}

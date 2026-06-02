import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function PickupInformationPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Pickup Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">View and manage pickup details for shipments in the merchant portal.</p>
        </CardContent>
      </Card>
    </div>
  );
}

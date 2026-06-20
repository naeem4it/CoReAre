import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function ShipperAdvisePage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Shipper Advise</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Manage shipper advice notes, announcements, and action items.</p>
        </CardContent>
      </Card>
    </div>
  );
}

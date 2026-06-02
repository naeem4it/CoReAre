import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function CustomerInvoicePage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Customer Invoice</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Access customer invoices and billing history for merchant shipments.</p>
        </CardContent>
      </Card>
    </div>
  );
}

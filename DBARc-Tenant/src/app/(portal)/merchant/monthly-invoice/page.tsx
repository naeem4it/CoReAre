import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function MonthlyInvoicePage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Monthly Invoice</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Generate and review monthly invoice summaries for merchant accounts.</p>
        </CardContent>
      </Card>
    </div>
  );
}

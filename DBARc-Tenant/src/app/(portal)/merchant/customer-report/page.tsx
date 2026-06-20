import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function CustomerReportPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Customer Report</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">View merchant customer reports and analytics summaries.</p>
        </CardContent>
      </Card>
    </div>
  );
}

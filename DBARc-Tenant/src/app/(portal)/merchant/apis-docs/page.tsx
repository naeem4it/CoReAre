import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function ApisDocsPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>APIs Docs</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Review merchant portal API documentation and integration guides.</p>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200 shadow-lg shadow-slate-200/20">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-600">Update your merchant portal password and security settings.</p>
        </CardContent>
      </Card>
    </div>
  );
}

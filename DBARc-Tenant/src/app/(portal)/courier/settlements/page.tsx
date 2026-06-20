import { CODSettlements } from '@/features/finance/ui/CODSettlements';

export default function CourierSettlementsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Merchant COD Settlements</h1>
        <p className="text-slate-500">Calculate net payables and reconcile collected COD with merchants.</p>
      </div>

      <CODSettlements />
    </div>
  );
}

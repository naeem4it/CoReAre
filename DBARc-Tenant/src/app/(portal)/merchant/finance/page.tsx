import { WalletDashboard } from '@/features/finance/ui/WalletDashboard';
import { LedgerTable } from '@/features/finance/ui/LedgerTable';

export default function MerchantFinancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Ledger</h1>
        <p className="text-slate-500">Track your COD collections, delivery charges, and withdrawals.</p>
      </div>

      <WalletDashboard />
      <LedgerTable />
    </div>
  );
}

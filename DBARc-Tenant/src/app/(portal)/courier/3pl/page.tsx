import { TPLPartnersList } from '@/features/courier/ui/TPLPartnersList';
import { CoverageRules } from '@/features/courier/ui/CoverageRules';
import { RateCardMatrix } from '@/features/courier/ui/RateCardMatrix';
import { Truck, MapPin, BadgeDollarSign, Settings2 } from 'lucide-react';

export default function TPLConfigPage() {
  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">3PL & Routing Engine</h1>
          <p className="text-slate-500 text-sm mt-1">Configure third-party logistics partners, coverage rules, and pricing matrix.</p>
        </div>
      </div>

      <div className="space-y-10">
        <section className="w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Integrated Partners</h2>
          </div>
          <TPLPartnersList />
        </section>

        <section className="w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Auto-Routing & Coverage Rules</h2>
          </div>
          <CoverageRules />
        </section>

        <section className="w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <BadgeDollarSign className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Inter-Courier Rate Cards</h2>
          </div>
          <RateCardMatrix />
        </section>
      </div>
    </div>
  );
}

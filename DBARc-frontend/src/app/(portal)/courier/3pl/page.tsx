import { TPLPartnersList } from '@/features/courier/ui/TPLPartnersList';
import { CoverageRules } from '@/features/courier/ui/CoverageRules';
import { RateCardMatrix } from '@/features/courier/ui/RateCardMatrix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/Tabs';
import { Truck, MapPin, BadgeDollarSign, Settings2 } from 'lucide-react';

export default function TPLConfigPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">3PL & Routing Engine</h1>
          <p className="text-slate-500 mt-1">Configure third-party logistics partners, coverage rules, and pricing matrix.</p>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Truck className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">Integrated Partners</h2>
          </div>
          <TPLPartnersList />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">Auto-Routing & Coverage Rules</h2>
          </div>
          <CoverageRules />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <BadgeDollarSign className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">Inter-Courier Rate Cards</h2>
          </div>
          <RateCardMatrix />
        </section>
      </div>
    </div>
  );
}

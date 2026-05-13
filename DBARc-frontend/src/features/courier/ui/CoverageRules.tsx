'use client';

import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { regions } from '@/entities/shipment/model/shipment.schema';
import { mockTPLPartners } from '@/entities/courier/model/tpl.model';
import { cn } from '@/shared/lib/utils';
import { MapPin, ShieldCheck, Truck, ArrowRight } from 'lucide-react';

export const CoverageRules = () => {
  const [selectedRegion, setSelectedRegion] = React.useState<string>(regions[0]);
  const [regionConfig, setRegionConfig] = React.useState<Record<string, string | null>>({});

  const assignPartner = (partnerId: string | null) => {
    setRegionConfig({ ...regionConfig, [selectedRegion]: partnerId });
  };

  const currentPartnerId = regionConfig[selectedRegion] || null;
  const currentPartner = mockTPLPartners.find(p => p.id === currentPartnerId);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[500px]">
      {/* Left: Regions List */}
      <Card className="lg:w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 text-sm">
          Select Coverage Region
        </div>
        <CardContent className="p-0 overflow-y-auto">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={cn(
                'w-full text-left px-6 py-4 flex items-center justify-between transition-colors border-b last:border-0 border-slate-100',
                selectedRegion === region ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
              )}
            >
              <div className="flex items-center gap-3">
                <MapPin className={cn('h-4 w-4', selectedRegion === region ? 'text-primary-600' : 'text-slate-400')} />
                <span>{region}</span>
              </div>
              {regionConfig[region] ? (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">3PL</span>
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Right: Configuration Panel */}
      <Card className="flex-1">
        <CardContent className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Coverage Engine: {selectedRegion}</h2>
            <p className="text-slate-500">Configure how parcels for {selectedRegion} should be routed.</p>
          </div>

          <div className="space-y-6">
            <div 
              className={cn(
                'p-6 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between',
                !currentPartnerId ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 bg-white'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', !currentPartnerId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Direct Coverage</h4>
                  <p className="text-sm text-slate-500">Parcels are delivered by our own rider fleet.</p>
                </div>
              </div>
              <Button 
                variant={!currentPartnerId ? 'primary' : 'outline'} 
                className="rounded-xl"
                onClick={() => assignPartner(null)}
              >
                {!currentPartnerId ? 'Active' : 'Enable Direct'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-500 font-bold">Or outsource to partner</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mockTPLPartners.filter(p => p.status === 'active').map((partner) => (
                <div 
                  key={partner.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-300 flex items-center justify-between',
                    currentPartnerId === partner.id ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-bold">
                      {partner.logo}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{partner.name}</h4>
                      <p className="text-xs text-slate-500">Cost: Grade A Agreement</p>
                    </div>
                  </div>
                  <Button 
                    variant={currentPartnerId === partner.id ? 'primary' : 'ghost'} 
                    size="sm"
                    className="rounded-lg"
                    onClick={() => assignPartner(partner.id)}
                  >
                    {currentPartnerId === partner.id ? 'Selected' : 'Select Partner'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

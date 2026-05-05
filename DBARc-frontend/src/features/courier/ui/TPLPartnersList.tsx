'use client';

import * as React from 'react';
import { mockTPLPartners, TPLPartner } from '../model/tpl.model';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Settings2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export const TPLPartnersList = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {mockTPLPartners.map((partner) => (
        <Card key={partner.id} hoverEffect className="relative overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-900 text-xl border border-slate-200">
                {partner.logo}
              </div>
              <span className={cn(
                'text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider',
                partner.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              )}>
                {partner.status}
              </span>
            </div>
            
            <h3 className="font-bold text-slate-900 mb-1">{partner.name}</h3>
            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> {partner.integrationType} Integration
            </p>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs">
                Configure
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
          <div className="absolute top-0 left-0 h-1 w-full bg-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>
      ))}
    </div>
  );
};

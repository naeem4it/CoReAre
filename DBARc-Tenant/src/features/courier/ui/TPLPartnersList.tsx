'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Settings2, CheckCircle2, XCircle, ExternalLink, Network, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';

export const TPLPartnersList = () => {
  const [partners, setPartners] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPartners = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get('/tpl-partner/list');
        const items = res.data?.data || [];
        setPartners(items.map((i: any) => ({
          id: i.id,
          name: i.attributes?.name || i.name,
          status: i.attributes?.status || i.status || 'active',
          provider_code: i.attributes?.provider_code || i.provider_code,
          environment: i.attributes?.environment || i.environment || 'sandbox',
          is_preferred: i.attributes?.is_preferred || i.is_preferred,
        })));
      } catch (err) {
        console.error('Failed to load partners from database:', err);
        setPartners([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading integrated 3PL partners from database...</div>;
  }

  if (partners.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
        <Network className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-700">No 3PL Partners Configured Yet</h4>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          No external courier networks have been configured in the database yet. Set up Trax, PostEx, Leopards, or TCS to automate 3PL dispatches.
        </p>
        <Link href="/admin/tpl-setup" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Setup 3PL Partners
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {partners.map((partner) => (
        <Card key={partner.id} hoverEffect className="relative overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-900 text-xl border border-slate-200 uppercase">
                {partner.provider_code?.substring(0, 3) || '3PL'}
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
              <Settings2 className="h-3 w-3" /> {partner.environment} mode
            </p>

            <div className="flex gap-2">
              <Link href="/admin/tpl-setup" className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-lg text-xs">
                  Configure
                </Button>
              </Link>
            </div>
          </CardContent>
          <div className="absolute top-0 left-0 h-1 w-full bg-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>
      ))}
    </div>
  );
};

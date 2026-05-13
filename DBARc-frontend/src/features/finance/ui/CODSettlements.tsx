'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { mockSettlementShippers } from '@/entities/finance/model/finance.model';
import { Users, Calendar, Calculator, CheckCircle2, BadgePercent } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export const CODSettlements = () => {
  const [selectedShipper, setSelectedShipper] = React.useState(mockSettlementShippers[0]);
  const [commissionRate, setCommissionRate] = React.useState(5); // 5%
  const [isSettled, setIsSettled] = React.useState(false);

  const rawCod = selectedShipper.pendingCod;
  const commission = (rawCod * commissionRate) / 100;
  const gst = (commission * 18) / 100;
  const netPayable = rawCod - (commission + gst);

  const handleSettle = () => {
    setIsSettled(true);
    setTimeout(() => setIsSettled(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Shipper Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" /> Select Merchant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mockSettlementShippers.map((shipper) => (
              <button
                key={shipper.id}
                onClick={() => setSelectedShipper(shipper)}
                className={cn(
                  'w-full text-left px-6 py-4 flex flex-col gap-1 border-b last:border-0 transition-colors',
                  selectedShipper.id === shipper.id ? 'bg-primary-50 border-primary-200' : 'hover:bg-slate-50'
                )}
              >
                <span className="font-bold text-slate-900">{shipper.name}</span>
                <span className="text-xs text-slate-500">Unsettled COD: PKR {shipper.pendingCod.toLocaleString()}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right: Settlement Calculator */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          <CardHeader className="border-b bg-slate-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold">Settlement Calculation</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                <span>Range: Apr 1 - Apr 27</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Parameters</label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <BadgePercent className="h-8 w-8 text-primary-600" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-medium">Commission Rate (%)</p>
                      <input 
                        type="number" 
                        value={commissionRate} 
                        onChange={(e) => setCommissionRate(Number(e.target.value))}
                        className="w-full bg-transparent font-bold text-xl outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic">* GST of 18% is applied automatically on the commission amount.</p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total COD Collected</span>
                    <span className="font-bold text-slate-900">PKR {rawCod.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Commission ({commissionRate}%)</span>
                    <span className="font-bold text-red-500">- PKR {commission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">GST on Commission (18%)</span>
                    <span className="font-bold text-red-500">- PKR {gst.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-4 flex justify-between items-end">
                    <span className="text-lg font-bold text-slate-900">Net Payable</span>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary-600">PKR {netPayable.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="bg-primary-600 text-white p-6 rounded-2xl shadow-xl shadow-primary-600/20 relative overflow-hidden">
                  <Calculator className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10" />
                  <h4 className="text-sm font-medium opacity-80 mb-1">Final Settlement For</h4>
                  <p className="text-xl font-bold truncate">{selectedShipper.name}</p>
                  <div className="mt-8">
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Status</p>
                    <p className="text-lg font-bold">READY TO PAY</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSettle}
                  disabled={isSettled}
                  size="lg" 
                  className={cn(
                    'w-full h-16 text-lg font-bold rounded-2xl transition-all duration-500',
                    isSettled ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-black'
                  )}
                >
                  {isSettled ? (
                    <><CheckCircle2 className="mr-2 h-6 w-6" /> Settled & Paid</>
                  ) : (
                    'Mark as Settled & Paid'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          {isSettled && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-500">
               <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-4 scale-110">
                  <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Success!</h3>
                  <p className="text-slate-500 font-medium">Settlement record has been updated.</p>
               </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

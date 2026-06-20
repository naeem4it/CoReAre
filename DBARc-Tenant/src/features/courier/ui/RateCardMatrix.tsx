'use client';

import * as React from 'react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { regions } from '@/entities/shipment/model/shipment.schema';
import { Plus, Save, Trash2, Calculator } from 'lucide-react';

export const RateCardMatrix = () => {
  const [rates, setRates] = React.useState([
    { origin: 'Karachi', destination: 'Lahore', base: 200, addKg: 80 },
    { origin: 'Karachi', destination: 'Islamabad', base: 250, addKg: 100 },
    { origin: 'Lahore', destination: 'Rawalpindi', base: 180, addKg: 60 },
  ]);

  const addRow = () => {
    setRates([...rates, { origin: 'Karachi', destination: 'Karachi', base: 150, addKg: 50 }]);
  };

  const removeRow = (index: number) => {
    setRates(rates.filter((_, i) => i !== index));
  };

  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center text-white">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Commercial Rate Matrix</h3>
            <p className="text-xs text-slate-500">Configure financial agreements for 3PL routing.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow} className="rounded-lg h-9">
            <Plus className="h-4 w-4 mr-2" /> Add Route
          </Button>
          <Button variant="primary" size="sm" className="rounded-lg h-9 shadow-lg shadow-primary-600/20">
            <Save className="h-4 w-4 mr-2" /> Save Matrix
          </Button>
        </div>
      </div>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b">
                <th className="px-6 py-4">Origin</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Base Rate (0-1kg)</th>
                <th className="px-6 py-4">Additional Kg Rate</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-3">
                    <select className="bg-transparent font-medium text-slate-900 outline-none focus:ring-1 focus:ring-primary-500 rounded p-1">
                      {regions.map(r => <option key={r} value={r} selected={row.origin === r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    <select className="bg-transparent font-medium text-slate-900 outline-none focus:ring-1 focus:ring-primary-500 rounded p-1">
                      {regions.map(r => <option key={r} value={r} selected={row.destination === r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold text-[10px]">PKR</span>
                      <input 
                        type="number" 
                        defaultValue={row.base}
                        className="w-24 bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold text-[10px]">PKR</span>
                      <input 
                        type="number" 
                        defaultValue={row.addKg}
                        className="w-24 bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rates.length === 0 && (
          <div className="p-12 text-center text-slate-400 italic">
            No rate configurations found. Click "Add Route" to start.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

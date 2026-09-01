'use client';

import * as React from 'react';
import { Transaction } from '@/entities/finance/model/finance.model';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { cn } from '@/shared/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Search, FileDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { apiClient } from '@/shared/api/api-client';

export const LedgerTable = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await apiClient.get('/shipments?populate=*&sort[0]=createdAt:desc&pagination[limit]=50');
        const shipments = res.data?.data || [];
        const mappedTxns: Transaction[] = shipments.map((s: any) => {
          const attr = s.attributes || s;
          const cod = Number(attr.cod_amount || attr.codAmount || 0);
          return {
            id: s.id?.toString() || '',
            date: attr.createdAt ? new Date(attr.createdAt).toISOString().split('T')[0] : '',
            description: `Shipment #${attr.tracking_number || s.id} - ${attr.recipient_name || 'Customer COD'}`,
            amount: cod > 0 ? cod : 250,
            type: cod > 0 ? 'CREDIT' : 'DEBIT',
            status: attr.status === 'Delivered' ? 'COMPLETED' : 'PENDING'
          };
        });
        setTransactions(mappedTxns);
      } catch (err) {
        console.error('Failed to load ledger transactions', err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.includes(searchQuery)
  );

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Ledger Transactions</CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-64 rounded-lg" 
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-lg h-9">
            <FileDown className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No transactions recorded in the database yet.
                  </td>
                </tr>
              ) : (
                filtered.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{txn.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{txn.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center',
                          txn.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        )}>
                          {txn.type === 'CREDIT' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <span className="font-medium text-slate-900">{txn.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        txn.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      )}>
                        {txn.status}
                      </span>
                    </td>
                    <td className={cn(
                      'px-6 py-4 text-right font-bold text-base',
                      txn.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {txn.type === 'CREDIT' ? '+' : '-'} PKR {txn.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

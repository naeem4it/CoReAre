'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Wallet, Clock, CreditCard, ArrowUpRight, TrendingUp } from 'lucide-react';

export const WalletDashboard = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  const stats = [
    { label: 'Available Balance', value: 'PKR 18,450', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending COD', value: 'PKR 4,200', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Delivery Charges', value: 'PKR 2,150', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} hoverEffect className="border-none shadow-md overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-500">
                <TrendingUp className="h-3 w-3" />
                <span>+12.5% this week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
              <Wallet className="h-8 w-8 text-primary-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Withdrawal Service</p>
              <h2 className="text-2xl font-bold">Transfer funds to your bank</h2>
            </div>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            size="lg" 
            className="bg-primary-500 hover:bg-primary-400 text-white font-bold px-8 rounded-xl shadow-lg shadow-primary-500/30"
          >
            Request Withdrawal <ArrowUpRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Request Withdrawal"
        size="md"
      >
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Maximum available</span>
            <span className="font-bold text-slate-900">PKR 18,450.00</span>
          </div>
          
          <Input label="Withdrawal Amount" type="number" placeholder="Enter amount" />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Bank Account</label>
            <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option>Meezan Bank - **** 4821</option>
              <option>HBL - **** 9912</option>
              <option>Standard Chartered - **** 0012</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl shadow-lg shadow-primary-600/20" onClick={() => setIsModalOpen(false)}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

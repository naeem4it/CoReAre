'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { FileText, Plus, Edit2, Trash2, Search, SlidersHorizontal, Settings2 } from 'lucide-react';

interface TenantPlan {
  id: number;
  attributes: {
    name: string;
    charge_type: 'percentage' | 'fixed_rupees';
    charge_value: number;
    max_parcels_per_month: number | null;
    api_access: boolean;
    support_level: string;
    features: any;
  };
}

export default function TenantPlansPage() {
  const [plans, setPlans] = React.useState<TenantPlan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<TenantPlan | null>(null);

  // Form states
  const [formName, setFormName] = React.useState('');
  const [formChargeType, setFormChargeType] = React.useState<'percentage' | 'fixed_rupees'>('percentage');
  const [formChargeValue, setFormChargeValue] = React.useState<number>(2.0);
  const [formMaxParcels, setFormMaxParcels] = React.useState<number | ''>('');
  const [formApiAccess, setFormApiAccess] = React.useState(false);
  const [formSupportLevel, setFormSupportLevel] = React.useState('Standard');

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/tenant-plan/list');
      setPlans(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch plans', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenModal = (plan?: TenantPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormName(plan.attributes.name || '');
      setFormChargeType(plan.attributes.charge_type || 'percentage');
      setFormChargeValue(plan.attributes.charge_value || 0);
      setFormMaxParcels(plan.attributes.max_parcels_per_month || '');
      setFormApiAccess(plan.attributes.api_access || false);
      setFormSupportLevel(plan.attributes.support_level || 'Standard');
    } else {
      setEditingPlan(null);
      setFormName('');
      setFormChargeType('percentage');
      setFormChargeValue(2.0);
      setFormMaxParcels('');
      setFormApiAccess(false);
      setFormSupportLevel('Standard');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formName,
        charge_type: formChargeType,
        charge_value: Number(formChargeValue),
        max_parcels_per_month: formMaxParcels === '' ? null : Number(formMaxParcels),
        api_access: formApiAccess,
        support_level: formSupportLevel,
      };

      if (editingPlan) {
        await apiClient.put(`/tenant-plan/update/${editingPlan.id}`, payload);
      } else {
        await apiClient.post('/tenant-plan/create', payload);
      }
      
      await fetchPlans();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save plan', err);
      alert('Failed to save plan configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await apiClient.delete(`/tenant-plan/delete/${id}`);
      await fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan', err);
      alert('Failed to delete plan');
    }
  };

  const filteredPlans = plans.filter((plan) => 
    (plan.attributes.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">SaaS Plans Configuration</h1>
          <p className="text-slate-500 font-medium">Manage billing plans and features assigned to workspace tenants.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl h-11 px-5 font-bold shadow-md shadow-primary-600/10">
          <Plus className="mr-2 h-4 w-4" /> Create Plan
        </Button>
      </div>

      {/* Directory control bar */}
      <Card className="overflow-hidden border border-slate-200 bg-white/70 backdrop-blur-md shadow-xl shadow-slate-100/40">
        <CardHeader className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-slate-800">Available Plans</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Plan Name</th>
                  <th className="px-6 py-4">Charge Configuration</th>
                  <th className="px-6 py-4">Limits & Access</th>
                  <th className="px-6 py-4">Support Level</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading plans...</td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      No plans found. Create a new plan to get started.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{plan.attributes.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {plan.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {plan.attributes.charge_type === 'percentage' 
                            ? `${plan.attributes.charge_value}% Commission`
                            : `${plan.attributes.charge_value} PKR Fixed Fee`}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Per courier / parcel</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">
                          Max Parcels: <span className="font-semibold">{plan.attributes.max_parcels_per_month || 'Unlimited'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          API Access: {plan.attributes.api_access ? 'Enabled' : 'Disabled'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {plan.attributes.support_level}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(plan)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          className="rounded-lg h-9 font-bold inline-flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingPlan ? "Edit Plan Configuration" : "Create New Plan"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Plan Name"
            placeholder="e.g. Growth Plan"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Charge Type (Per Courier)</label>
              <select
                value={formChargeType}
                onChange={(e) => setFormChargeType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_rupees">Fixed Rupees (PKR)</option>
              </select>
            </div>

            <Input
              label={formChargeType === 'percentage' ? "Commission %" : "Fixed Amount (PKR)"}
              type="number"
              step="0.1"
              min="0"
              value={formChargeValue}
              onChange={(e) => setFormChargeValue(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Max Parcels / Month"
              type="number"
              placeholder="Leave empty for unlimited"
              value={formMaxParcels}
              onChange={(e) => setFormMaxParcels(e.target.value === '' ? '' : Number(e.target.value))}
            />
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Support Level</label>
              <select
                value={formSupportLevel}
                onChange={(e) => setFormSupportLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              >
                <option value="Standard">Standard</option>
                <option value="Priority Email">Priority Email</option>
                <option value="24/7 Dedicated">24/7 Dedicated</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formApiAccess}
                onChange={(e) => setFormApiAccess(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Public API Access</span>
                <p className="text-xs text-slate-400">Allow tenants to integrate via REST API.</p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Plus, Search, Edit2, Trash2, Check, X } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { Input } from '@/components/ui/Input';

interface ShipperPlan {
  id: number;
  attributes: {
    name: string;
    charge_type: 'percentage' | 'fixed_rupees' | 'tier_based';
    charge_value: number;
    rto_charge_type?: 'percentage' | 'fixed_rupees';
    rto_charge_value?: number;
    replacement_charge_type?: 'percentage' | 'fixed_rupees';
    replacement_charge_value?: number;
    cod_charge_type?: 'percentage' | 'fixed_rupees';
    cod_charge_value?: number;
    max_parcels_per_month?: number;
    support_level?: string;
    api_access: boolean;
    shippers?: { data: { id: number; attributes: { name: string } }[] };
  };
}

interface Shipper {
  id: number;
  attributes: {
    name: string;
  };
}

export default function CourierPlansPage() {
  const [plans, setPlans] = React.useState<ShipperPlan[]>([]);
  const [shippers, setShippers] = React.useState<Shipper[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<ShipperPlan | null>(null);
  
  // Form states
  const [formName, setFormName] = React.useState('');
  const [formChargeType, setFormChargeType] = React.useState<'percentage' | 'fixed_rupees' | 'tier_based'>('percentage');
  const [formChargeValue, setFormChargeValue] = React.useState<number>(0);
  const [formRtoChargeType, setFormRtoChargeType] = React.useState<'percentage' | 'fixed_rupees'>('percentage');
  const [formRtoChargeValue, setFormRtoChargeValue] = React.useState<number>(0);
  const [formReplacementChargeType, setFormReplacementChargeType] = React.useState<'percentage' | 'fixed_rupees'>('percentage');
  const [formReplacementChargeValue, setFormReplacementChargeValue] = React.useState<number>(0);
  const [formCodChargeType, setFormCodChargeType] = React.useState<'percentage' | 'fixed_rupees'>('percentage');
  const [formCodChargeValue, setFormCodChargeValue] = React.useState<number>(0);
  const [formApiAccess, setFormApiAccess] = React.useState(false);
  const [selectedShipperIds, setSelectedShipperIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    fetchPlans();
    fetchShippers();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/shipper-plan/list');
      setPlans(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch shipper plans:', err);
    }
  };

  const fetchShippers = async () => {
    try {
      // Fetching shippers using standard Strapi core route
      const res = await apiClient.get('/shippers');
      setShippers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch shippers:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName('');
    setFormChargeType('percentage');
    setFormChargeValue(0);
    setFormRtoChargeType('percentage');
    setFormRtoChargeValue(0);
    setFormReplacementChargeType('percentage');
    setFormReplacementChargeValue(0);
    setFormCodChargeType('percentage');
    setFormCodChargeValue(0);
    setFormApiAccess(false);
    setSelectedShipperIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: ShipperPlan) => {
    setEditingPlan(plan);
    setFormName(plan.attributes.name || '');
    setFormChargeType(plan.attributes.charge_type || 'percentage');
    setFormChargeValue(plan.attributes.charge_value || 0);
    setFormRtoChargeType(plan.attributes.rto_charge_type || 'percentage');
    setFormRtoChargeValue(plan.attributes.rto_charge_value || 0);
    setFormReplacementChargeType(plan.attributes.replacement_charge_type || 'percentage');
    setFormReplacementChargeValue(plan.attributes.replacement_charge_value || 0);
    setFormCodChargeType(plan.attributes.cod_charge_type || 'percentage');
    setFormCodChargeValue(plan.attributes.cod_charge_value || 0);
    setFormApiAccess(plan.attributes.api_access || false);
    
    if (plan.attributes.shippers?.data) {
      setSelectedShipperIds(plan.attributes.shippers.data.map(s => s.id));
    } else {
      setSelectedShipperIds([]);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await apiClient.delete(`/shipper-plan/delete/${id}`);
      fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        charge_type: formChargeType,
        charge_value: Number(formChargeValue),
        rto_charge_type: formRtoChargeType,
        rto_charge_value: Number(formRtoChargeValue),
        replacement_charge_type: formReplacementChargeType,
        replacement_charge_value: Number(formReplacementChargeValue),
        cod_charge_type: formCodChargeType,
        cod_charge_value: Number(formCodChargeValue),
        api_access: formApiAccess,
        shippers: selectedShipperIds
      };

      if (editingPlan) {
        await apiClient.put(`/shipper-plan/update/${editingPlan.id}`, payload);
      } else {
        await apiClient.post('/shipper-plan/create', payload);
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error('Failed to save plan:', err);
    }
  };

  const toggleShipperSelection = (id: number) => {
    setSelectedShipperIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const filteredPlans = plans.filter(p => 
    p.attributes.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipper Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Manage billing plans and features for your shippers.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Plan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search plans by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group">
            <div className="p-5 border-b border-slate-100 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg text-slate-900">{plan.attributes.name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200`}>
                  {plan.attributes.charge_type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="flex items-end gap-2 mb-6">
                <span className="text-3xl font-bold text-slate-900">
                  {plan.attributes.charge_type === 'percentage' ? `${plan.attributes.charge_value}%` : `Rs ${plan.attributes.charge_value}`}
                </span>
                <span className="text-sm text-slate-500 mb-1 font-medium">/ delivery</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-5 flex justify-center"><Check className="w-4 h-4 text-emerald-500" /></div>
                  COD Fee: {plan.attributes.cod_charge_type === 'percentage' ? `${plan.attributes.cod_charge_value}%` : `Rs ${plan.attributes.cod_charge_value}`}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-5 flex justify-center"><Check className="w-4 h-4 text-emerald-500" /></div>
                  RTO Fee: {plan.attributes.rto_charge_type === 'percentage' ? `${plan.attributes.rto_charge_value}%` : `Rs ${plan.attributes.rto_charge_value}`}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-5 flex justify-center"><Check className="w-4 h-4 text-emerald-500" /></div>
                  Replacement Fee: {plan.attributes.replacement_charge_type === 'percentage' ? `${plan.attributes.replacement_charge_value}%` : `Rs ${plan.attributes.replacement_charge_value}`}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-5 flex justify-center">
                    {plan.attributes.api_access ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  </div>
                  <span className={!plan.attributes.api_access ? 'text-slate-400 line-through' : ''}>API Integration</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {plan.attributes.shippers?.data?.length || 0} Businesses Assigned
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(plan)}
                  className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                  title="Edit Plan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPlans.length === 0 && (
          <div className="col-span-full py-12 bg-white rounded-xl border border-slate-200 border-dashed text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-900">No plans found</h3>
            <p className="text-sm text-slate-500 mt-1">Adjust your search or create a new plan.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPlan ? 'Edit Shipper Plan' : 'Create Shipper Plan'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="plan-form" onSubmit={handleSave} className="space-y-6">
                
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Basic Details</h3>
                  
                  <Input
                    label="Plan Name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Standard Delivery Plan"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Delivery Charge Type</label>
                      <select
                        value={formChargeType}
                        onChange={(e) => setFormChargeType(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_rupees">Fixed Rupees (PKR)</option>
                        <option value="tier_based">Tier Based</option>
                      </select>
                    </div>

                    <Input
                      label="Delivery Charge Value"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formChargeValue}
                      onChange={(e) => setFormChargeValue(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">COD Handling Charge Type</label>
                      <select
                        value={formCodChargeType}
                        onChange={(e) => setFormCodChargeType(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_rupees">Fixed Rupees (PKR)</option>
                      </select>
                    </div>

                    <Input
                      label="COD Handling Charge Value"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formCodChargeValue}
                      onChange={(e) => setFormCodChargeValue(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">RTO (Return) Charge Type</label>
                      <select
                        value={formRtoChargeType}
                        onChange={(e) => setFormRtoChargeType(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_rupees">Fixed Rupees (PKR)</option>
                      </select>
                    </div>

                    <Input
                      label="RTO Charge Value"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formRtoChargeValue}
                      onChange={(e) => setFormRtoChargeValue(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Replacement Charge Type</label>
                      <select
                        value={formReplacementChargeType}
                        onChange={(e) => setFormReplacementChargeType(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_rupees">Fixed Rupees (PKR)</option>
                      </select>
                    </div>

                    <Input
                      label="Replacement Charge Value"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formReplacementChargeValue}
                      onChange={(e) => setFormReplacementChargeValue(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Features & Access</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formApiAccess}
                      onChange={(e) => setFormApiAccess(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">API Access</div>
                      <div className="text-xs text-slate-500">Allow this shipper to integrate via REST API</div>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Assign Shippers (Businesses)</h3>
                  <p className="text-xs text-slate-500">Select one or more businesses that should be on this plan.</p>
                  
                  <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {shippers.length === 0 && (
                      <div className="col-span-full text-center text-sm text-slate-500 py-4">
                        No businesses available to assign.
                      </div>
                    )}
                    {shippers.map(shipper => (
                      <label key={shipper.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-primary-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedShipperIds.includes(shipper.id)}
                          onChange={() => toggleShipperSelection(shipper.id)}
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-slate-900">{shipper.attributes.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="plan-form"
                className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center gap-2 shadow-sm"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

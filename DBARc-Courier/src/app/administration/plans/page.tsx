'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { Plus, Search, Edit2, Trash2, Check, X, Shield, Building2, Layers, Percent, HelpCircle, Scale, Trash } from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { useAuth } from '@/components/AuthProvider';

export interface WeightTier {
  id: string;
  label: string; // e.g. "0.01 to 0.5 kg", "0.51 to 1.0 kg", "1.01 to 2.0 kg", "Additional KG"
}

export interface ZoneRates {
  zoneName: string; // e.g. "Within City", "Zone A", "Zone B", "Zone C", "Zone D"
  tierRates: { [tierId: string]: number }; // rate per weight tier id
  returnCharges: number; // Return charges (RTO)
  insurance: number | string; // Insurance charge or '-'
}

export interface DynamicTariffPlan {
  id: number;
  name: string;
  cashHandlingType: 'percentage' | 'fixed';
  cashHandlingValue: number;
  cashHandlingMinFee?: number;
  weightTiers: WeightTier[];
  zones: ZoneRates[];
  shippers: { id: number; name: string }[];
}

export interface CustomPlanData {
  name: string;
  cashHandlingType: 'percentage' | 'fixed';
  cashHandlingValue: number;
  cashHandlingMinFee?: number;
  rtoChargeValue?: number;
  weightTiers: WeightTier[];
  zones: ZoneRates[];
}

const DEFAULT_WEIGHT_TIERS: WeightTier[] = [
  { id: 'tier_half_kg', label: '0.01 to 0.5 kg' },
  { id: 'tier_one_kg', label: '0.51 to 1.0 kg' },
  { id: 'tier_add_kg', label: 'Additional KG' },
];

const DEFAULT_ZONES: ZoneRates[] = [
  { zoneName: 'Within City', tierRates: { tier_half_kg: 135, tier_one_kg: 150, tier_add_kg: 150 }, returnCharges: 50, insurance: '-' },
  { zoneName: 'Zone A', tierRates: { tier_half_kg: 165, tier_one_kg: 180, tier_add_kg: 180 }, returnCharges: 50, insurance: '-' },
  { zoneName: 'Zone B', tierRates: { tier_half_kg: 175, tier_one_kg: 195, tier_add_kg: 195 }, returnCharges: 100, insurance: '-' },
  { zoneName: 'Zone C', tierRates: { tier_half_kg: 185, tier_one_kg: 205, tier_add_kg: 205 }, returnCharges: 100, insurance: '-' },
  { zoneName: 'Zone D', tierRates: { tier_half_kg: 195, tier_one_kg: 220, tier_add_kg: 220 }, returnCharges: 100, insurance: '-' },
];
const DEFAULT_STANDARD_PLAN: DynamicTariffPlan = {
  id: 1,
  name: 'Standard Tariff Plan',
  cashHandlingType: 'percentage',
  cashHandlingValue: 1.5,
  cashHandlingMinFee: 30,
  weightTiers: DEFAULT_WEIGHT_TIERS,
  zones: DEFAULT_ZONES,
  shippers: []
};

export default function TariffPlansPage() {
  const { user, activeBusinessId } = useAuth();
  const [plans, setPlans] = React.useState<DynamicTariffPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = React.useState<number>(1);
  const [shippersList, setShippersList] = React.useState<any[]>([]);
  const [selectedShipperFilter, setSelectedShipperFilter] = React.useState<number | 'all'>('all');
  const [shipperAssignPlanId, setShipperAssignPlanId] = React.useState<number>(1);
  const [isAssigningPlan, setIsAssigningPlan] = React.useState(false);

  // Custom Plan Modal state for filtered shipper
  const [isCustomPlanModalOpen, setIsCustomPlanModalOpen] = React.useState(false);
  const [customPlanDraft, setCustomPlanDraft] = React.useState<CustomPlanData>({
    name: '',
    cashHandlingType: 'percentage',
    cashHandlingValue: 1.5,
    cashHandlingMinFee: 30,
    rtoChargeValue: 50,
    weightTiers: JSON.parse(JSON.stringify(DEFAULT_WEIGHT_TIERS)),
    zones: JSON.parse(JSON.stringify(DEFAULT_ZONES)),
  });
  const [isSavingCustomPlan, setIsSavingCustomPlan] = React.useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<DynamicTariffPlan | null>(null);

  // Form states for Modal
  const [formName, setFormName] = React.useState('');
  const [formCashHandlingType, setFormCashHandlingType] = React.useState<'percentage' | 'fixed'>('percentage');
  const [formCashHandlingValue, setFormCashHandlingValue] = React.useState<number>(1.5);
  const [formCashHandlingMinFee, setFormCashHandlingMinFee] = React.useState<number>(30);
  const [formWeightTiers, setFormWeightTiers] = React.useState<WeightTier[]>(DEFAULT_WEIGHT_TIERS);
  const [formZones, setFormZones] = React.useState<ZoneRates[]>(DEFAULT_ZONES);
  const [selectedShipperIds, setSelectedShipperIds] = React.useState<number[]>([]);

  const isShipper = Array.isArray(user?.shipper) ? user.shipper.length > 0 : !!user?.shipper;

  // Fetch plans and shippers strictly from database
  const fetchMetadata = async () => {
    try {
      const [shippersRes, plansRes] = await Promise.all([
        apiClient.get('/shippers/with-plans').catch(() => apiClient.get('/shippers?populate=*')).catch(() => null),
        apiClient.get('/shipper-plan/list').catch(() => apiClient.get('/shipper-plans')).catch(() => null),
      ]);

      if (shippersRes?.data?.data) {
        setShippersList(shippersRes.data.data);
      }

      if (plansRes?.data?.data && plansRes.data.data.length > 0) {
        const loadedPlans: DynamicTariffPlan[] = plansRes.data.data.map((item: any) => ({
          id: item.id,
          name: item.name || 'Custom Tariff Plan',
          cashHandlingType: item.cash_handling_type || 'percentage',
          cashHandlingValue: Number(item.cash_handling_value) || 1.5,
          cashHandlingMinFee: Number(item.cash_handling_min_fee) || 30,
          weightTiers: item.weight_tiers?.length > 0 ? item.weight_tiers : DEFAULT_WEIGHT_TIERS,
          zones: item.zones?.length > 0 ? item.zones : DEFAULT_ZONES,
          shippers: (item.shippers || []).map((s: any) => ({
            id: s.id,
            name: s.name || `Shipper #${s.id}`,
          })),
        }));
        setPlans(loadedPlans);
        setSelectedPlanId(loadedPlans[0].id);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to fetch tariff metadata from database:', err);
      setPlans([]);
    }
  };

  React.useEffect(() => {
    fetchMetadata();
  }, []);

  // Selected active plan
  const activePlan = React.useMemo(() => {
    if (isShipper) {
      if (activeBusinessId) {
        const assigned = plans.find(p => p.shippers.some(s => s.id === activeBusinessId));
        if (assigned) return assigned;
      }
      return plans[0];
    }
    return plans.find(p => p.id === selectedPlanId) || plans[0];
  }, [plans, isShipper, activeBusinessId, selectedPlanId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName('');
    setFormCashHandlingType('percentage');
    setFormCashHandlingValue(1.5);
    setFormCashHandlingMinFee(30);
    setFormWeightTiers(JSON.parse(JSON.stringify(DEFAULT_WEIGHT_TIERS)));
    setFormZones(JSON.parse(JSON.stringify(DEFAULT_ZONES)));
    setSelectedShipperIds([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan: DynamicTariffPlan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormCashHandlingType(plan.cashHandlingType);
    setFormCashHandlingValue(plan.cashHandlingValue);
    setFormCashHandlingMinFee(plan.cashHandlingMinFee || 0);
    setFormWeightTiers(JSON.parse(JSON.stringify(plan.weightTiers)));
    setFormZones(JSON.parse(JSON.stringify(plan.zones)));
    setSelectedShipperIds(plan.shippers.map(s => s.id));
    setIsModalOpen(true);
  };

  // Add a new dynamic weight tier row (Admin only)
  const handleAddWeightTier = () => {
    const nextTierNum = formWeightTiers.length + 1;
    const newTierId = `tier_custom_${Date.now()}`;
    const newTierLabel = `Custom Tier ${nextTierNum}`;
    
    setFormWeightTiers(prev => [...prev, { id: newTierId, label: newTierLabel }]);
    
    // Add default zero rate for the new tier across all zones
    setFormZones(prev => prev.map(zone => ({
      ...zone,
      tierRates: {
        ...zone.tierRates,
        [newTierId]: 0
      }
    })));
  };

  // Update a weight tier label
  const handleUpdateWeightTierLabel = (tierId: string, newLabel: string) => {
    setFormWeightTiers(prev => prev.map(t => t.id === tierId ? { ...t, label: newLabel } : t));
  };

  // Remove a dynamic weight tier row
  const handleRemoveWeightTier = (tierId: string) => {
    if (formWeightTiers.length <= 1) {
      alert('You must have at least one weight tier configured.');
      return;
    }
    setFormWeightTiers(prev => prev.filter(t => t.id !== tierId));
    setFormZones(prev => prev.map(zone => {
      const updatedRates = { ...zone.tierRates };
      delete updatedRates[tierId];
      return {
        ...zone,
        tierRates: updatedRates
      };
    }));
  };

  // Update rate for specific zone and tier
  const handleUpdateTierRate = (zoneIndex: number, tierId: string, rate: number) => {
    setFormZones(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[zoneIndex].tierRates) copy[zoneIndex].tierRates = {};
      copy[zoneIndex].tierRates[tierId] = rate;
      return copy;
    });
  };

  // Update return charges or insurance for zone
  const handleUpdateZoneMeta = (zoneIndex: number, field: 'returnCharges' | 'insurance', value: any) => {
    setFormZones(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[zoneIndex][field] = value;
      return copy;
    });
  };

  // Save changes from Modal (Create or Edit)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const assignedShippers = selectedShipperIds.map(id => {
      const found = shippersList.find(s => s.id === id);
      return { id, name: found?.attributes?.name || found?.name || `Shipper #${id}` };
    });

    const payload = {
      data: {
        name: formName,
        cash_handling_type: formCashHandlingType,
        cash_handling_value: Number(formCashHandlingValue),
        cash_handling_min_fee: Number(formCashHandlingMinFee),
        weight_tiers: formWeightTiers,
        zones: formZones,
        shippers: selectedShipperIds,
      }
    };

    try {
      if (editingPlan) {
        await apiClient.put(`/shipper-plans/${editingPlan.id}`, payload).catch(() => null);
        const updated = plans.map(p => {
          if (p.id === editingPlan.id) {
            return {
              ...p,
              name: formName,
              cashHandlingType: formCashHandlingType,
              cashHandlingValue: Number(formCashHandlingValue),
              cashHandlingMinFee: Number(formCashHandlingMinFee),
              weightTiers: formWeightTiers,
              zones: formZones,
              shippers: assignedShippers
            };
          }
          return p;
        });
        setPlans(updated);
      } else {
        const createRes = await apiClient.post('/shipper-plans', payload).catch(() => null);
        const newPlan: DynamicTariffPlan = {
          id: createRes?.data?.data?.id || Date.now(),
          name: formName,
          cashHandlingType: formCashHandlingType,
          cashHandlingValue: Number(formCashHandlingValue),
          cashHandlingMinFee: Number(formCashHandlingMinFee),
          weightTiers: formWeightTiers,
          zones: formZones,
          shippers: assignedShippers
        };
        setPlans(prev => [...prev, newPlan]);
        setSelectedPlanId(newPlan.id);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.warn('Plan save locally persisted:', err);
      setIsModalOpen(false);
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (plans.length <= 1) {
      alert('You must have at least one tariff plan in the system.');
      return;
    }
    if (confirm('Are you sure you want to delete this tariff plan?')) {
      try {
        await apiClient.delete(`/shipper-plans/${id}`).catch(() => null);
      } catch (e) {
        console.warn('Delete plan request notice:', e);
      }
      const filtered = plans.filter(p => p.id !== id);
      setPlans(filtered);
      setSelectedPlanId(filtered[0].id);
    }
  };

  // Assign or change tariff plan for a specific shipper
  const handleAssignPlanToShipper = async () => {
    if (selectedShipperFilter === 'all') return;
    const shipper = shippersList.find(s => s.id === selectedShipperFilter);
    if (!shipper) return;

    try {
      setIsAssigningPlan(true);
      await apiClient.put(`/shippers/${shipper.id}/assign-plan`, {
        shipper_plan: shipperAssignPlanId
      });
      
      const matchedPlan = plans.find(p => p.id === shipperAssignPlanId);
      
      // Update local shipper in shippersList
      setShippersList(prev => prev.map(s => {
        if (s.id === shipper.id) {
          return {
            ...s,
            shipper_plan: matchedPlan || { id: shipperAssignPlanId, name: `Plan #${shipperAssignPlanId}` }
          };
        }
        return s;
      }));

      // Update shipper list on the plans
      setPlans(prev => prev.map(p => {
        const filteredShippers = (p.shippers || []).filter(s => s.id !== shipper.id);
        if (p.id === shipperAssignPlanId) {
          return {
            ...p,
            shippers: [...filteredShippers, { id: shipper.id, name: shipper.name || `Shipper #${shipper.id}` }]
          };
        }
        return {
          ...p,
          shippers: filteredShippers
        };
      }));

      setSelectedPlanId(shipperAssignPlanId);
      alert(`Successfully updated Tariff Plan to "${matchedPlan?.name || 'Selected Plan'}" for "${shipper.name || 'Shipper'}"!`);
    } catch (err: any) {
      console.error('Failed to assign tariff plan to shipper:', err);
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update tariff plan for shipper.');
    } finally {
      setIsAssigningPlan(false);
    }
  };

  // Open Custom Tariff Plan configuration popup for filtered shipper
  const handleOpenCustomPlanForFilteredShipper = () => {
    if (selectedShipperFilter === 'all') {
      alert('Please select a specific shipper first to configure a custom tariff plan.');
      return;
    }
    const shipper = shippersList.find(s => s.id === selectedShipperFilter);
    const shipperName = shipper?.name || shipper?.attributes?.name || `Shipper #${selectedShipperFilter}`;
    
    // Base it on the active plan or standard plan
    const basePlan = activePlan || plans[0] || DEFAULT_STANDARD_PLAN;
    
    setCustomPlanDraft({
      name: `${shipperName} Custom Plan`,
      cashHandlingType: basePlan.cashHandlingType || 'percentage',
      cashHandlingValue: basePlan.cashHandlingValue || 1.5,
      cashHandlingMinFee: basePlan.cashHandlingMinFee || 30,
      rtoChargeValue: basePlan.zones?.[0]?.returnCharges ?? 50,
      weightTiers: JSON.parse(JSON.stringify(basePlan.weightTiers?.length ? basePlan.weightTiers : DEFAULT_WEIGHT_TIERS)),
      zones: JSON.parse(JSON.stringify(basePlan.zones?.length ? basePlan.zones : DEFAULT_ZONES)),
    });
    setIsCustomPlanModalOpen(true);
  };

  // Save Custom Plan specifically for this shipper
  const handleSaveCustomPlanForShipper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShipperFilter === 'all') return;
    const shipper = shippersList.find(s => s.id === selectedShipperFilter);
    if (!shipper) return;

    if (!customPlanDraft.name.trim()) {
      alert('Please enter a plan name.');
      return;
    }

    try {
      setIsSavingCustomPlan(true);

      const payload = {
        data: {
          name: customPlanDraft.name.trim(),
          cash_handling_type: customPlanDraft.cashHandlingType,
          cash_handling_value: Number(customPlanDraft.cashHandlingValue),
          cash_handling_min_fee: Number(customPlanDraft.cashHandlingMinFee || 0),
          weight_tiers: customPlanDraft.weightTiers,
          zones: customPlanDraft.zones,
          shippers: [shipper.id],
        }
      };

      // 1. Create custom plan in Strapi
      const createRes = await apiClient.post('/shipper-plans', payload);
      const createdPlanData = createRes.data?.data;
      const createdPlanId = createdPlanData?.id || Date.now();

      // 2. Assign plan to shipper
      await apiClient.put(`/shippers/${shipper.id}/assign-plan`, {
        shipper_plan: createdPlanId
      });

      const newPlanObj: DynamicTariffPlan = {
        id: createdPlanId,
        name: customPlanDraft.name.trim(),
        cashHandlingType: customPlanDraft.cashHandlingType,
        cashHandlingValue: Number(customPlanDraft.cashHandlingValue),
        cashHandlingMinFee: Number(customPlanDraft.cashHandlingMinFee || 0),
        weightTiers: customPlanDraft.weightTiers,
        zones: customPlanDraft.zones,
        shippers: [{ id: shipper.id, name: shipper.name || `Shipper #${shipper.id}` }]
      };

      // Update plans list
      setPlans(prev => [...prev.filter(p => p.id !== createdPlanId), newPlanObj]);

      // Update shippersList
      setShippersList(prev => prev.map(s => {
        if (s.id === shipper.id) {
          return {
            ...s,
            shipper_plan: newPlanObj
          };
        }
        return s;
      }));

      // Set active and assigned plan
      setSelectedPlanId(createdPlanId);
      setShipperAssignPlanId(createdPlanId);
      setIsCustomPlanModalOpen(false);

      alert(`Custom tariff plan "${newPlanObj.name}" created and assigned to "${shipper.name || 'Shipper'}" successfully!`);
    } catch (err: any) {
      console.error('Failed to create custom tariff plan for shipper:', err);
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save custom tariff plan for shipper.');
    } finally {
      setIsSavingCustomPlan(false);
    }
  };


  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1 uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Administration & Rate Cards
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">Tariff & Price Plans</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isShipper
                ? 'Your active rate card agreement table for weight tier ranges, regional zones, return charges, and cash handling fees.'
                : 'Configure customizable weight tier ranges, regional zone rates, return charges, insurance rates, and COD handling fees.'}
            </p>
          </div>

          {!isShipper && (
            <button
              onClick={handleOpenCreate}
              className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create New Tariff Plan
            </button>
          )}

          {isShipper && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
              <Building2 className="w-4 h-4 text-emerald-600" /> Active Shipper Agreement (Read-Only)
            </span>
          )}
        </div>

        {/* Courier Admin: Shipper Filter & Fast Plan Assignment */}
        {!isShipper && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
                Filter by Shipper:
              </div>
              <select
                value={selectedShipperFilter}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setSelectedShipperFilter(val);
                  if (val !== 'all') {
                    const sh = shippersList.find(s => s.id === val);
                    const planId = sh?.shipper_plan?.id || (typeof sh?.shipper_plan === 'number' ? sh.shipper_plan : null);
                    const foundPlan = (planId && plans.find(p => p.id === planId)) || plans.find(p => p.shippers?.some(s => s.id === val)) || plans[0];
                    if (foundPlan) {
                      setSelectedPlanId(foundPlan.id);
                      setShipperAssignPlanId(foundPlan.id);
                    }
                  }
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary w-full sm:w-72 cursor-pointer"
              >
                <option value="all">All Shippers (Global Tariff Overview)</option>
                {shippersList.map(sh => (
                  <option key={sh.id} value={sh.id}>
                    {sh.name || `Shipper #${sh.id}`} {sh.shipper_plan?.name ? `(${sh.shipper_plan.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* When specific shipper is filtered, allow changing plan right here */}
            {selectedShipperFilter !== 'all' && (
              <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Change Assigned Plan:</span>
                <select
                  value={shipperAssignPlanId}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      handleOpenCustomPlanForFilteredShipper();
                      return;
                    }
                    const newPlanId = Number(e.target.value);
                    setShipperAssignPlanId(newPlanId);
                    setSelectedPlanId(newPlanId);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="custom" className="font-bold text-primary">
                    + Custom Plan (Configure Rates...)
                  </option>
                </select>
                <button
                  onClick={handleAssignPlanToShipper}
                  disabled={isAssigningPlan}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50 flex items-center gap-1"
                >
                  {isAssigningPlan ? 'Saving...' : 'Save Plan for Shipper'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Admin Plan Selector Tabs */}
        {!isShipper && (
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Select Tariff Plan:</span>
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedPlanId === p.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {activePlan && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(activePlan)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Active Tariff
                </button>
                <button
                  onClick={() => handleDeletePlan(activePlan.id)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* TARIFF & PRICE PLANS MATRIX SECTION (MATCHING REFERENCE IMAGE WITH DYNAMIC ROW TIERS) */}
        {activePlan && (
          <div className="bg-slate-100/70 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
            
            {/* Tariff Matrix Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-3 gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight underline underline-offset-8 decoration-slate-900">
                Tariff & Price Plans
              </h2>
              <div className="text-xs text-slate-600 font-semibold flex items-center gap-2">
                <span className="font-bold text-slate-900">{activePlan.name}</span>
                <span className="text-slate-400">•</span>
                <span>{activePlan.shippers.length} Shipper Accounts Assigned</span>
              </div>
            </div>

            {/* Matrix Table Grid */}
            <div className="overflow-x-auto rounded-2xl shadow-sm">
              <div className="min-w-[900px] grid grid-cols-6 gap-2 bg-slate-200 p-2 rounded-2xl">
                
                {/* Column Headers */}
                {/* 1. Row Header Box */}
                <div className="bg-[#5c6b73] text-white p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="font-bold text-base leading-tight">Weight Charges</span>
                </div>

                {/* 2. Within City Header */}
                <div className="bg-[#5c6b73] text-white p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="font-bold text-base leading-tight">Within City</span>
                </div>

                {/* 3 to 6. Zone Headers (Dynamic Regions) */}
                {activePlan.zones.slice(1).map((z, idx) => (
                  <div key={idx} className="bg-[#5c6b73] text-white p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="font-bold text-base leading-tight">{z.zoneName}</span>
                  </div>
                ))}

                {/* DYNAMIC WEIGHT TIER ROWS (EDITABLE TIERS BY ADMIN) */}
                {activePlan.weightTiers.map((tier) => (
                  <React.Fragment key={tier.id}>
                    <div className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs text-center">
                      {tier.label}
                    </div>
                    {activePlan.zones.map((z, idx) => (
                      <div key={idx} className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                        Rs.{z.tierRates?.[tier.id] ?? '-'}
                      </div>
                    ))}
                  </React.Fragment>
                ))}

                {/* ROW: Return Charges */}
                <div className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                  Return Charges
                </div>
                {activePlan.zones.map((z, idx) => (
                  <div key={idx} className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                    Rs. {z.returnCharges}
                  </div>
                ))}

                {/* ROW: Insurance */}
                <div className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                  Insurance
                </div>
                {activePlan.zones.map((z, idx) => (
                  <div key={idx} className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                    {z.insurance || '-'}
                  </div>
                ))}

              </div>
            </div>

            {/* CASH HANDLING CHARGES BANNER SECTION */}
            <div className="bg-[#cba161] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 shadow-md border border-[#b88e4e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">Cash Handling Charges (Rs.)</h3>
                  <p className="text-xs text-amber-50 font-medium">Applied on collected Cash on Delivery (COD) amounts upon delivery confirmation.</p>
                </div>
              </div>

              <div className="bg-slate-900/40 px-5 py-2.5 rounded-xl border border-white/20 font-bold text-sm tracking-wide">
                {activePlan.cashHandlingType === 'percentage'
                  ? `${activePlan.cashHandlingValue}% of COD Amount (Min Rs. ${activePlan.cashHandlingMinFee || 0})`
                  : `Flat Rs. ${activePlan.cashHandlingValue} per COD Order`
                }
              </div>
            </div>

            {/* Assigned Shippers List */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" /> Accounts Assigned to this Tariff Plan ({activePlan.shippers.length})
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {activePlan.shippers.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No specific shippers assigned (Global default plan).</span>
                ) : (
                  activePlan.shippers.map((s) => (
                    <span key={s.id} className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> {s.name}
                    </span>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* CREATE / EDIT TARIFF PLAN MODAL (COURIER ADMIN ONLY WITH EDITABLE TIER RANGES) */}
        {isModalOpen && !isShipper && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingPlan ? 'Edit Tariff Plan & Weight Tier Ranges' : 'Create New Tariff & Price Plan'}
                  </h2>
                  <p className="text-xs text-slate-500">Configure customizable weight tier ranges, per-zone rates, return charges, and COD fees.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form id="dynamic-tariff-form" onSubmit={handleSavePlan} className="p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* Plan Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Plan Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Corporate Standard Plan"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">COD Charge Type</label>
                    <select
                      value={formCashHandlingType}
                      onChange={(e) => setFormCashHandlingType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="percentage">Percentage (%) of COD</option>
                      <option value="fixed">Fixed Rupees (Rs.) per order</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">COD Charge Value</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formCashHandlingValue}
                      onChange={(e) => setFormCashHandlingValue(Number(e.target.value))}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* DYNAMIC WEIGHT TIER RANGE MANAGER (COURIER ADMIN ONLY) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-primary" /> Weight Tier Range Manager (Courier Admin Only)
                      </h3>
                      <p className="text-[11px] text-slate-500">Add, edit, or remove row weight ranges according to courier-shipper contract.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWeightTier}
                      className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Weight Tier Row
                    </button>
                  </div>

                  {/* List of Editable Weight Tiers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {formWeightTiers.map((tier) => (
                      <div key={tier.id} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-2xs">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdateWeightTierLabel(tier.id, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveWeightTier(tier.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove this weight tier row"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC RATE MATRIX INPUT TABLE */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zone Rates Matrix for Configured Tiers</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#5c6b73] text-white font-bold text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Weight Tier Row Range</th>
                          {formZones.map((z, idx) => (
                            <th key={idx} className="p-3 text-center">{z.zoneName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        
                        {/* Dynamic Weight Tier Rate Rows */}
                        {formWeightTiers.map((tier) => (
                          <tr key={tier.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900 bg-slate-100/80">{tier.label} (Rs)</td>
                            {formZones.map((z, idx) => (
                              <td key={idx} className="p-2 text-center">
                                <input
                                  type="number"
                                  value={z.tierRates?.[tier.id] ?? 0}
                                  onChange={(e) => handleUpdateTierRate(idx, tier.id, Number(e.target.value))}
                                  className="w-20 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold focus:ring-1 focus:ring-primary"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}

                        {/* Return Charges Row */}
                        <tr className="bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 bg-slate-100">Return Charges (Rs)</td>
                          {formZones.map((z, idx) => (
                            <td key={idx} className="p-2 text-center">
                              <input
                                type="number"
                                value={z.returnCharges}
                                onChange={(e) => handleUpdateZoneMeta(idx, 'returnCharges', Number(e.target.value))}
                                className="w-20 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold text-red-600 focus:ring-1 focus:ring-primary"
                              />
                            </td>
                          ))}
                        </tr>

                        {/* Insurance Row */}
                        <tr>
                          <td className="p-3 font-bold text-slate-900 bg-slate-100">Insurance Rate</td>
                          {formZones.map((z, idx) => (
                            <td key={idx} className="p-2 text-center">
                              <input
                                type="text"
                                value={z.insurance}
                                onChange={(e) => handleUpdateZoneMeta(idx, 'insurance', e.target.value)}
                                className="w-20 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold focus:ring-1 focus:ring-primary"
                              />
                            </td>
                          ))}
                        </tr>

                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shipper Assignment */}
                <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Shippers (Businesses) to this Plan</h3>
                  <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50 p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {shippersList.length === 0 ? (
                      <span className="text-xs text-slate-400 col-span-full text-center py-2">No shipper accounts found.</span>
                    ) : (
                      shippersList.map(s => {
                        const sId = s.id;
                        const sName = s.attributes?.name || s.name || `Shipper #${sId}`;
                        const isChecked = selectedShipperIds.includes(sId);
                        return (
                          <label key={sId} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-primary transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedShipperIds(prev =>
                                  prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
                                );
                              }}
                              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800">{sName}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> {editingPlan ? 'Update Tariff Plan' : 'Create Tariff Plan'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* CENTERED POPUP MODAL: Configure Custom Tariff Plan for Shipper */}
        {isCustomPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => !isSavingCustomPlan && setIsCustomPlanModalOpen(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <span className="material-symbols-outlined text-[26px]">tune</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      Configure Custom Tariff Plan
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Tailor custom rates, weight tiers, and cash handling fees for {
                        shippersList.find(s => s.id === selectedShipperFilter)?.name || 'this shipper'
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomPlanModalOpen(false)}
                  disabled={isSavingCustomPlan}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveCustomPlanForShipper} className="p-6 overflow-y-auto space-y-6">
                {/* Plan Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
                    Custom Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Acme VIP Custom Plan"
                    value={customPlanDraft.name}
                    onChange={e => setCustomPlanDraft(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {/* Cash Handling / COD Fees */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                      COD Fee Type
                    </label>
                    <select
                      value={customPlanDraft.cashHandlingType}
                      onChange={e => setCustomPlanDraft(prev => ({ ...prev, cashHandlingType: e.target.value as any }))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                    >
                      <option value="percentage">Percentage (%) of COD</option>
                      <option value="fixed">Fixed Amount (PKR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                      COD Fee Value ({customPlanDraft.cashHandlingType === 'percentage' ? '%' : 'PKR'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customPlanDraft.cashHandlingValue}
                      onChange={e => setCustomPlanDraft(prev => ({ ...prev, cashHandlingValue: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                      Min COD Fee (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customPlanDraft.cashHandlingMinFee}
                      onChange={e => setCustomPlanDraft(prev => ({ ...prev, cashHandlingMinFee: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                {/* Weight Tier & Zone Pricing Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                      Regional Zone Rates & Weight Tiers (PKR)
                    </label>
                    <span className="text-[11px] text-slate-400">All prices in PKR</span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-3">Zone / Region</th>
                          {customPlanDraft.weightTiers.map(t => (
                            <th key={t.id} className="p-3 text-center">{t.label}</th>
                          ))}
                          <th className="p-3 text-center">Return (RTO)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {customPlanDraft.zones.map((zone, zIdx) => (
                          <tr key={zone.zoneName} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900 whitespace-nowrap flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />
                              {zone.zoneName}
                            </td>
                            {customPlanDraft.weightTiers.map(t => (
                              <td key={t.id} className="p-2 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-slate-400 text-[11px]">Rs.</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={zone.tierRates?.[t.id] ?? 0}
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      setCustomPlanDraft(prev => {
                                        const copy = JSON.parse(JSON.stringify(prev));
                                        if (!copy.zones[zIdx].tierRates) copy.zones[zIdx].tierRates = {};
                                        copy.zones[zIdx].tierRates[t.id] = val;
                                        return copy;
                                      });
                                    }}
                                    className="w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary rounded-lg p-1.5 text-center font-bold text-xs outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="p-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-slate-400 text-[11px]">Rs.</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={zone.returnCharges ?? 50}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setCustomPlanDraft(prev => {
                                      const copy = JSON.parse(JSON.stringify(prev));
                                      copy.zones[zIdx].returnCharges = val;
                                      return copy;
                                    });
                                  }}
                                  className="w-20 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary rounded-lg p-1.5 text-center font-bold text-xs outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 italic">
                    * Click Save & Assign Custom Plan to create and assign this tariff plan immediately.
                  </span>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsCustomPlanModalOpen(false)}
                      disabled={isSavingCustomPlan}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCustomPlan}
                      className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingCustomPlan ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Save & Assign Custom Plan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}

'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { 
  Plus, Search, Edit2, Trash2, Check, X, Shield, Building2, Layers, 
  Percent, HelpCircle, Scale, Trash, Sparkles, Truck, Network, 
  CheckCircle2, MapPin, ArrowRight, Sliders, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
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
  plan_type?: 'shipper' | '3pl';
  tpl_partner_id?: number | string;
  tpl_partner_name?: string;
  cashHandlingType: 'percentage' | 'fixed';
  cashHandlingValue: number;
  cashHandlingMinFee?: number;
  fafRate?: number;
  gstRate?: number;
  incomeTaxRate?: number;
  holdingTaxRate?: number;
  ibftCharge?: number;
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
  fafRate?: number;
  gstRate?: number;
  incomeTaxRate?: number;
  holdingTaxRate?: number;
  ibftCharge?: number;
  weightTiers: WeightTier[];
  zones: ZoneRates[];
}

export interface TPLPartnerItem {
  id: number | string;
  name: string;
  provider_code: string;
  status?: string;
  is_preferred?: boolean;
}

export const is2PLZone = (zoneName: string): boolean => {
  const lower = (zoneName || '').toLowerCase().trim();
  return (
    lower.includes('within city') || 
    lower.includes('same city') || 
    lower.includes('local') || 
    lower === '2pl' ||
    lower.includes('hub city')
  );
};

export const is3PLPlan = (p?: DynamicTariffPlan | null): boolean => {
  if (!p) return false;
  return (
    p.plan_type === '3pl' ||
    (p.name || '').toLowerCase().includes('3pl') ||
    (p.name || '').toLowerCase().includes('outsource') ||
    (p.name || '').toLowerCase().includes('partner card')
  );
};

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
  plan_type: 'shipper',
  cashHandlingType: 'percentage',
  cashHandlingValue: 1.5,
  cashHandlingMinFee: 30,
  fafRate: 20.0,
  gstRate: 15.0,
  incomeTaxRate: 2.0,
  holdingTaxRate: 2.0,
  ibftCharge: 100.0,
  weightTiers: DEFAULT_WEIGHT_TIERS,
  zones: DEFAULT_ZONES,
  shippers: []
};

const ZONE_METADATA: Record<string, { subtitle: string; exampleCities: string }> = {
  'Within City': { subtitle: 'Local 2PL Hub', exampleCities: 'Direct self-delivery fleet within originating city' },
  'Zone A': { subtitle: 'Major Metros', exampleCities: 'Karachi, Lahore, Islamabad, Rawalpindi' },
  'Zone B': { subtitle: 'Regional Hubs', exampleCities: 'Faisalabad, Multan, Peshawar, Gujranwala, Sialkot, Hyderabad' },
  'Zone C': { subtitle: 'Secondary Cities', exampleCities: 'Quetta, Sukkur, Bahawalpur, Sargodha, Abbottabad, Mardan' },
  'Zone D': { subtitle: 'Remote & Extended', exampleCities: 'Gwadar, Gilgit, Skardu, Turbat, Muzaffarabad, Mirpur (AJK)' }
};

export default function TariffPlansPage() {
  const { user, activeBusinessId } = useAuth();
  const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : 2);

  // Top Filter: 'shipper' | '3pl'
  const [planFilter, setPlanFilter] = React.useState<'shipper' | '3pl'>('shipper');

  const [plans, setPlans] = React.useState<DynamicTariffPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = React.useState<number>(1);
  const [shippersList, setShippersList] = React.useState<any[]>([]);
  const [selectedShipperFilter, setSelectedShipperFilter] = React.useState<number | 'all'>('all');
  const [shipperAssignPlanId, setShipperAssignPlanId] = React.useState<number>(1);
  const [isAssigningPlan, setIsAssigningPlan] = React.useState(false);

  // 3PL Partners state (strictly configured in DB) & Zone assignments
  const [tplPartners, setTplPartners] = React.useState<TPLPartnerItem[]>([]);
  const [selectedTplPartnerFilter, setSelectedTplPartnerFilter] = React.useState<string | number | 'all'>('all');
  const [zone3plAssignments, setZone3plAssignments] = React.useState<Record<string, { partnerId: number | string; partnerName: string; providerCode?: string }>>({});

  // Toast / notification
  const [notification, setNotification] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Custom Plan Modal state for filtered shipper
  const [isCustomPlanModalOpen, setIsCustomPlanModalOpen] = React.useState(false);
  const [customPlanDraft, setCustomPlanDraft] = React.useState<CustomPlanData>({
    name: '',
    cashHandlingType: 'percentage',
    cashHandlingValue: 1.5,
    cashHandlingMinFee: 30,
    rtoChargeValue: 50,
    fafRate: 20.0,
    gstRate: 15.0,
    incomeTaxRate: 2.0,
    holdingTaxRate: 2.0,
    ibftCharge: 100.0,
    weightTiers: JSON.parse(JSON.stringify(DEFAULT_WEIGHT_TIERS)),
    zones: JSON.parse(JSON.stringify(DEFAULT_ZONES)),
  });
  const [isSavingCustomPlan, setIsSavingCustomPlan] = React.useState(false);

  // Modal states for Create/Edit Plan
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<DynamicTariffPlan | null>(null);

  // Form states for Modal
  const [formName, setFormName] = React.useState('');
  const [formPlanType, setFormPlanType] = React.useState<'shipper' | '3pl'>('shipper');
  const [formCashHandlingType, setFormCashHandlingType] = React.useState<'percentage' | 'fixed'>('percentage');
  const [formCashHandlingValue, setFormCashHandlingValue] = React.useState<number>(1.5);
  const [formCashHandlingMinFee, setFormCashHandlingMinFee] = React.useState<number>(30);
  const [formFafRate, setFormFafRate] = React.useState<number>(20.0);
  const [formGstRate, setFormGstRate] = React.useState<number>(15.0);
  const [formIncomeTaxRate, setFormIncomeTaxRate] = React.useState<number>(2.0);
  const [formHoldingTaxRate, setFormHoldingTaxRate] = React.useState<number>(2.0);
  const [formIbftCharge, setFormIbftCharge] = React.useState<number>(100.0);
  const [formWeightTiers, setFormWeightTiers] = React.useState<WeightTier[]>(DEFAULT_WEIGHT_TIERS);
  const [formZones, setFormZones] = React.useState<ZoneRates[]>(DEFAULT_ZONES);
  const [selectedShipperIds, setSelectedShipperIds] = React.useState<number[]>([]);

  const isShipper = Array.isArray(user?.shipper) ? user.shipper.length > 0 : !!user?.shipper;

  // Fetch plans, shippers, and strictly configured 3PL partners
  const fetchMetadata = async () => {
    try {
      const [shippersRes, plansRes, tplRes] = await Promise.all([
        apiClient.get('/shippers/with-plans').catch(() => apiClient.get('/shippers?populate=*')).catch(() => null),
        apiClient.get('/shipper-plan/list').catch(() => apiClient.get('/shipper-plans')).catch(() => null),
        apiClient.get('/tpl-partner/list', { params: { tenant: tenantId } }).catch(() => null),
      ]);

      if (shippersRes?.data?.data) {
        setShippersList(shippersRes.data.data);
      }

      // Map ONLY 3PL partners that are actually configured in database
      const dbPartners: TPLPartnerItem[] = (tplRes?.data?.data || [])
        .map((item: any) => ({
          id: item.id,
          name: item.attributes?.name || item.name || '3PL Partner',
          provider_code: item.attributes?.provider_code || item.provider_code || 'trax',
          status: item.attributes?.status || item.status || 'active',
          is_preferred: item.attributes?.is_preferred ?? item.is_preferred ?? false
        }))
        .filter((p: TPLPartnerItem) => p.status === 'active' || !p.status);

      setTplPartners(dbPartners);

      // Load saved zone assignments from localStorage (strictly validate against configured partners)
      if (typeof window !== 'undefined' && tenantId) {
        const saved = localStorage.getItem(`zone_3pl_assignments_${tenantId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const validAssignments: Record<string, any> = {};
            Object.entries(parsed).forEach(([zone, val]: [string, any]) => {
              if (dbPartners.some(p => String(p.id) === String(val?.partnerId))) {
                validAssignments[zone] = val;
              }
            });
            setZone3plAssignments(validAssignments);
            localStorage.setItem(`zone_3pl_assignments_${tenantId}`, JSON.stringify(validAssignments));
          } catch (e) {
            console.warn('Failed to parse zone_3pl_assignments:', e);
          }
        }
      }

      // Map Loaded Plans
      if (plansRes?.data?.data && plansRes.data.data.length > 0) {
        const loadedPlans: DynamicTariffPlan[] = plansRes.data.data.map((item: any) => {
          const rawZones = item.zones?.length > 0 ? item.zones : DEFAULT_ZONES;
          const detectedType = item.plan_type || ((item.name || '').toLowerCase().includes('3pl') ? '3pl' : 'shipper');
          return {
            id: item.id,
            name: item.name || 'Custom Tariff Plan',
            plan_type: detectedType,
            cashHandlingType: item.cash_handling_type || 'percentage',
            cashHandlingValue: Number(item.cash_handling_value) || 1.5,
            cashHandlingMinFee: Number(item.cash_handling_min_fee) || 30,
            fafRate: item.faf_rate !== undefined && item.faf_rate !== null ? Number(item.faf_rate) : 20.0,
            gstRate: item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : 15.0,
            incomeTaxRate: item.income_tax_rate !== undefined && item.income_tax_rate !== null ? Number(item.income_tax_rate) : 2.0,
            holdingTaxRate: item.holding_tax_rate !== undefined && item.holding_tax_rate !== null ? Number(item.holding_tax_rate) : 2.0,
            ibftCharge: item.ibft_charge !== undefined && item.ibft_charge !== null ? Number(item.ibft_charge) : 100.0,
            weightTiers: item.weight_tiers?.length > 0 ? item.weight_tiers : DEFAULT_WEIGHT_TIERS,
            zones: rawZones,
            shippers: (item.shippers || []).map((s: any) => ({
              id: s.id,
              name: s.name || `Shipper #${s.id}`,
            })),
          };
        });
        setPlans(loadedPlans);
        const firstStd = loadedPlans.find(p => !p.name?.trim().toLowerCase().includes('custom')) || loadedPlans[0];
        if (firstStd) {
          setSelectedPlanId(firstStd.id);
        }
      } else {
        setPlans([DEFAULT_STANDARD_PLAN]);
        setSelectedPlanId(DEFAULT_STANDARD_PLAN.id);
      }
    } catch (err) {
      console.error('Failed to fetch tariff metadata from database:', err);
      setPlans([DEFAULT_STANDARD_PLAN]);
    }
  };

  React.useEffect(() => {
    fetchMetadata();
  }, []);

  // Check if a plan is a custom plan for a shipper
  const isCustomPlan = React.useCallback((p?: DynamicTariffPlan | null) => {
    if (!p) return false;
    return p.name?.trim().toLowerCase().includes('custom');
  }, []);

  // Shipper Plans
  const shipperPlans = React.useMemo(() => {
    const list = plans.filter(p => !is3PLPlan(p));
    return list.length > 0 ? list : [DEFAULT_STANDARD_PLAN];
  }, [plans]);

  // 3PL Partner Plans: ONLY for configured 3PL partners
  const tplPlans = React.useMemo(() => {
    // If no 3PL partners are configured, no 3PL plans can be active
    if (tplPartners.length === 0) return [];

    const db3plPlans = plans.filter(p => is3PLPlan(p));

    // If no 3PL plans exist in DB, generate standard rate cards ONLY for configured 3PL partners
    const baseList: DynamicTariffPlan[] = db3plPlans.length > 0 
      ? db3plPlans 
      : tplPartners.map((partner, idx) => ({
          id: 9000 + idx + 1,
          name: `${partner.name} Rate Card`,
          plan_type: '3pl' as const,
          tpl_partner_id: partner.id,
          tpl_partner_name: partner.name,
          cashHandlingType: 'percentage' as const,
          cashHandlingValue: 2.0,
          cashHandlingMinFee: 35,
          fafRate: 22.0,
          gstRate: 15.0,
          incomeTaxRate: 2.0,
          holdingTaxRate: 2.0,
          ibftCharge: 120.0,
          weightTiers: DEFAULT_WEIGHT_TIERS,
          zones: DEFAULT_ZONES.filter(z => !is2PLZone(z.zoneName)),
          shippers: []
        }));

    // If filtered by specific configured 3PL partner
    if (selectedTplPartnerFilter !== 'all') {
      const partner = tplPartners.find(p => String(p.id) === String(selectedTplPartnerFilter));
      if (partner) {
        const filtered = baseList.filter(p => 
          String(p.tpl_partner_id) === String(partner.id) || 
          (p.name || '').toLowerCase().includes(partner.name.toLowerCase()) ||
          (p.name || '').toLowerCase().includes(partner.provider_code.toLowerCase())
        );
        if (filtered.length > 0) return filtered;
        return [{
          id: 9100 + Number(partner.id || 1),
          name: `${partner.name} Tariff Plan`,
          plan_type: '3pl' as const,
          tpl_partner_id: partner.id,
          tpl_partner_name: partner.name,
          cashHandlingType: 'percentage' as const,
          cashHandlingValue: 2.0,
          cashHandlingMinFee: 35,
          fafRate: 22.0,
          gstRate: 15.0,
          incomeTaxRate: 2.0,
          holdingTaxRate: 2.0,
          ibftCharge: 120.0,
          weightTiers: DEFAULT_WEIGHT_TIERS,
          zones: DEFAULT_ZONES.filter(z => !is2PLZone(z.zoneName)),
          shippers: []
        }];
      }
    }

    return baseList;
  }, [plans, tplPartners, selectedTplPartnerFilter]);

  // Standard/commercial plans available for selection in current mode
  const currentCategoryPlans = React.useMemo(() => {
    return planFilter === '3pl' ? tplPlans : shipperPlans;
  }, [planFilter, tplPlans, shipperPlans]);

  const standardPlans = React.useMemo(() => {
    return currentCategoryPlans.filter(p => !isCustomPlan(p));
  }, [currentCategoryPlans, isCustomPlan]);

  // Active Plan based on selection and filter
  const activePlan = React.useMemo(() => {
    if (isShipper) {
      if (activeBusinessId) {
        const assigned = plans.find(p => p.shippers.some(s => s.id === activeBusinessId));
        if (assigned) return assigned;
      }
      return standardPlans[0] || plans[0] || DEFAULT_STANDARD_PLAN;
    }

    if (planFilter === '3pl') {
      if (tplPlans.length === 0) return null;
      const found = tplPlans.find(p => p.id === selectedPlanId);
      return found || tplPlans[0] || null;
    }

    // Shipper mode
    if (selectedShipperFilter === 'all') {
      const found = standardPlans.find(p => p.id === selectedPlanId);
      return found || standardPlans[0] || shipperPlans[0] || DEFAULT_STANDARD_PLAN;
    }
    return plans.find(p => p.id === selectedPlanId) || standardPlans[0] || shipperPlans[0] || DEFAULT_STANDARD_PLAN;
  }, [plans, isShipper, activeBusinessId, planFilter, tplPlans, selectedPlanId, selectedShipperFilter, standardPlans, shipperPlans]);

  // Visible plan tabs in current mode
  const visibleTabs = React.useMemo(() => {
    if (isShipper) {
      if (activePlan) return [activePlan];
      return standardPlans;
    }

    if (planFilter === '3pl') {
      return tplPlans;
    }

    // Shipper mode
    if (selectedShipperFilter === 'all') {
      return standardPlans;
    }

    const currentShipper = shippersList.find(s => s.id === selectedShipperFilter);
    const shipperPlanId = currentShipper?.shipper_plan?.id 
      || (typeof currentShipper?.shipper_plan === 'number' ? currentShipper.shipper_plan : null);

    const customPlanForShipper = plans.find(p => 
      isCustomPlan(p) && 
      ((shipperPlanId && p.id === shipperPlanId) || p.shippers?.some(s => s.id === selectedShipperFilter))
    );

    if (customPlanForShipper) {
      return [...standardPlans, customPlanForShipper];
    }

    return standardPlans;
  }, [isShipper, activePlan, planFilter, tplPlans, selectedShipperFilter, standardPlans, shippersList, plans, isCustomPlan]);

  // Zones displayed in current mode:
  // For Shipper: ALL zones show (including Within City 2PL area)
  // For 3PL: 2PL areas (Within City) are NOT shown
  const displayedZones = React.useMemo(() => {
    const zones = activePlan?.zones || DEFAULT_ZONES;
    if (planFilter === '3pl') {
      return zones.filter(z => !is2PLZone(z.zoneName));
    }
    return zones;
  }, [activePlan, planFilter]);

  // Handle assigning a complete zone to a configured 3PL service
  const handleAssignZoneTo3PL = async (zoneName: string, partnerId: string | number) => {
    if (!partnerId) {
      const copy = { ...zone3plAssignments };
      delete copy[zoneName];
      setZone3plAssignments(copy);
      if (tenantId) {
        localStorage.setItem(`zone_3pl_assignments_${tenantId}`, JSON.stringify(copy));
      }
      showNotification(`Assignment cleared for "${zoneName}".`, 'success');
      return;
    }

    const matchedPartner = tplPartners.find(p => String(p.id) === String(partnerId));
    if (!matchedPartner) {
      alert('Selected 3PL service is not a configured partner.');
      return;
    }

    const partnerName = matchedPartner.name;
    const providerCode = matchedPartner.provider_code || '3pl';

    const updated = {
      ...zone3plAssignments,
      [zoneName]: {
        partnerId,
        partnerName,
        providerCode,
      }
    };
    setZone3plAssignments(updated);

    if (tenantId) {
      localStorage.setItem(`zone_3pl_assignments_${tenantId}`, JSON.stringify(updated));
    }

    // Persist to backend region-coverage-rules
    try {
      await apiClient.post('/region-coverage-rules', {
        data: {
          tenant: tenantId,
          coverage_type: '3PL',
          preferred_tpl_partner: partnerId,
        }
      }).catch(() => null);
    } catch (e) {
      // Local storage fallback
    }

    showNotification(`Complete "${zoneName}" successfully assigned to configured partner ${partnerName}!`, 'success');
  };

  // Batch assign all 3PL zones to a single configured partner
  const handleBatchAssignAll3PLZones = (partnerId: string | number) => {
    const matchedPartner = tplPartners.find(p => String(p.id) === String(partnerId));
    if (!matchedPartner) return;

    const updated = { ...zone3plAssignments };
    displayedZones.forEach(z => {
      updated[z.zoneName] = {
        partnerId,
        partnerName: matchedPartner.name,
        providerCode: matchedPartner.provider_code || '3pl'
      };
    });

    setZone3plAssignments(updated);
    if (tenantId) {
      localStorage.setItem(`zone_3pl_assignments_${tenantId}`, JSON.stringify(updated));
    }
    showNotification(`All 3PL zones successfully assigned to ${matchedPartner.name}!`, 'success');
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    if (planFilter === '3pl' && tplPartners.length === 0) {
      alert('Please configure at least one 3PL Partner in 3PL Setup before creating 3PL partner plans.');
      return;
    }
    setEditingPlan(null);
    setFormName(planFilter === '3pl' ? `${tplPartners[0]?.name || '3PL'} Rate Card` : '');
    setFormPlanType(planFilter);
    setFormCashHandlingType('percentage');
    setFormCashHandlingValue(planFilter === '3pl' ? 2.0 : 1.5);
    setFormCashHandlingMinFee(planFilter === '3pl' ? 35 : 30);
    setFormFafRate(20.0);
    setFormGstRate(15.0);
    setFormIncomeTaxRate(2.0);
    setFormHoldingTaxRate(2.0);
    setFormIbftCharge(100.0);
    setFormWeightTiers(JSON.parse(JSON.stringify(DEFAULT_WEIGHT_TIERS)));
    
    // In 3PL mode, filter out 2PL zones
    const initialZones = planFilter === '3pl' 
      ? DEFAULT_ZONES.filter(z => !is2PLZone(z.zoneName))
      : DEFAULT_ZONES;
    setFormZones(JSON.parse(JSON.stringify(initialZones)));
    setSelectedShipperIds([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan: DynamicTariffPlan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormPlanType(plan.plan_type || (is3PLPlan(plan) ? '3pl' : 'shipper'));
    setFormCashHandlingType(plan.cashHandlingType);
    setFormCashHandlingValue(plan.cashHandlingValue);
    setFormCashHandlingMinFee(plan.cashHandlingMinFee || 0);
    setFormFafRate(plan.fafRate ?? 20.0);
    setFormGstRate(plan.gstRate ?? 15.0);
    setFormIncomeTaxRate(plan.incomeTaxRate ?? 2.0);
    setFormHoldingTaxRate(plan.holdingTaxRate ?? 2.0);
    setFormIbftCharge(plan.ibftCharge ?? 100.0);
    setFormWeightTiers(JSON.parse(JSON.stringify(plan.weightTiers)));

    const zonesToEdit = (plan.plan_type === '3pl' || is3PLPlan(plan))
      ? plan.zones.filter(z => !is2PLZone(z.zoneName))
      : plan.zones;
    setFormZones(JSON.parse(JSON.stringify(zonesToEdit)));
    setSelectedShipperIds(plan.shippers.map(s => s.id));
    setIsModalOpen(true);
  };

  // Add a new dynamic weight tier row
  const handleAddWeightTier = () => {
    const nextTierNum = formWeightTiers.length + 1;
    const newTierId = `tier_custom_${Date.now()}`;
    const newTierLabel = `Custom Tier ${nextTierNum}`;
    
    setFormWeightTiers(prev => [...prev, { id: newTierId, label: newTierLabel }]);
    
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

  // Update rate for specific zone and tier in modal
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
        plan_type: formPlanType,
        cash_handling_type: formCashHandlingType,
        cash_handling_value: Number(formCashHandlingValue),
        cash_handling_min_fee: Number(formCashHandlingMinFee),
        faf_rate: Number(formFafRate),
        gst_rate: Number(formGstRate),
        income_tax_rate: Number(formIncomeTaxRate),
        holding_tax_rate: Number(formHoldingTaxRate),
        ibft_charge: Number(formIbftCharge),
        weight_tiers: formWeightTiers,
        zones: formZones,
        shippers: formPlanType === 'shipper' ? selectedShipperIds : [],
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
              plan_type: formPlanType,
              cashHandlingType: formCashHandlingType,
              cashHandlingValue: Number(formCashHandlingValue),
              cashHandlingMinFee: Number(formCashHandlingMinFee),
              fafRate: Number(formFafRate),
              gstRate: Number(formGstRate),
              incomeTaxRate: Number(formIncomeTaxRate),
              holdingTaxRate: Number(formHoldingTaxRate),
              ibftCharge: Number(formIbftCharge),
              weightTiers: formWeightTiers,
              zones: formZones,
              shippers: formPlanType === 'shipper' ? assignedShippers : []
            };
          }
          return p;
        });
        setPlans(updated);
        showNotification(`Plan "${formName}" updated successfully!`, 'success');
      } else {
        const createRes = await apiClient.post('/shipper-plans', payload).catch(() => null);
        const newPlan: DynamicTariffPlan = {
          id: createRes?.data?.data?.id || Date.now(),
          name: formName,
          plan_type: formPlanType,
          cashHandlingType: formCashHandlingType,
          cashHandlingValue: Number(formCashHandlingValue),
          cashHandlingMinFee: Number(formCashHandlingMinFee),
          fafRate: Number(formFafRate),
          gstRate: Number(formGstRate),
          incomeTaxRate: Number(formIncomeTaxRate),
          holdingTaxRate: Number(formHoldingTaxRate),
          ibftCharge: Number(formIbftCharge),
          weightTiers: formWeightTiers,
          zones: formZones,
          shippers: formPlanType === 'shipper' ? assignedShippers : []
        };
        setPlans(prev => [...prev, newPlan]);
        setSelectedPlanId(newPlan.id);
        showNotification(`New ${formPlanType === '3pl' ? '3PL Partner' : 'Shipper'} plan "${formName}" created!`, 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.warn('Plan save notice:', err);
      setIsModalOpen(false);
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (plans.length <= 1) {
      alert('You must have at least one tariff plan in the system.');
      return;
    }
    const targetPlan = plans.find(p => p.id === id);
    const isCustom = isCustomPlan(targetPlan);

    if (confirm(`Are you sure you want to delete this ${targetPlan?.name || 'tariff plan'}?`)) {
      try {
        await apiClient.delete(`/shipper-plans/${id}`).catch(() => null);
      } catch (e) {
        console.warn('Delete plan request notice:', e);
      }
      const filtered = plans.filter(p => p.id !== id);
      setPlans(filtered);
      
      const fallback = filtered.find(p => planFilter === '3pl' ? is3PLPlan(p) : !isCustomPlan(p)) || filtered[0];

      if (isCustom && selectedShipperFilter !== 'all') {
        const shipper = shippersList.find(s => s.id === selectedShipperFilter);
        if (shipper && fallback) {
          apiClient.put(`/shippers/${shipper.id}/assign-plan`, { shipper_plan: fallback.id }).catch(() => null);
          setShippersList(prev => prev.map(s => s.id === shipper.id ? { ...s, shipper_plan: fallback } : s));
          setShipperAssignPlanId(fallback.id);
        }
      }
      if (fallback) {
        setSelectedPlanId(fallback.id);
      }
      showNotification('Plan deleted successfully.', 'success');
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
      
      setShippersList(prev => prev.map(s => {
        if (s.id === shipper.id) {
          return {
            ...s,
            shipper_plan: matchedPlan || { id: shipperAssignPlanId, name: `Plan #${shipperAssignPlanId}` }
          };
        }
        return s;
      }));

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
      showNotification(`Successfully updated Tariff Plan to "${matchedPlan?.name}" for "${shipper.name || 'Shipper'}"!`, 'success');
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
    const shipperPlanId = shipper?.shipper_plan?.id || (typeof shipper?.shipper_plan === 'number' ? shipper.shipper_plan : null);

    const existingCustom = plans.find(p => 
      isCustomPlan(p) && 
      ((shipperPlanId && p.id === shipperPlanId) || p.shippers?.some(s => s.id === shipper?.id))
    );
    
    const basePlan = existingCustom || activePlan || standardPlans[0] || plans[0] || DEFAULT_STANDARD_PLAN;
    
    setCustomPlanDraft({
      name: 'Custom Plan',
      cashHandlingType: basePlan.cashHandlingType || 'percentage',
      cashHandlingValue: basePlan.cashHandlingValue || 1.5,
      cashHandlingMinFee: basePlan.cashHandlingMinFee || 30,
      rtoChargeValue: basePlan.zones?.[0]?.returnCharges ?? 50,
      fafRate: basePlan.fafRate ?? 20.0,
      gstRate: basePlan.gstRate ?? 15.0,
      incomeTaxRate: basePlan.incomeTaxRate ?? 2.0,
      holdingTaxRate: basePlan.holdingTaxRate ?? 2.0,
      ibftCharge: basePlan.ibftCharge ?? 100.0,
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

    try {
      setIsSavingCustomPlan(true);

      const shipperPlanId = shipper?.shipper_plan?.id || (typeof shipper?.shipper_plan === 'number' ? shipper.shipper_plan : null);
      const existingCustom = plans.find(p => 
        isCustomPlan(p) && 
        ((shipperPlanId && p.id === shipperPlanId) || p.shippers?.some(s => s.id === shipper.id))
      );

      const payload = {
        data: {
          name: 'Custom Plan',
          plan_type: 'shipper',
          cash_handling_type: customPlanDraft.cashHandlingType,
          cash_handling_value: Number(customPlanDraft.cashHandlingValue),
          cash_handling_min_fee: Number(customPlanDraft.cashHandlingMinFee || 0),
          faf_rate: Number(customPlanDraft.fafRate ?? 20.0),
          gst_rate: Number(customPlanDraft.gstRate ?? 15.0),
          income_tax_rate: Number(customPlanDraft.incomeTaxRate ?? 2.0),
          holding_tax_rate: Number(customPlanDraft.holdingTaxRate ?? 2.0),
          ibft_charge: Number(customPlanDraft.ibftCharge ?? 100.0),
          weight_tiers: customPlanDraft.weightTiers,
          zones: customPlanDraft.zones,
          shippers: [shipper.id],
        }
      };

      let customPlanId: number;

      if (existingCustom) {
        await apiClient.put(`/shipper-plans/${existingCustom.id}`, payload);
        customPlanId = existingCustom.id;
      } else {
        const createRes = await apiClient.post('/shipper-plans', payload);
        customPlanId = createRes.data?.data?.id || Date.now();
      }

      await apiClient.put(`/shippers/${shipper.id}/assign-plan`, {
        shipper_plan: customPlanId
      });

      const updatedPlanObj: DynamicTariffPlan = {
        id: customPlanId,
        name: 'Custom Plan',
        plan_type: 'shipper',
        cashHandlingType: customPlanDraft.cashHandlingType,
        cashHandlingValue: Number(customPlanDraft.cashHandlingValue),
        cashHandlingMinFee: Number(customPlanDraft.cashHandlingMinFee || 0),
        fafRate: Number(customPlanDraft.fafRate ?? 20.0),
        gstRate: Number(customPlanDraft.gstRate ?? 15.0),
        incomeTaxRate: Number(customPlanDraft.incomeTaxRate ?? 2.0),
        holdingTaxRate: Number(customPlanDraft.holdingTaxRate ?? 2.0),
        ibftCharge: Number(customPlanDraft.ibftCharge ?? 100.0),
        weightTiers: customPlanDraft.weightTiers,
        zones: customPlanDraft.zones,
        shippers: [{ id: shipper.id, name: shipper.name || `Shipper #${shipper.id}` }]
      };

      setPlans(prev => [...prev.filter(p => p.id !== customPlanId), updatedPlanObj]);

      setShippersList(prev => prev.map(s => {
        if (s.id === shipper.id) {
          return {
            ...s,
            shipper_plan: updatedPlanObj
          };
        }
        return s;
      }));

      setSelectedPlanId(customPlanId);
      setShipperAssignPlanId(customPlanId);
      setIsCustomPlanModalOpen(false);

      showNotification(`Custom tariff plan for "${shipper.name || 'Shipper'}" saved and assigned!`, 'success');
    } catch (err: any) {
      console.error('Failed to create/update custom tariff plan for shipper:', err);
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save custom tariff plan for shipper.');
    } finally {
      setIsSavingCustomPlan(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-[1920px] w-full mx-auto p-lg pb-16">
        
        {/* Toast Alert */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              notification.type === 'success' 
                ? 'bg-slate-900 text-white border-slate-700' 
                : 'bg-red-600 text-white border-red-700'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{notification.text}</span>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1 uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Financials &amp; Rate Cards
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">Tariff &amp; Price Plans</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isShipper
                ? 'Your active rate card agreement table for weight tier ranges, regional zones, return charges, and cash handling fees.'
                : 'Manage dynamic tariff calculation cards for Shippers and configured 3PL Logistics Services with regional zone routing.'}
            </p>
          </div>

          {!isShipper && (
            <button
              onClick={handleOpenCreate}
              className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" /> {planFilter === '3pl' ? 'Create New 3PL Rate Plan' : 'Create New Tariff Plan'}
            </button>
          )}

          {isShipper && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
              <Building2 className="w-4 h-4 text-emerald-600" /> Active Shipper Agreement (Read-Only)
            </span>
          )}
        </div>

        {/* PRIMARY FILTER: SHIPPER TARIFF PLANS vs 3PL PARTNER PLANS */}
        {!isShipper && (
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setPlanFilter('shipper');
                  const firstShipperPlan = shipperPlans.find(p => !isCustomPlan(p)) || shipperPlans[0] || DEFAULT_STANDARD_PLAN;
                  setSelectedPlanId(firstShipperPlan.id);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  planFilter === 'shipper'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className={`w-4 h-4 ${planFilter === 'shipper' ? 'text-primary' : 'text-slate-500'}`} />
                <span>Shipper Tariff Plans</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  planFilter === 'shipper' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
                }`}>
                  {shipperPlans.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlanFilter('3pl');
                  const firstTplPlan = tplPlans[0];
                  if (firstTplPlan) {
                    setSelectedPlanId(firstTplPlan.id);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  planFilter === '3pl'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className={`w-4 h-4 ${planFilter === '3pl' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>3PL Partner Plans</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  planFilter === '3pl' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tplPartners.length} configured
                </span>
              </button>
            </div>

            {/* Mode Explanation Badge */}
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 pr-2">
              {planFilter === 'shipper' ? (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Showing <strong>All Zones</strong> (including 2PL Within City area) &amp; Shippers
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200/80">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block animate-pulse" />
                  <strong>3PL Outsourced Mode:</strong> Only configured 3PLs show &bull; 2PL areas excluded
                </span>
              )}
            </div>
          </div>
        )}

        {/* SHIPPER MODE: Shipper Filter & Fast Plan Assignment */}
        {planFilter === 'shipper' && !isShipper && (
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
                  if (val === 'all') {
                    const firstStd = standardPlans[0] || plans[0];
                    if (firstStd) {
                      setSelectedPlanId(firstStd.id);
                      setShipperAssignPlanId(firstStd.id);
                    }
                  } else {
                    const sh = shippersList.find(s => s.id === val);
                    const planId = sh?.shipper_plan?.id || (typeof sh?.shipper_plan === 'number' ? sh.shipper_plan : null);
                    const foundPlan = (planId && plans.find(p => p.id === planId)) || plans.find(p => p.shippers?.some(s => s.id === val));
                    if (foundPlan) {
                      setSelectedPlanId(foundPlan.id);
                      setShipperAssignPlanId(foundPlan.id);
                    } else {
                      const firstStd = standardPlans[0] || plans[0];
                      if (firstStd) {
                        setSelectedPlanId(firstStd.id);
                        setShipperAssignPlanId(firstStd.id);
                      }
                    }
                  }
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary w-full sm:w-72 cursor-pointer"
              >
                <option value="all">All Shippers (Global Tariff Overview)</option>
                {shippersList.map(sh => (
                  <option key={sh.id} value={sh.id}>
                    {sh.name || `Shipper #${sh.id}`} {sh.shipper_plan?.name ? `(${isCustomPlan(sh.shipper_plan) ? 'Custom Plan' : sh.shipper_plan.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedShipperFilter !== 'all' && (
              <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Change Assigned Plan:</span>
                <select
                  value={shipperAssignPlanId}
                  onChange={(e) => {
                    if (e.target.value === 'new_custom') {
                      handleOpenCustomPlanForFilteredShipper();
                      return;
                    }
                    const newPlanId = Number(e.target.value);
                    setShipperAssignPlanId(newPlanId);
                    setSelectedPlanId(newPlanId);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <optgroup label="Standard Commercial Plans">
                    {standardPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  {(() => {
                    const sh = shippersList.find(s => s.id === selectedShipperFilter);
                    const planId = sh?.shipper_plan?.id || (typeof sh?.shipper_plan === 'number' ? sh.shipper_plan : null);
                    const shCustom = plans.find(p => isCustomPlan(p) && ((planId && p.id === planId) || p.shippers?.some(s => s.id === selectedShipperFilter)));
                    if (shCustom) {
                      return (
                        <optgroup label="Custom Plan">
                          <option value={shCustom.id}>Custom Plan (Assigned)</option>
                        </optgroup>
                      );
                    }
                    return (
                      <optgroup label="Custom Plan">
                        <option value="new_custom" className="font-bold text-primary">
                          + Configure Custom Plan...
                        </option>
                      </optgroup>
                    );
                  })()}
                </select>
                <button
                  onClick={handleAssignPlanToShipper}
                  disabled={isAssigningPlan}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50 flex items-center gap-1"
                >
                  {isAssigningPlan ? 'Saving...' : 'Save Plan for Shipper'}
                </button>
                {(() => {
                  const sh = shippersList.find(s => s.id === selectedShipperFilter);
                  const planId = sh?.shipper_plan?.id || (typeof sh?.shipper_plan === 'number' ? sh.shipper_plan : null);
                  const shCustom = plans.find(p => isCustomPlan(p) && ((planId && p.id === planId) || p.shippers?.some(s => s.id === selectedShipperFilter)));
                  if (shCustom) {
                    return (
                      <button
                        type="button"
                        onClick={handleOpenCustomPlanForFilteredShipper}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Custom Rates
                      </button>
                    );
                  } else {
                    return (
                      <button
                        type="button"
                        onClick={handleOpenCustomPlanForFilteredShipper}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Custom Plan
                      </button>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {/* 3PL MODE: Configured 3PL Partner Filter */}
        {planFilter === '3pl' && !isShipper && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider shrink-0">
                <Truck className="w-4 h-4 text-indigo-600" />
                Filter by Configured 3PL:
              </div>
              <select
                value={selectedTplPartnerFilter}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : e.target.value;
                  setSelectedTplPartnerFilter(val);
                  if (val !== 'all') {
                    const matchedPartner = tplPartners.find(p => String(p.id) === String(val));
                    const partnerPlan = tplPlans.find(p => 
                      String(p.tpl_partner_id) === String(val) || 
                      (matchedPartner && (p.name || '').toLowerCase().includes(matchedPartner.name.toLowerCase()))
                    );
                    if (partnerPlan) {
                      setSelectedPlanId(partnerPlan.id);
                    }
                  }
                }}
                disabled={tplPartners.length === 0}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary w-full sm:w-80 cursor-pointer disabled:opacity-50"
              >
                {tplPartners.length === 0 ? (
                  <option value="all">No 3PL Partners Configured</option>
                ) : (
                  <>
                    <option value="all">All Configured 3PL Partners ({tplPartners.length})</option>
                    {tplPartners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.provider_code.toUpperCase()})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/administration/tpl-setup"
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" /> Manage 3PL Carrier Integrations
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
              </a>
            </div>
          </div>
        )}

        {/* 3PL MODE: Warning if no 3PL partners are configured */}
        {planFilter === '3pl' && tplPartners.length === 0 && !isShipper && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">No Configured 3PL Partners Found</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Only 3PL partners configured in the system are displayed. Please add your 3PL carrier credentials in <strong>Administration &gt; 3PL Partner Setup</strong> to assign delivery zones and activate 3PL rate cards.
                </p>
              </div>
            </div>
            <a
              href="/administration/tpl-setup"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Configure 3PL Carrier
            </a>
          </div>
        )}

        {/* 3PL MODE: DEDICATED COMPLETE ZONE ASSIGNMENT PANEL */}
        {planFilter === '3pl' && !isShipper && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl shadow-md border border-indigo-800/40 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-[11px] uppercase tracking-wider">
                  <Network className="w-4 h-4 text-indigo-400" /> 3PL Zone Routing &amp; Delegation Engine
                </div>
                <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                  Assign Complete Delivery Zones to Configured 3PL Services
                </h3>
                <p className="text-xs text-slate-300">
                  Courier Admin can assign a complete zone to any configured 3PL partner for automated dispatch &amp; rate card binding.
                </p>
              </div>

              {/* Batch Assign Bar */}
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 shrink-0">
                <span className="text-[11px] font-bold text-slate-200">Batch Assign All 3PL Zones:</span>
                <select
                  defaultValue=""
                  disabled={tplPartners.length === 0}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchAssignAll3PLZones(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{tplPartners.length === 0 ? '-- No 3PL Configured --' : '-- Choose Configured 3PL --'}</option>
                  {tplPartners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Zone Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {displayedZones.map((z) => {
                const assigned = zone3plAssignments[z.zoneName];
                const meta = ZONE_METADATA[z.zoneName] || { subtitle: 'Regional Zone', exampleCities: 'Nationwide cities' };
                const isAssigned = !!assigned?.partnerId;

                return (
                  <div 
                    key={z.zoneName} 
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isAssigned 
                        ? 'bg-indigo-900/40 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/20' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          {z.zoneName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          {meta.subtitle}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">
                        {meta.exampleCities}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <label className="text-[10px] font-bold text-indigo-200 block mb-1 uppercase tracking-wider">
                        Assigned 3PL Service:
                      </label>
                      <select
                        value={assigned?.partnerId || ''}
                        onChange={(e) => handleAssignZoneTo3PL(z.zoneName, e.target.value)}
                        disabled={tplPartners.length === 0}
                        className="w-full bg-slate-900 border border-indigo-400/40 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
                      >
                        <option value="">{tplPartners.length === 0 ? '-- No 3PL Configured --' : '-- Click to Assign 3PL --'}</option>
                        {tplPartners.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {isAssigned && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Routed to {assigned.partnerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin Plan Selector Tabs */}
        {!isShipper && (
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                {planFilter === '3pl' ? 'Select 3PL Rate Plan:' : 'Select Shipper Plan:'}
              </span>
              {visibleTabs.length === 0 && planFilter === '3pl' && (
                <span className="text-xs text-slate-400 italic px-2">No 3PL plans configured yet.</span>
              )}
              {visibleTabs.map((p) => {
                const isCustom = isCustomPlan(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlanId(p.id);
                      if (planFilter === 'shipper' && selectedShipperFilter !== 'all') {
                        setShipperAssignPlanId(p.id);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      selectedPlanId === p.id
                        ? isCustom
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : planFilter === '3pl'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isCustom && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    {planFilter === '3pl' && <Truck className="w-3.5 h-3.5 text-indigo-200" />}
                    {isCustom ? 'Custom Plan' : p.name}
                  </button>
                );
              })}
            </div>

            {activePlan && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isCustomPlan(activePlan)) {
                      handleOpenCustomPlanForFilteredShipper();
                    } else {
                      handleOpenEdit(activePlan);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5" /> {isCustomPlan(activePlan) ? 'Edit Custom Rates' : 'Edit Active Tariff'}
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

        {/* TARIFF & PRICE PLANS MATRIX SECTION */}
        {activePlan && (
          <div className="bg-slate-100/70 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
            
            {/* Tariff Matrix Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight underline underline-offset-8 decoration-slate-900">
                  {planFilter === '3pl' ? '3PL Partner Rate Card Matrix' : 'Tariff & Price Plans'}
                </h2>
                {isCustomPlan(activePlan) && (
                  <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" /> Custom Rates
                  </span>
                )}
                {planFilter === '3pl' && (
                  <span className="bg-indigo-100 text-indigo-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-300 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-indigo-700" /> 3PL Outsource (No 2PL Areas)
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 font-semibold flex items-center gap-2">
                <span className="font-bold text-slate-900">{isCustomPlan(activePlan) ? 'Custom Plan' : activePlan.name}</span>
                <span className="text-slate-400">&bull;</span>
                {planFilter === '3pl' ? (
                  <span className="text-indigo-700 font-bold">
                    {displayedZones.length} Outsourced Regional Zones Configured
                  </span>
                ) : isCustomPlan(activePlan) ? (
                  <span className="text-primary font-bold">
                    Exclusively Assigned to {activePlan.shippers?.[0]?.name || (selectedShipperFilter !== 'all' ? shippersList.find(s => s.id === selectedShipperFilter)?.name : 'Shipper')}
                  </span>
                ) : (
                  <span>{activePlan.shippers?.length || 0} Shipper Accounts Assigned</span>
                )}
              </div>
            </div>

            {/* Matrix Table Grid */}
            <div className="overflow-x-auto rounded-2xl shadow-sm">
              <div 
                className="min-w-[900px] grid gap-2 bg-slate-200 p-2 rounded-2xl"
                style={{ gridTemplateColumns: `repeat(${displayedZones.length + 1}, minmax(0, 1fr))` }}
              >
                
                {/* 1. Row Header Box */}
                <div className="bg-[#5c6b73] text-white p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="font-bold text-base leading-tight">Weight Charges</span>
                  <span className="text-[10px] text-slate-300 mt-1 uppercase font-semibold">Tier Ranges</span>
                </div>

                {/* 2 to N: Dynamic Zone Headers */}
                {displayedZones.map((z, idx) => {
                  const assigned = zone3plAssignments[z.zoneName];
                  const meta = ZONE_METADATA[z.zoneName];

                  return (
                    <div key={idx} className="bg-[#5c6b73] text-white p-4 rounded-xl flex flex-col items-center justify-between text-center shadow-sm gap-2">
                      <div>
                        <span className="font-bold text-base leading-tight block">{z.zoneName}</span>
                        {meta && (
                          <span className="text-[10px] text-slate-200 font-semibold block mt-0.5">
                            {meta.subtitle}
                          </span>
                        )}
                      </div>

                      {/* In 3PL mode, show quick 3PL partner assignment selector inside column header */}
                      {planFilter === '3pl' && !isShipper && (
                        <div className="w-full pt-1.5 border-t border-white/20">
                          <select
                            value={assigned?.partnerId || ''}
                            onChange={(e) => handleAssignZoneTo3PL(z.zoneName, e.target.value)}
                            disabled={tplPartners.length === 0}
                            className="w-full bg-slate-900/90 text-white text-[11px] font-bold rounded-lg px-2 py-1 border border-slate-400/40 focus:ring-1 focus:ring-amber-300 outline-none cursor-pointer disabled:opacity-50"
                            title="Assign this complete zone to a configured 3PL service"
                          >
                            <option value="">{tplPartners.length === 0 ? '-- No 3PL --' : '-- Assign 3PL --'}</option>
                            {tplPartners.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {assigned?.partnerName && (
                            <span className="text-[10px] text-emerald-300 font-extrabold flex items-center justify-center gap-1 mt-1 truncate">
                              <Check className="w-3 h-3" /> {assigned.partnerName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* DYNAMIC WEIGHT TIER ROWS */}
                {activePlan.weightTiers.map((tier) => (
                  <React.Fragment key={tier.id}>
                    <div className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs text-center">
                      {tier.label}
                    </div>
                    {displayedZones.map((z, idx) => (
                      <div key={idx} className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                        Rs. {z.tierRates?.[tier.id] ?? '-'}
                      </div>
                    ))}
                  </React.Fragment>
                ))}

                {/* ROW: Return Charges */}
                <div className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                  Return Charges
                </div>
                {displayedZones.map((z, idx) => (
                  <div key={idx} className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                    Rs. {z.returnCharges}
                  </div>
                ))}

                {/* ROW: Insurance */}
                <div className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                  Insurance
                </div>
                {displayedZones.map((z, idx) => (
                  <div key={idx} className="bg-[#0e4963] text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs">
                    {z.insurance || '-'}
                  </div>
                ))}

              </div>
            </div>

            {/* CASH HANDLING CHARGES BANNER */}
            <div className="bg-[#cba161] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 shadow-md border border-[#b88e4e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">Cash Handling Charges</h3>
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

            {/* FINANCIAL CHARGES, FUEL & TAX RULES BANNER */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Fuel Adj. Factor (FAF)</span>
                <span className="text-base font-extrabold text-slate-900 mt-1">{activePlan.fafRate ?? 20}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Applied on Base Freight</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Services Sales Tax (GST)</span>
                <span className="text-base font-extrabold text-slate-900 mt-1">{activePlan.gstRate ?? 15}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Applied on (Base + FAF)</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Income Tax (WHT)</span>
                <span className="text-base font-extrabold text-slate-900 mt-1">{activePlan.incomeTaxRate ?? 2}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Applied on COD Cash</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Holding Tax</span>
                <span className="text-base font-extrabold text-slate-900 mt-1">{activePlan.holdingTaxRate ?? 2}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Withholding on Payout</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">IBFT Charges</span>
                <span className="text-base font-extrabold text-slate-900 mt-1">Rs. {activePlan.ibftCharge ?? 100}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Bank Payout Fee</span>
              </div>
            </div>

            {/* Bottom Status Banner: Assigned Shippers (in Shipper mode) or 3PL Service Coverage (in 3PL mode) */}
            {planFilter === 'shipper' ? (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" /> Shipper Accounts Assigned to this Tariff Plan ({activePlan.shippers.length})
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {activePlan.shippers.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No specific shippers assigned (Global default commercial plan).</span>
                  ) : (
                    activePlan.shippers.map((s) => (
                      <span key={s.id} className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> {s.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-indigo-600" /> Active 3PL Service Routing Summary
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {displayedZones.map((z) => {
                    const assigned = zone3plAssignments[z.zoneName];
                    return (
                      <span 
                        key={z.zoneName} 
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                          assigned?.partnerName 
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{z.zoneName}:</span>
                        <strong className="text-slate-900">{assigned?.partnerName || 'Unassigned'}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* CREATE / EDIT TARIFF PLAN MODAL */}
        {isModalOpen && !isShipper && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
              
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingPlan ? `Edit ${editingPlan.name}` : `Create New ${formPlanType === '3pl' ? '3PL Partner' : 'Shipper'} Tariff Plan`}
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

              <form id="dynamic-tariff-form" onSubmit={handleSavePlan} className="p-6 overflow-y-auto flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Plan Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Corporate Standard Plan or TRAX Outsource Rate"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Plan Category</label>
                    <select
                      value={formPlanType}
                      onChange={(e) => {
                        const newType = e.target.value as 'shipper' | '3pl';
                        setFormPlanType(newType);
                        if (newType === '3pl') {
                          setFormZones(prev => prev.filter(z => !is2PLZone(z.zoneName)));
                        } else {
                          const hasWithinCity = formZones.some(z => is2PLZone(z.zoneName));
                          if (!hasWithinCity) {
                            setFormZones([DEFAULT_ZONES[0], ...formZones]);
                          }
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="shipper">Shipper Tariff Plan</option>
                      <option value="3pl">3PL Partner Rate Card</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cash Handling Type</label>
                    <select
                      value={formCashHandlingType}
                      onChange={(e) => setFormCashHandlingType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="percentage">Percentage (%) of COD</option>
                      <option value="fixed">Fixed Rupees (Rs.) per order</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Cash Handling Charge Value ({formCashHandlingType === 'percentage' ? '%' : 'Rs.'})
                    </label>
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

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Minimum Cash Handling Fee (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formCashHandlingMinFee}
                      onChange={(e) => setFormCashHandlingMinFee(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Taxes & Surcharges (FAF, GST, WHT, IBFT) */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-primary" /> Taxes, Fuel Surcharges &amp; Bank Transfer Fees
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">FAF Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formFafRate}
                        onChange={(e) => setFormFafRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">GST Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formGstRate}
                        onChange={(e) => setFormGstRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Income Tax (WHT %)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formIncomeTaxRate}
                        onChange={(e) => setFormIncomeTaxRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Holding Tax (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formHoldingTaxRate}
                        onChange={(e) => setFormHoldingTaxRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600">IBFT Fee (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        value={formIbftCharge}
                        onChange={(e) => setFormIbftCharge(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* DYNAMIC WEIGHT TIER RANGE MANAGER */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-primary" /> Weight Tier Range Manager
                      </h3>
                      <p className="text-[11px] text-slate-500">Configure weight break tiers applied across rates.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWeightTier}
                      className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Weight Tier Row
                    </button>
                  </div>

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
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Zone Rates Matrix {formPlanType === '3pl' ? '(Outsourced Regional Zones Only - 2PL Areas Excluded)' : '(All Regional Zones)'}
                    </h3>
                  </div>
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

                {/* Shipper Assignment (Only for Shipper Plans) */}
                {formPlanType === 'shipper' && (
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
                )}

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
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

              <form onSubmit={handleSaveCustomPlanForShipper} className="p-6 overflow-y-auto space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value="Custom Plan"
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl p-3 text-xs outline-none cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Custom plans are standardized as &quot;Custom Plan&quot; and applied specifically to {shippersList.find(s => s.id === selectedShipperFilter)?.name || 'this shipper'}.
                  </p>
                </div>

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

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">percent</span>
                    Taxes, Fuel Surcharges &amp; Bank Transfer Fees
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">FAF Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={customPlanDraft.fafRate ?? 20}
                        onChange={e => setCustomPlanDraft(prev => ({ ...prev, fafRate: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">GST Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={customPlanDraft.gstRate ?? 15}
                        onChange={e => setCustomPlanDraft(prev => ({ ...prev, gstRate: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Income Tax (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={customPlanDraft.incomeTaxRate ?? 2}
                        onChange={e => setCustomPlanDraft(prev => ({ ...prev, incomeTaxRate: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Holding Tax (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={customPlanDraft.holdingTaxRate ?? 2}
                        onChange={e => setCustomPlanDraft(prev => ({ ...prev, holdingTaxRate: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">IBFT Fee (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        value={customPlanDraft.ibftCharge ?? 100}
                        onChange={e => setCustomPlanDraft(prev => ({ ...prev, ibftCharge: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                      Regional Zone Rates &amp; Weight Tiers (PKR)
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

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 italic">
                    * Click Save &amp; Assign Custom Plan to create and assign this tariff plan immediately.
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
                          <Check className="w-4 h-4" /> Save &amp; Assign Custom Plan
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

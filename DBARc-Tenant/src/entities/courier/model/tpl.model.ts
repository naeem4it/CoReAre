export interface TPLPartner {
  id: string;
  name: string;
  logo: string;
  status: 'active' | 'inactive';
  integrationType: 'API' | 'Webhook' | 'Manual';
}

export interface CoverageRule {
  regionId: string;
  regionName: string;
  assignedPartnerId: string | null; // null means direct coverage
}

export interface RateBracket {
  minWeight: number;
  maxWeight: number;
  rate: number;
}

export interface RateMatrixRow {
  origin: string;
  destination: string;
  brackets: RateBracket[];
}

export const mockTPLPartners: TPLPartner[] = [
  { id: 'TPL-001', name: 'TCS Logistics', logo: 'T', status: 'active', integrationType: 'API' },
  { id: 'TPL-002', name: 'Leopards Courier', logo: 'L', status: 'active', integrationType: 'API' },
  { id: 'TPL-003', name: 'M&P Express', logo: 'M', status: 'active', integrationType: 'Webhook' },
  { id: 'TPL-004', name: 'Trax', logo: 'X', status: 'inactive', integrationType: 'Manual' },
];

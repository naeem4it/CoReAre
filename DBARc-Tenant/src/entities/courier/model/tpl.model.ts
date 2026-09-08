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


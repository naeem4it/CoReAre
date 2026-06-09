// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { Region } from './region.types';
import { TPLPartner } from './tpl-partner.types';

export interface RegionCoverageRule {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  region?: Region | null;
  coverage_type: string;
  preferred_tpl_partner?: TPLPartner | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRegionCoverageRuleRequest {
  tenant?: Tenant | null;
  region?: Region | null;
  coverage_type: string;
  preferred_tpl_partner?: TPLPartner | null;
}

export interface UpdateRegionCoverageRuleRequest extends Partial<CreateRegionCoverageRuleRequest> {}

export interface RegionCoverageRuleResponse {
  data: RegionCoverageRule;
  meta: RegionCoverageRuleMeta;
}

export interface RegionCoverageRuleCollectionResponse {
  data: RegionCoverageRule[];
  meta: RegionCoverageRuleMeta;
}

export interface RegionCoverageRuleFilters {
  [key: string]: any;
}

export interface RegionCoverageRuleQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RegionCoverageRuleFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RegionCoverageRulePathParams {
  id?: string | number;
  documentId?: string;
}

export interface RegionCoverageRulePagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RegionCoverageRuleMeta {
  pagination?: RegionCoverageRulePagination;
}

export interface RegionCoverageRuleError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

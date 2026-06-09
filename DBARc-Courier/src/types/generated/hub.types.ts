// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';

export interface Hub {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  name: string;
  hub_type?: string;
  address?: string;
  geo_location?: any;
  capacity_weight?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateHubRequest {
  tenant?: Tenant | null;
  name: string;
  hub_type?: string;
  address?: string;
  geo_location?: any;
  capacity_weight?: number;
  status?: string;
}

export interface UpdateHubRequest extends Partial<CreateHubRequest> {}

export interface HubResponse {
  data: Hub;
  meta: HubMeta;
}

export interface HubCollectionResponse {
  data: Hub[];
  meta: HubMeta;
}

export interface HubFilters {
  [key: string]: any;
}

export interface HubQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: HubFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface HubPathParams {
  id?: string | number;
  documentId?: string;
}

export interface HubPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface HubMeta {
  pagination?: HubPagination;
}

export interface HubError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

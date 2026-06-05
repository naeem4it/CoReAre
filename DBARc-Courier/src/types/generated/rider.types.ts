// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';

export interface Rider {
  id: number;
  documentId: string;
  name: string;
  phone: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
  tenant?: Tenant | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRiderRequest {
  name: string;
  phone: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
  tenant?: Tenant | null;
}

export interface UpdateRiderRequest extends Partial<CreateRiderRequest> {}

export interface RiderResponse {
  data: Rider;
  meta: RiderMeta;
}

export interface RiderCollectionResponse {
  data: Rider[];
  meta: RiderMeta;
}

export interface RiderFilters {
  [key: string]: any;
}

export interface RiderQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RiderFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RiderPathParams {
  id?: string | number;
  documentId?: string;
}

export interface RiderPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RiderMeta {
  pagination?: RiderPagination;
}

export interface RiderError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

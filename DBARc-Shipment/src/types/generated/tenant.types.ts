// Generated automatically from Strapi Schema. Do not edit manually.
import { User } from './user.types';
import { Parcel } from './parcel.types';
import { Rider } from './rider.types';

export interface Tenant {
  id: number;
  documentId: string;
  name: string;
  domain?: string;
  status?: 'active' | 'suspended' | 'pending';
  platform_commission_pct?: number;
  users?: User[];
  parcels?: Parcel[];
  riders?: Rider[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateTenantRequest {
  name: string;
  domain?: string;
  status?: 'active' | 'suspended' | 'pending';
  platform_commission_pct?: number;
  users?: User[];
  parcels?: Parcel[];
  riders?: Rider[];
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {}

export interface TenantResponse {
  data: Tenant;
  meta: TenantMeta;
}

export interface TenantCollectionResponse {
  data: Tenant[];
  meta: TenantMeta;
}

export interface TenantFilters {
  [key: string]: any;
}

export interface TenantQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: TenantFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface TenantPathParams {
  id?: string | number;
  documentId?: string;
}

export interface TenantPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface TenantMeta {
  pagination?: TenantPagination;
}

export interface TenantError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

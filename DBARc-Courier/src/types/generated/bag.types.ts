// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { Hub } from './hub.types';

export interface Bag {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  bag_number: string;
  from_hub?: Hub | null;
  to_hub?: Hub | null;
  parcel_count?: number;
  status?: string;
  sealed_at?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateBagRequest {
  tenant?: Tenant | null;
  bag_number: string;
  from_hub?: Hub | null;
  to_hub?: Hub | null;
  parcel_count?: number;
  status?: string;
  sealed_at?: string;
}

export interface UpdateBagRequest extends Partial<CreateBagRequest> {}

export interface BagResponse {
  data: Bag;
  meta: BagMeta;
}

export interface BagCollectionResponse {
  data: Bag[];
  meta: BagMeta;
}

export interface BagFilters {
  [key: string]: any;
}

export interface BagQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: BagFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface BagPathParams {
  id?: string | number;
  documentId?: string;
}

export interface BagPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface BagMeta {
  pagination?: BagPagination;
}

export interface BagError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

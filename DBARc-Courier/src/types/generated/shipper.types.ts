// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { Courier } from './courier.types';

export interface Shipper {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  courier?: Courier | null;
  name: string;
  business_type?: string;
  api_key?: string;
  webhook_url?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateShipperRequest {
  tenant?: Tenant | null;
  courier?: Courier | null;
  name: string;
  business_type?: string;
  api_key?: string;
  webhook_url?: string;
  status?: string;
}

export interface UpdateShipperRequest extends Partial<CreateShipperRequest> {}

export interface ShipperResponse {
  data: Shipper;
  meta: ShipperMeta;
}

export interface ShipperCollectionResponse {
  data: Shipper[];
  meta: ShipperMeta;
}

export interface ShipperFilters {
  [key: string]: any;
}

export interface ShipperQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ShipperFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ShipperPathParams {
  id?: string | number;
  documentId?: string;
}

export interface ShipperPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ShipperMeta {
  pagination?: ShipperPagination;
}

export interface ShipperError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

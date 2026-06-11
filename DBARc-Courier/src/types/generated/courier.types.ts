// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { Shipper } from './shipper.types';
import { CourierCity } from './courier-city.types';
import { Parcel } from './parcel.types';

export interface Courier {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  shippers?: Shipper[];
  name: string;
  contact_info?: any;
  api_enabled?: boolean;
  status?: string;
  courier_cities?: CourierCity[];
  parcel?: Parcel | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateCourierRequest {
  tenant?: Tenant | null;
  shippers?: Shipper[];
  name: string;
  contact_info?: any;
  api_enabled?: boolean;
  status?: string;
  courier_cities?: CourierCity[];
  parcel?: Parcel | null;
}

export interface UpdateCourierRequest extends Partial<CreateCourierRequest> {}

export interface CourierResponse {
  data: Courier;
  meta: CourierMeta;
}

export interface CourierCollectionResponse {
  data: Courier[];
  meta: CourierMeta;
}

export interface CourierFilters {
  [key: string]: any;
}

export interface CourierQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: CourierFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface CourierPathParams {
  id?: string | number;
  documentId?: string;
}

export interface CourierPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface CourierMeta {
  pagination?: CourierPagination;
}

export interface CourierError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

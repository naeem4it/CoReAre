// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { Shipper } from './shipper.types';

export interface PickupRequest {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  shipper?: Shipper | null;
  requested_date: string;
  time_slot_id?: string;
  parcel_count?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreatePickupRequestRequest {
  tenant?: Tenant | null;
  shipper?: Shipper | null;
  requested_date: string;
  time_slot_id?: string;
  parcel_count?: number;
  status?: string;
}

export interface UpdatePickupRequestRequest extends Partial<CreatePickupRequestRequest> {}

export interface PickupRequestResponse {
  data: PickupRequest;
  meta: PickupRequestMeta;
}

export interface PickupRequestCollectionResponse {
  data: PickupRequest[];
  meta: PickupRequestMeta;
}

export interface PickupRequestFilters {
  [key: string]: any;
}

export interface PickupRequestQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: PickupRequestFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface PickupRequestPathParams {
  id?: string | number;
  documentId?: string;
}

export interface PickupRequestPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface PickupRequestMeta {
  pagination?: PickupRequestPagination;
}

export interface PickupRequestError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

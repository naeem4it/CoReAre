// Generated automatically from Strapi Schema. Do not edit manually.
import { City } from './city.types';
import { Shipper } from './shipper.types';

export interface PickupLocation {
  id: number;
  documentId: string;
  location_name: string;
  address: string;
  phone?: string;
  email?: string;
  city?: City | null;
  shipper?: Shipper | null;
  status?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreatePickupLocationRequest {
  location_name: string;
  address: string;
  phone?: string;
  email?: string;
  city?: City | null;
  shipper?: Shipper | null;
  status?: boolean;
}

export interface UpdatePickupLocationRequest extends Partial<CreatePickupLocationRequest> {}

export interface PickupLocationResponse {
  data: PickupLocation;
  meta: PickupLocationMeta;
}

export interface PickupLocationCollectionResponse {
  data: PickupLocation[];
  meta: PickupLocationMeta;
}

export interface PickupLocationFilters {
  [key: string]: any;
}

export interface PickupLocationQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: PickupLocationFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface PickupLocationPathParams {
  id?: string | number;
  documentId?: string;
}

export interface PickupLocationPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface PickupLocationMeta {
  pagination?: PickupLocationPagination;
}

export interface PickupLocationError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

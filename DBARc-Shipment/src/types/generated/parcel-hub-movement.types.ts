// Generated automatically from Strapi Schema. Do not edit manually.
import { Parcel } from './parcel.types';
import { Hub } from './hub.types';
import { Bag } from './bag.types';
import { User } from './user.types';

export interface ParcelHubMovement {
  id: number;
  documentId: string;
  parcel?: Parcel | null;
  from_hub?: Hub | null;
  to_hub?: Hub | null;
  bag?: Bag | null;
  moved_by?: User | null;
  moved_at?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateParcelHubMovementRequest {
  parcel?: Parcel | null;
  from_hub?: Hub | null;
  to_hub?: Hub | null;
  bag?: Bag | null;
  moved_by?: User | null;
  moved_at?: string;
}

export interface UpdateParcelHubMovementRequest extends Partial<CreateParcelHubMovementRequest> {}

export interface ParcelHubMovementResponse {
  data: ParcelHubMovement;
  meta: ParcelHubMovementMeta;
}

export interface ParcelHubMovementCollectionResponse {
  data: ParcelHubMovement[];
  meta: ParcelHubMovementMeta;
}

export interface ParcelHubMovementFilters {
  [key: string]: any;
}

export interface ParcelHubMovementQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ParcelHubMovementFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ParcelHubMovementPathParams {
  id?: string | number;
  documentId?: string;
}

export interface ParcelHubMovementPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ParcelHubMovementMeta {
  pagination?: ParcelHubMovementPagination;
}

export interface ParcelHubMovementError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

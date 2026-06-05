// Generated automatically from Strapi Schema. Do not edit manually.
import { Rider } from './rider.types';

export interface RiderLocationHistory {
  id: number;
  documentId: string;
  rider?: Rider | null;
  location: any;
  recorded_at?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRiderLocationHistoryRequest {
  rider?: Rider | null;
  location: any;
  recorded_at?: string;
}

export interface UpdateRiderLocationHistoryRequest extends Partial<CreateRiderLocationHistoryRequest> {}

export interface RiderLocationHistoryResponse {
  data: RiderLocationHistory;
  meta: RiderLocationHistoryMeta;
}

export interface RiderLocationHistoryCollectionResponse {
  data: RiderLocationHistory[];
  meta: RiderLocationHistoryMeta;
}

export interface RiderLocationHistoryFilters {
  [key: string]: any;
}

export interface RiderLocationHistoryQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RiderLocationHistoryFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RiderLocationHistoryPathParams {
  id?: string | number;
  documentId?: string;
}

export interface RiderLocationHistoryPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RiderLocationHistoryMeta {
  pagination?: RiderLocationHistoryPagination;
}

export interface RiderLocationHistoryError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

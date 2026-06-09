// Generated automatically from Strapi Schema. Do not edit manually.
import { Parcel } from './parcel.types';

export interface Dispute {
  id: number;
  documentId: string;
  parcel?: Parcel | null;
  category: string;
  description?: string;
  status?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateDisputeRequest {
  parcel?: Parcel | null;
  category: string;
  description?: string;
  status?: string;
  resolution?: string;
}

export interface UpdateDisputeRequest extends Partial<CreateDisputeRequest> {}

export interface DisputeResponse {
  data: Dispute;
  meta: DisputeMeta;
}

export interface DisputeCollectionResponse {
  data: Dispute[];
  meta: DisputeMeta;
}

export interface DisputeFilters {
  [key: string]: any;
}

export interface DisputeQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: DisputeFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface DisputePathParams {
  id?: string | number;
  documentId?: string;
}

export interface DisputePagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface DisputeMeta {
  pagination?: DisputePagination;
}

export interface DisputeError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

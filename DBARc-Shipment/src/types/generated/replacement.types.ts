// Generated automatically from Strapi Schema. Do not edit manually.
import { Parcel } from './parcel.types';

export interface Replacement {
  id: number;
  documentId: string;
  parcel_detail?: string;
  collect_rs?: number;
  collect_replacement?: 'Yes' | 'No';
  orderid?: Parcel | null;
  replacementorderid?: Parcel | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateReplacementRequest {
  parcel_detail?: string;
  collect_rs?: number;
  collect_replacement?: 'Yes' | 'No';
  orderid?: Parcel | null;
  replacementorderid?: Parcel | null;
}

export interface UpdateReplacementRequest extends Partial<CreateReplacementRequest> {}

export interface ReplacementResponse {
  data: Replacement;
  meta: ReplacementMeta;
}

export interface ReplacementCollectionResponse {
  data: Replacement[];
  meta: ReplacementMeta;
}

export interface ReplacementFilters {
  [key: string]: any;
}

export interface ReplacementQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ReplacementFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ReplacementPathParams {
  id?: string | number;
  documentId?: string;
}

export interface ReplacementPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ReplacementMeta {
  pagination?: ReplacementPagination;
}

export interface ReplacementError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

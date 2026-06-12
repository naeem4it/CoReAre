// Generated automatically from Strapi Schema. Do not edit manually.
import { Hub } from './hub.types';
import { Parcel } from './parcel.types';

export interface LoadSheet {
  id: number;
  documentId: string;
  sheet_id: string;
  date_created: string;
  origin_hub?: Hub | null;
  status?: 'Pending' | 'Dispatched' | 'On-Route' | 'Delivered';
  parcels?: Parcel[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateLoadSheetRequest {
  sheet_id: string;
  date_created: string;
  origin_hub?: Hub | null;
  status?: 'Pending' | 'Dispatched' | 'On-Route' | 'Delivered';
  parcels?: Parcel[];
}

export interface UpdateLoadSheetRequest extends Partial<CreateLoadSheetRequest> {}

export interface LoadSheetResponse {
  data: LoadSheet;
  meta: LoadSheetMeta;
}

export interface LoadSheetCollectionResponse {
  data: LoadSheet[];
  meta: LoadSheetMeta;
}

export interface LoadSheetFilters {
  [key: string]: any;
}

export interface LoadSheetQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: LoadSheetFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface LoadSheetPathParams {
  id?: string | number;
  documentId?: string;
}

export interface LoadSheetPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface LoadSheetMeta {
  pagination?: LoadSheetPagination;
}

export interface LoadSheetError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
